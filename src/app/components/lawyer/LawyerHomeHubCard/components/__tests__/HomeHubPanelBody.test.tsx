import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LawyerHomeHubCardViewModel } from '../hooks/useLawyerHomeHubCard';
import { HomeHubPanelBody } from '../HomeHubPanelBody';

vi.mock('../HomeHubAlertsPanel', () => ({
    HomeHubAlertsPanel: () => <div data-testid="home-hub-panel-alerts" />,
}));
vi.mock('../HomeHubSecretaryPanel', () => ({
    HomeHubSecretaryPanel: () => <div data-testid="home-hub-panel-secretary" />,
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
        hubInitialPending: false,
        blockClasses: '',
        blockStyle: {},
        showSheen: false,
        alertsTabCount: 1,
        secretaryTabCount: 0,
        alertsEmptyState: 'content',
        alertsError: null,
        hasCarouselAlerts: false,
        hasAlerts: false,
        hasUrgentRadar: false,
        horizonCounts: { urgent: 0, near: 0, upcoming: 0 },
        hubHorizonCounts: { urgent: 0, near: 0, upcoming: 0 },
        activeFilter: 'urgent',
        setActiveFilter: vi.fn(),
        carouselAlerts: [],
        sourceById: new Map(),
        radarUrgent: [],
        clusterViews: [],
        hasPins: false,
        pinsTabCount: 0,
        alertsLayoutKey: 'normal',
        cardLayout: {
            mode: 'feed',
            activePanel: hubPanel,
            sectionMinHeightClass: '',
            bodyRegionClass: '',
        },
        guardInteraction: vi.fn(),
        guardedOpenEntity: vi.fn(),
        guardedNavigateRoute: vi.fn(),
        guardedUnpin: vi.fn(),
    };
}

describe('HomeHubPanelBody', () => {
    it('يُبقي اللوحات الثلاث مركّبة من أول render — التبويب النشط فقط ظاهر', () => {
        render(
            <HomeHubPanelBody
                vm={baseVm('alerts')}
                clusterScanSources={{} as never}
                secretaryAlerts={[]}
            />,
        );

        expect(screen.getByTestId('home-hub-panel-alerts')).toBeVisible();
        expect(screen.getByTestId('home-hub-panel-secretary')).not.toBeVisible();
        expect(screen.getByTestId('home-hub-panel-pins')).not.toBeVisible();
    });

    it('يُظهر لوحة السكرتير عند hubPanel=secretary دون إعادة mount', () => {
        const { rerender } = render(
            <HomeHubPanelBody
                vm={baseVm('alerts')}
                clusterScanSources={{} as never}
                secretaryAlerts={[]}
            />,
        );

        rerender(
            <HomeHubPanelBody
                vm={baseVm('secretary')}
                clusterScanSources={{} as never}
                secretaryAlerts={[]}
            />,
        );

        expect(screen.getByTestId('home-hub-panel-secretary')).toBeVisible();
        expect(screen.getByTestId('home-hub-panel-alerts')).not.toBeVisible();
    });

    it('يُظهر لوحة التثبيت عند hubPanel=pins', () => {
        const { rerender } = render(
            <HomeHubPanelBody
                vm={baseVm('alerts')}
                clusterScanSources={{} as never}
                secretaryAlerts={[]}
            />,
        );

        rerender(
            <HomeHubPanelBody vm={baseVm('pins')} clusterScanSources={{} as never} secretaryAlerts={[]} />,
        );

        expect(screen.getByTestId('home-hub-panel-pins')).toBeVisible();
        expect(screen.getByTestId('home-hub-panel-alerts')).not.toBeVisible();
    });

    it('يعرض هيكل تحميل التنبيهات أثناء hubInitialPending على تبويب التنبيهات', () => {
        const vm = baseVm('alerts');
        vm.hubInitialPending = true;

        render(
            <HomeHubPanelBody vm={vm} clusterScanSources={{} as never} secretaryAlerts={[]} />,
        );

        expect(screen.getByTestId('home-hub-alerts-loading')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-panel-alerts')).not.toBeInTheDocument();
    });
});
