import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadarSelectedDaySection } from '@/app/components/lawyer/SmartLegalRadar/RadarSelectedDaySection';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

vi.mock('@/app/hooks/useReduceMotion', () => ({
    useReduceMotion: () => true,
}));

describe('RadarSelectedDaySection', () => {
    it('يعرض ملخص اليوم عند وجود مواعيد', () => {
        const events: UnifiedEvent[] = [
            { id: 'e1', title: 'جلسة', date: '2026-08-03', type: 'hearing', source: 'calendar' },
        ];

        render(
            <RadarSelectedDaySection
                selectedEvents={events}
                aiBriefing="لديك (1) مواعيد"
                conflictMessage={null}
                onEditEvent={vi.fn()}
                onDeleteEvent={vi.fn()}
            />,
        );

        expect(screen.getByTestId('radar-ai-briefing')).toBeInTheDocument();
        expect(screen.getByText('لديك (1) مواعيد')).toBeInTheDocument();
    });
});
