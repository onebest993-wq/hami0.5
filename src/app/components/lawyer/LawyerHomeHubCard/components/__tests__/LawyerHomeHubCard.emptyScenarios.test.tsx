import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LawyerHomeHubCard } from '@/app/components/lawyer/LawyerHomeHubCard';
import { useLawyerHomeHubCard } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useLawyerHomeHubCard';
import type { LawyerHomeHubCardViewModel } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/lawyerHomeHubCard.types';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';

vi.mock('@/app/components/lawyer/LawyerHomeHubCard/hooks/useLawyerHomeHubCard', () => ({
    useLawyerHomeHubCard: vi.fn(),
}));

const emptySources: ClusterScanSources = {
    lawsuitFiles: [],
    executionFiles: [],
    criminalCases: [],
    urgentCases: [],
    threadingTransactions: [],
    threadingTasks: [],
    notes: [],
    fieldTasks: [],
    vaultDocs: [],
    calendarEvents: [],
    ready: true,
};

const cardProps = {
    lawyerId: 'lawyer-1',
    shellAuthUserId: 'lawyer-1',
    clusterScanSources: emptySources,
    secretaryAlerts: [],
    onNavigateRoute: vi.fn(),
    onOpenEntity: vi.fn(),
};

function emptyVm(overrides: Partial<LawyerHomeHubCardViewModel> = {}): LawyerHomeHubCardViewModel {
    return {
        hubPanel: 'alerts',
        selectHubPanel: vi.fn(),
        hubFullyEmpty: true,
        hubHasItems: false,
        hubInitialPending: false,
        hubBootSettling: false,
        blockClasses: 'bg-transparent border-0 rounded-none shadow-none min-h-0',
        blockStyle: {},
        containerBorderOn: false,
        alertsTabCount: 0,
        alertsEmptyState: 'empty',
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
            activePanel: 'alerts',
            sectionMinHeightClass: 'min-h-0',
            bodyRegionClass: 'hami-hub-card-body--feed',
        },
        guardedOpenEntity: vi.fn(),
        guardedNavigateRoute: vi.fn(),
        guardedUnpin: vi.fn(),
        guardedTogglePin: vi.fn(),
        isPinned: vi.fn(() => false),
        guardedDismissRadar: vi.fn(),
        ...overrides,
    };
}

describe('LawyerHomeHubCard empty scenarios', () => {
    beforeEach(() => {
        vi.mocked(useLawyerHomeHubCard).mockReset();
    });

    it('يطابق صدفة البطاقة الفارغة المستقرة (تنبيهات نشطة، بلا عناصر)', async () => {
        vi.mocked(useLawyerHomeHubCard).mockReturnValue(emptyVm());
        render(<LawyerHomeHubCard {...cardProps} />);

        const card = screen.getByTestId('home-hub-card');
        expect(card.tagName).toBe('SECTION');
        expect(card).toHaveAttribute('data-hami-block', 'alerts');
        expect(card).toHaveAttribute('data-hub-state', 'empty');
        expect(card).toHaveAttribute('data-hub-boot-settling', '0');
        expect(card).toHaveAttribute('data-hub-has-items', '0');
        expect(card).toHaveAttribute('data-hub-layout-mode', 'feed');
        expect(card).toHaveAttribute('data-hub-active-panel', 'alerts');
        expect(card).toHaveAttribute('aria-label', 'التنبيهات والتثبيت');
        expect(card).not.toHaveAttribute('aria-busy');
        expect(card).toHaveAttribute('dir', 'rtl');

        const alertsTab = screen.getByTestId('home-hub-tab-alerts');
        const pinsTab = screen.getByTestId('home-hub-tab-pins');
        expect(alertsTab).toHaveAttribute('aria-selected', 'true');
        expect(alertsTab).toHaveAttribute('tabIndex', '0');
        expect(pinsTab).toHaveAttribute('aria-selected', 'false');
        expect(pinsTab).toHaveAttribute('tabIndex', '-1');
        expect(alertsTab.querySelector('.hami-hub-tab__pill')).not.toBeNull();
        expect(pinsTab.querySelector('.hami-hub-tab__pill')).toBeNull();

        expect(await screen.findByTestId('home-hub-fully-empty')).toHaveTextContent(
            'لا يوجد تنبيه أو تثبيت',
        );
        expect(screen.getByTestId('home-hub-fully-empty')).toHaveAttribute('role', 'status');
        expect(screen.queryByTestId('home-hub-tab-secretary')).not.toBeInTheDocument();
    });

    it('النقر على التثبيت يستدعي اختيار اللوحة', () => {
        const selectHubPanel = vi.fn();
        vi.mocked(useLawyerHomeHubCard).mockReturnValue(emptyVm({ selectHubPanel }));
        render(<LawyerHomeHubCard {...cardProps} />);

        fireEvent.click(screen.getByTestId('home-hub-tab-pins'));
        expect(selectHubPanel).toHaveBeenCalledWith('pins');
        fireEvent.click(screen.getByTestId('home-hub-tab-alerts'));
        expect(selectHubPanel).not.toHaveBeenCalledWith('alerts');
    });

    it('لوحة التثبيت الفارغة المطوية تعرض نفس الرسالة لا تعليمات التثبيت', async () => {
        vi.mocked(useLawyerHomeHubCard).mockReturnValue(
            emptyVm({
                hubPanel: 'pins',
                cardLayout: {
                    mode: 'pins',
                    activePanel: 'pins',
                    sectionMinHeightClass: 'min-h-0',
                    bodyRegionClass: 'hami-hub-card-body--pins',
                },
            }),
        );
        render(<LawyerHomeHubCard {...cardProps} />);

        const card = screen.getByTestId('home-hub-card');
        expect(card).toHaveAttribute('data-hub-active-panel', 'pins');
        expect(card).toHaveAttribute('data-hub-layout-mode', 'pins');
        expect(await screen.findByTestId('home-hub-pins-empty')).toHaveTextContent(
            'لا يوجد تنبيه أو تثبيت',
        );
        expect(screen.queryByTestId('home-hub-pins-loading')).not.toBeInTheDocument();
        expect(
            screen.queryByText('لا عناصر مثبّتة — استخدم زر التثبيت على الإضبارات.'),
        ).not.toBeInTheDocument();
    });

    it('أثناء التسوية: حالة loading وaria-busy مع فراغ مضغوط', () => {
        vi.mocked(useLawyerHomeHubCard).mockReturnValue(
            emptyVm({
                hubBootSettling: true,
                hubFullyEmpty: true,
            }),
        );
        render(<LawyerHomeHubCard {...cardProps} />);

        const card = screen.getByTestId('home-hub-card');
        expect(card).toHaveAttribute('data-hub-state', 'loading');
        expect(card).toHaveAttribute('data-hub-boot-settling', '1');
        expect(card).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByTestId('home-hub-fully-empty')).toHaveTextContent('لا يوجد تنبيه أو تثبيت');
        expect(screen.queryByTestId('home-hub-panel-alerts')).not.toBeInTheDocument();
    });
});
