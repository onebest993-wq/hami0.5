import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HomeHubRadarSection } from '@/app/components/lawyer/LawyerHomeHubCard/components/HomeHubRadarSection';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import { HOME_HUB_RADAR_PREVIEW_LIMIT } from '@/app/services/alerts/homeHubCardLogic';

const baseEvent = (id: string, title: string, caseNo?: string): CalendarRadarEvent => ({
    id,
    title,
    whenLabel: 'اليوم 3:00 م',
    dateLabel: 'اليوم',
    timeLabel: '3:00 م',
    sourceModuleLabel: 'دعوى',
    sourcePlace: 'محكمة الكرخ',
    ...(caseNo ? { caseNo } : {}),
    routePath: `workspace:lawsuit:${id}`,
});

const sampleEvent = baseEvent('f7915eb5-0767-41db-b7c0-07a360033d8c', 'جلسة مراجعة', '2026/150');

describe('HomeHubRadarSection', () => {
    it('يعرض العنوان والمكان في سطر واحد والتفاصيل في الجانب المقابل', () => {
        render(
            <HomeHubRadarSection
                events={[sampleEvent]}
                showDivider={false}
                onNavigate={vi.fn()}
            />,
        );

        const open = screen.getByTestId(`home-hub-radar-item-${sampleEvent.id}`);
        const headline = open.querySelector('.hami-hub-radar__headline');
        expect(headline?.querySelector('.hami-hub-radar__title-text')?.textContent).toBe(
            'جلسة مراجعة',
        );
        expect(headline?.querySelector('.hami-hub-radar__place')?.textContent).toBe('2026/150');
        const details = open.querySelector('.hami-hub-radar__details');
        expect(details?.textContent).toContain('اليوم');
        expect(details?.textContent).toContain('دعوى');
        expect(details?.textContent).toContain('محكمة الكرخ');
        expect(open.getAttribute('aria-label')).toBe('جلسة مراجعة، اليوم · دعوى · 2026/150');
    });

    it('يعرض حتى ثلاثة عناصر فقط وزر سهم للباقي', () => {
        const events = [
            baseEvent('ev-1', 'أول'),
            baseEvent('ev-2', 'ثاني'),
            baseEvent('ev-3', 'ثالث'),
            baseEvent('ev-4', 'رابع'),
        ];

        render(
            <HomeHubRadarSection events={events} showDivider={false} onNavigate={vi.fn()} />,
        );

        expect(screen.getByTestId('home-hub-radar-item-ev-1')).toBeInTheDocument();
        expect(screen.getByTestId('home-hub-radar-item-ev-2')).toBeInTheDocument();
        expect(screen.getByTestId('home-hub-radar-item-ev-3')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-radar-item-ev-4')).not.toBeInTheDocument();

        expect(screen.getByTestId('home-hub-radar-more-trigger')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-radar-more-overlay')).not.toBeInTheDocument();

        fireEvent.click(screen.getByTestId('home-hub-radar-more-trigger'));

        expect(screen.getByTestId('home-hub-radar-more-overlay')).toBeInTheDocument();
        expect(screen.getByTestId('home-hub-radar-more-panel')).toBeInTheDocument();
        expect(screen.getByTestId('home-hub-radar-item-ev-4')).toBeInTheDocument();
        expect(screen.getAllByTestId(/^home-hub-radar-item-/)).toHaveLength(4);

        fireEvent.click(screen.getByTestId('home-hub-radar-more-close'));
        expect(screen.queryByTestId('home-hub-radar-more-overlay')).not.toBeInTheDocument();
    });

    it('لا يعرض زر السهم عندما العدد ≤ الحد', () => {
        const events = Array.from({ length: HOME_HUB_RADAR_PREVIEW_LIMIT }, (_, i) =>
            baseEvent(`ev-${i}`, `عنصر ${i}`),
        );

        render(
            <HomeHubRadarSection events={events} showDivider={false} onNavigate={vi.fn()} />,
        );

        expect(screen.queryByTestId('home-hub-radar-more-trigger')).not.toBeInTheDocument();
    });
});
