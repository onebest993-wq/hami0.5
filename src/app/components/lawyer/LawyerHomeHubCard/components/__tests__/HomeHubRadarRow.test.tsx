import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HomeHubRadarRow } from '@/app/components/lawyer/LawyerHomeHubCard/components/HomeHubRadarRow';
import type { CalendarRadarEvent } from '@/app/workspace/types';

const sampleEvent: CalendarRadarEvent = {
    id: 'f7915eb5-0767-41db-b7c0-07a360033d8c',
    title: 'جلسة مراجعة',
    whenLabel: 'اليوم 3:00 م',
    dateLabel: 'اليوم',
    timeLabel: '3:00 م',
    sourceModuleLabel: 'دعوى',
    sourcePlace: 'محكمة الكرخ',
    caseNo: '2026/150',
    routePath: 'workspace:lawsuit:f7915eb5-0767-41db-b7c0-07a360033d8c',
};

describe('HomeHubRadarRow', () => {
    it('يعرض العنوان والمكان في سطر واحد والتفاصيل في الجانب المقابل', () => {
        render(
            <ul>
                <HomeHubRadarRow ev={sampleEvent} onNavigate={vi.fn()} />
            </ul>,
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

    it('زر التجاهل يستدعي onDismiss دون التنقّل', () => {
        const onNavigate = vi.fn();
        const onDismiss = vi.fn();
        render(
            <ul>
                <HomeHubRadarRow ev={sampleEvent} onNavigate={onNavigate} onDismiss={onDismiss} />
            </ul>,
        );

        fireEvent.click(screen.getByTestId(`home-hub-radar-dismiss-${sampleEvent.id}`));
        expect(onDismiss).toHaveBeenCalledWith(sampleEvent.id);
        expect(onNavigate).not.toHaveBeenCalled();
    });
});
