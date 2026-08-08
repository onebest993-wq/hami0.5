import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeHubAlertsPanel } from '@/app/components/lawyer/LawyerHomeHubCard/components/HomeHubAlertsPanel';
import type { CalendarRadarEvent } from '@/app/workspace/types';

const radarEvent = (id: string): CalendarRadarEvent => ({
    id,
    title: `جلسة ${id}`,
    whenLabel: 'اليوم 3:00 م',
    dateLabel: 'اليوم',
    timeLabel: '3:00 م',
    sourceModuleLabel: 'دعوى',
    sourcePlace: 'محكمة الكرخ',
    routePath: `workspace:lawsuit:${id}`,
});

describe('HomeHubAlertsPanel', () => {
    it('يخفي تبويبي عاجل/قادم عند عدم وجود محتوى', () => {
        render(
            <HomeHubAlertsPanel
                hasCarouselAlerts={false}
                horizonCounts={{ urgent: 0, near: 0, upcoming: 0 }}
                activeFilter="urgent"
                onFilterChange={vi.fn()}
                alertsEmptyState="content"
                alertsError={null}
                hasAlerts={false}
                carouselAlerts={[]}
                sourceById={new Map()}
                alertsLayoutKey="normal"
                radarEvents={[]}
                onNavigate={vi.fn()}
            />,
        );

        expect(screen.queryByRole('tablist', { name: 'تصفية التنبيهات الزمنية' })).not.toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-alerts-feed')).not.toBeInTheDocument();
        expect(screen.getByTestId('home-hub-alerts-empty')).toBeInTheDocument();
    });

    it('يعرض تبويبي عاجل/قادم عند وجود محتوى', () => {
        render(
            <HomeHubAlertsPanel
                hasCarouselAlerts={false}
                horizonCounts={{ urgent: 1, near: 0, upcoming: 0 }}
                activeFilter="urgent"
                onFilterChange={vi.fn()}
                alertsEmptyState="content"
                alertsError={null}
                hasAlerts={false}
                carouselAlerts={[]}
                sourceById={new Map()}
                alertsLayoutKey="normal"
                radarEvents={[radarEvent('ev-1')]}
                onNavigate={vi.fn()}
            />,
        );

        expect(screen.getByRole('tablist', { name: 'تصفية التنبيهات الزمنية' })).toBeInTheDocument();
        expect(screen.getByTestId('home-hub-alerts-feed')).toBeInTheDocument();
    });

    it('يعرض هيكل تحميل ثابت أثناء انتظار التنبيهات', () => {
        render(
            <HomeHubAlertsPanel
                hasCarouselAlerts={false}
                horizonCounts={{ urgent: 0, near: 0, upcoming: 0 }}
                activeFilter="urgent"
                onFilterChange={vi.fn()}
                alertsEmptyState="loading"
                alertsError={null}
                hasAlerts={false}
                carouselAlerts={[]}
                sourceById={new Map()}
                alertsLayoutKey="normal"
                radarEvents={[]}
                onNavigate={vi.fn()}
            />,
        );

        expect(screen.getByTestId('home-hub-alerts-loading')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-alerts-feed')).not.toBeInTheDocument();
    });

    it('يعرض مواعيد الرادار في تبويب عاجل حتى مع وجود تنبيهات قادمة في الكاروسيل', () => {
        render(
            <HomeHubAlertsPanel
                hasCarouselAlerts={true}
                horizonCounts={{ urgent: 4, near: 0, upcoming: 2 }}
                activeFilter="urgent"
                onFilterChange={vi.fn()}
                alertsEmptyState="content"
                alertsError={null}
                hasAlerts={false}
                carouselAlerts={[]}
                sourceById={new Map()}
                alertsLayoutKey="normal"
                radarEvents={[radarEvent('ev-1'), radarEvent('ev-2'), radarEvent('ev-3'), radarEvent('ev-4')]}
                onNavigate={vi.fn()}
            />,
        );

        expect(screen.getByTestId('home-hub-radar-item-ev-1')).toBeInTheDocument();
        expect(screen.getByTestId('home-hub-radar-item-ev-2')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-radar-item-ev-3')).not.toBeInTheDocument();
        expect(screen.getByTestId('home-hub-urgent-more-trigger')).toBeInTheDocument();
        expect(screen.queryByText('لا مواعيد في هذا التصنيف — جرّب تبويباً آخر.')).not.toBeInTheDocument();
    });
});
