import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeHubAlertsPanel } from '@/app/components/lawyer/LawyerHomeHubCard/components/HomeHubAlertsPanel';
import type { CalendarRadarEvent } from '@/app/workspace/types';

const lazyFind = { timeout: 8_000 };

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
                hasAlerts={false}
                carouselAlerts={[]}
                sourceById={new Map()}
                radarEvents={[]}
                onNavigate={vi.fn()}
                onTogglePin={vi.fn()}
                isPinned={vi.fn(() => false)}
            />,
        );

        expect(screen.queryByRole('tablist', { name: 'تصفية التنبيهات الزمنية' })).not.toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-alerts-feed')).not.toBeInTheDocument();
        expect(screen.getByTestId('home-hub-alerts-empty')).toBeInTheDocument();
    });

    it('تصنيف بلا عناصر في التبويب النشط يعرض رسالة التصفية داخل الجسم الغني', async () => {
        render(
            <HomeHubAlertsPanel
                hasCarouselAlerts={false}
                horizonCounts={{ urgent: 0, near: 0, upcoming: 2 }}
                activeFilter="urgent"
                onFilterChange={vi.fn()}
                alertsEmptyState="content"
                hasAlerts={false}
                carouselAlerts={[]}
                sourceById={new Map()}
                radarEvents={[]}
                onNavigate={vi.fn()}
                onTogglePin={vi.fn()}
                isPinned={vi.fn(() => false)}
            />,
        );

        expect(await screen.findByTestId('home-hub-alerts-feed', {}, lazyFind)).toBeInTheDocument();
        expect(screen.getByText('لا مواعيد في هذا التصنيف — جرّب تبويباً آخر.')).toBeInTheDocument();
    });

    it('البطاقة المطوية تستخدم رسالة الفراغ الموحدة', () => {
        render(
            <HomeHubAlertsPanel
                hasCarouselAlerts={false}
                horizonCounts={{ urgent: 0, near: 0, upcoming: 0 }}
                activeFilter="urgent"
                onFilterChange={vi.fn()}
                alertsEmptyState="empty"
                hasAlerts={false}
                carouselAlerts={[]}
                sourceById={new Map()}
                radarEvents={[]}
                onNavigate={vi.fn()}
                onTogglePin={vi.fn()}
                isPinned={vi.fn(() => false)}
                hubFullyEmpty
            />,
        );

        const empty = screen.getByTestId('home-hub-fully-empty');
        expect(empty).toHaveAttribute('role', 'status');
        expect(empty).toHaveTextContent('لا يوجد تنبيه أو تثبيت');
        expect(screen.queryByTestId('home-hub-alerts-empty')).not.toBeInTheDocument();
        expect(screen.getByTestId('home-hub-panel-alerts')).toHaveAttribute('role', 'tabpanel');
        expect(screen.getByTestId('home-hub-panel-alerts')).toHaveAttribute(
            'id',
            'home-hub-panel-alerts',
        );
    });

    it('يعرض خطأ التنبيهات كتنبيه حي', () => {
        render(
            <HomeHubAlertsPanel
                hasCarouselAlerts={false}
                horizonCounts={{ urgent: 0, near: 0, upcoming: 0 }}
                activeFilter="urgent"
                onFilterChange={vi.fn()}
                alertsEmptyState="error"
                hasAlerts={false}
                carouselAlerts={[]}
                sourceById={new Map()}
                radarEvents={[]}
                onNavigate={vi.fn()}
                onTogglePin={vi.fn()}
                isPinned={vi.fn(() => false)}
            />,
        );

        expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل التنبيهات');
        expect(screen.queryByTestId('home-hub-fully-empty')).not.toBeInTheDocument();
    });

    it('يعرض تبويبي عاجل/قادم عند وجود محتوى (جسم كسول)', async () => {
        render(
            <HomeHubAlertsPanel
                hasCarouselAlerts={false}
                horizonCounts={{ urgent: 1, near: 0, upcoming: 0 }}
                activeFilter="urgent"
                onFilterChange={vi.fn()}
                alertsEmptyState="content"
                hasAlerts={false}
                carouselAlerts={[]}
                sourceById={new Map()}
                radarEvents={[radarEvent('ev-1')]}
                onNavigate={vi.fn()}
                onTogglePin={vi.fn()}
                isPinned={vi.fn(() => false)}
            />,
        );

        expect(await screen.findByRole('tablist', { name: 'تصفية التنبيهات الزمنية' }, lazyFind)).toBeInTheDocument();
        expect(await screen.findByTestId('home-hub-alerts-feed', {}, lazyFind)).toBeInTheDocument();
    });

    it('يعرض هيكل تحميل ثابت أثناء انتظار التنبيهات', () => {
        render(
            <HomeHubAlertsPanel
                hasCarouselAlerts={false}
                horizonCounts={{ urgent: 0, near: 0, upcoming: 0 }}
                activeFilter="urgent"
                onFilterChange={vi.fn()}
                alertsEmptyState="loading"
                hasAlerts={false}
                carouselAlerts={[]}
                sourceById={new Map()}
                radarEvents={[]}
                onNavigate={vi.fn()}
                onTogglePin={vi.fn()}
                isPinned={vi.fn(() => false)}
            />,
        );

        expect(screen.getByTestId('home-hub-alerts-loading')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-alerts-feed')).not.toBeInTheDocument();
    });

    it('يعرض مواعيد الرادار في تبويب عاجل حتى مع وجود تنبيهات قادمة في الكاروسيل', async () => {
        render(
            <HomeHubAlertsPanel
                hasCarouselAlerts={true}
                horizonCounts={{ urgent: 4, near: 0, upcoming: 2 }}
                activeFilter="urgent"
                onFilterChange={vi.fn()}
                alertsEmptyState="content"
                hasAlerts={false}
                carouselAlerts={[]}
                sourceById={new Map()}
                radarEvents={[radarEvent('ev-1'), radarEvent('ev-2'), radarEvent('ev-3'), radarEvent('ev-4')]}
                onNavigate={vi.fn()}
                onTogglePin={vi.fn()}
                isPinned={vi.fn(() => false)}
            />,
        );

        expect(await screen.findByTestId('home-hub-radar-item-ev-1', {}, lazyFind)).toBeInTheDocument();
        expect(screen.getByTestId('home-hub-radar-item-ev-2')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-radar-item-ev-3')).not.toBeInTheDocument();
        expect(screen.getByTestId('home-hub-urgent-more-trigger')).toBeInTheDocument();
        expect(screen.queryByText('لا مواعيد في هذا التصنيف — جرّب تبويباً آخر.')).not.toBeInTheDocument();
    });
});
