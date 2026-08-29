import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LawyerHomeHubCardViewModel } from '../../hooks/lawyerHomeHubCard.types';
import { HomeHubPanelBody } from '../HomeHubPanelBody';

vi.mock('../HomeHubAlertsPanel', () => ({
    HomeHubAlertsPanel: () => <div data-testid="home-hub-panel-alerts" />,
}));
vi.mock('../HomeHubPinsPanel', () => ({
    HomeHubPinsPanel: () => <div data-testid="home-hub-panel-pins" />,
}));
vi.mock('../HomeHubAlertsLoadingSkeleton', () => ({
    HomeHubAlertsLoadingSkeleton: () => <div data-testid="home-hub-alerts-loading" />,
}));

function baseVm(hubPanel: LawyerHomeHubCardViewModel['hubPanel']): LawyerHomeHubCardViewModel {
    return {
        hubPanel,
        selectHubPanel: vi.fn(),
        hubFullyEmpty: false,
        hubHasItems: true,
        hubInitialPending: false,
        hubBootSettling: false,
        blockClasses: '',
        blockStyle: {},
        alertsTabCount: 1,
        alertsEmptyState: 'content',
        hasCarouselAlerts: false,
        hasAlerts: false,
        hubHorizonCounts: { urgent: 0, near: 0, upcoming: 0 },
        activeFilter: 'urgent',
        setActiveFilter: vi.fn(),
        carouselAlerts: [],
        sourceById: new Map(),
        radarUrgent: [],
        pinsAggregatorInput: {
            pinnedItems: [],
            lawsuitFiles: [],
            executionFiles: [],
            criminalCases: [],
            urgentCases: [],
            threadingTransactions: [],
            notes: [],
            fieldTasks: [],
        },
        pinsTabCount: 0,
        cardLayout: {
            mode: 'feed',
            activePanel: hubPanel,
            sectionMinHeightClass: '',
            bodyRegionClass: '',
        },
        containerBorderOn: true,
        guardedOpenEntity: vi.fn(),
        guardedNavigateRoute: vi.fn(),
        guardedUnpin: vi.fn(),
        guardedTogglePin: vi.fn(),
        isPinned: vi.fn(() => false),
        guardedDismissRadar: vi.fn(),
    };
}

describe('HomeHubPanelBody', () => {
    it('التنبيهات من أول render — التثبيت لا يُركَّب قبل أول فتح', async () => {
        render(<HomeHubPanelBody vm={baseVm('alerts')} />);

        expect(await screen.findByTestId('home-hub-panel-alerts')).toBeVisible();
        expect(screen.queryByTestId('home-hub-panel-pins')).not.toBeInTheDocument();
    });

    it('يُركّب لوحة التثبيت عند أول انتقال إلى pins ويبقى بعدها', async () => {
        const { rerender } = render(<HomeHubPanelBody vm={baseVm('alerts')} />);
        expect(await screen.findByTestId('home-hub-panel-alerts')).toBeVisible();
        expect(screen.queryByTestId('home-hub-panel-pins')).not.toBeInTheDocument();

        rerender(<HomeHubPanelBody vm={baseVm('pins')} />);

        expect(await screen.findByTestId('home-hub-panel-pins')).toBeVisible();
        expect(screen.getByTestId('home-hub-panel-alerts')).not.toBeVisible();

        rerender(<HomeHubPanelBody vm={baseVm('alerts')} />);
        expect(screen.getByTestId('home-hub-panel-pins')).not.toBeVisible();
        expect(screen.getByTestId('home-hub-panel-alerts')).toBeVisible();
    });

    it('يعرض رسالة الفراغ أثناء الانتظار بلا عناصر — لا مستطيل تحميل', () => {
        const vm = baseVm('alerts');
        vm.hubInitialPending = true;
        vm.hubHasItems = false;
        vm.hubFullyEmpty = false;
        vm.alertsTabCount = 0;

        render(<HomeHubPanelBody vm={vm} />);

        expect(screen.getByTestId('home-hub-fully-empty')).toBeInTheDocument();
        expect(screen.getByText('لا يوجد تنبيه أو تثبيت')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-alerts-loading')).not.toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-panel-alerts')).not.toBeInTheDocument();
    });

    it('يعرض هيكل تحميل التنبيهات أثناء hubInitialPending على تبويب التنبيهات', () => {
        const vm = baseVm('alerts');
        vm.hubInitialPending = true;

        render(<HomeHubPanelBody vm={vm} />);

        expect(screen.getByTestId('home-hub-alerts-loading')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-panel-alerts')).not.toBeInTheDocument();
    });

    it('يعرض رسالة الفراغ أثناء التسوية حتى مع عناصر مؤقتة', () => {
        const vm = baseVm('alerts');
        vm.hubBootSettling = true;
        vm.hubHasItems = true;

        render(<HomeHubPanelBody vm={vm} />);

        expect(screen.getByTestId('home-hub-fully-empty')).toBeInTheDocument();
        expect(screen.getByText('لا يوجد تنبيه أو تثبيت')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-boot-stable-body')).not.toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-panel-alerts')).not.toBeInTheDocument();
    });

    it('يعرض رسالة الفراغ النهائية أثناء الإقلاع الفارغ', () => {
        const vm = baseVm('alerts');
        vm.hubBootSettling = true;
        vm.hubHasItems = false;
        vm.hubFullyEmpty = true;
        vm.alertsTabCount = 0;

        render(<HomeHubPanelBody vm={vm} />);

        expect(screen.getByTestId('home-hub-fully-empty')).toBeInTheDocument();
        expect(screen.getByText('لا يوجد تنبيه أو تثبيت')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-boot-stable-body')).not.toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-panel-alerts')).not.toBeInTheDocument();
    });

    it('بعد الاستقرار الفارغ يركّب لوحة التنبيهات ولا يُركّب التثبيت', async () => {
        const vm = baseVm('alerts');
        vm.hubFullyEmpty = true;
        vm.hubHasItems = false;
        vm.alertsTabCount = 0;
        vm.pinsTabCount = 0;
        vm.alertsEmptyState = 'empty';

        render(<HomeHubPanelBody vm={vm} />);

        expect(await screen.findByTestId('home-hub-panel-alerts')).toBeVisible();
        expect(screen.queryByTestId('home-hub-panel-pins')).not.toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-alerts-loading')).not.toBeInTheDocument();
    });

    it('التبديل إلى التثبيت بعد الفراغ المستقر يُركّب اللوحة المخفية السابقة', async () => {
        const alertsVm = baseVm('alerts');
        alertsVm.hubFullyEmpty = true;
        alertsVm.hubHasItems = false;
        alertsVm.alertsTabCount = 0;
        alertsVm.pinsTabCount = 0;

        const { rerender } = render(<HomeHubPanelBody vm={alertsVm} />);
        expect(await screen.findByTestId('home-hub-panel-alerts')).toBeVisible();

        const pinsVm = baseVm('pins');
        pinsVm.hubFullyEmpty = true;
        pinsVm.hubHasItems = false;
        pinsVm.alertsTabCount = 0;
        pinsVm.pinsTabCount = 0;
        rerender(<HomeHubPanelBody vm={pinsVm} />);

        expect(await screen.findByTestId('home-hub-panel-pins')).toBeVisible();
        expect(screen.getByTestId('home-hub-panel-alerts')).not.toBeVisible();
        expect(screen.getByTestId('home-hub-pins-empty')).toHaveTextContent('لا يوجد تنبيه أو تثبيت');
        expect(screen.queryByTestId('home-hub-pins-loading')).not.toBeInTheDocument();
    });
});
