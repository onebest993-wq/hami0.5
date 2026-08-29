import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadarSelectedDaySection } from '@/app/components/lawyer/SmartLegalRadar/RadarSelectedDaySection';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

describe('RadarSelectedDaySection', () => {
    it('يعرض ملخص اليوم عند وجود مواعيد', () => {
        const events: UnifiedEvent[] = [
            { id: 'e1', title: 'جلسة', date: '2026-08-03', type: 'hearing', source: 'calendar' },
        ];

        render(
            <RadarSelectedDaySection
                selectedEvents={events}
                dayBriefing="لديك (1) مواعيد"
                conflictMessage={null}
                onEditEvent={vi.fn()}
                onDeleteEvent={vi.fn()}
            />,
        );

        expect(screen.getByTestId('radar-day-briefing')).toBeInTheDocument();
        expect(screen.getByText('لديك (1) مواعيد')).toBeInTheDocument();
    });

    it('يعرض حالة فارغة بلا مواعيد', () => {
        render(
            <RadarSelectedDaySection
                selectedEvents={[]}
                conflictMessage={null}
                onEditEvent={vi.fn()}
                onDeleteEvent={vi.fn()}
            />,
        );
        expect(screen.getByTestId('radar-empty-state')).toHaveTextContent('لا توجد مواعيد لهذا اليوم');
    });
});
