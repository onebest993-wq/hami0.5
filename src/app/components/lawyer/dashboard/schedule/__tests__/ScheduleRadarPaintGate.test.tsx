import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { ScheduleRadarPaintGate } from '@/app/components/lawyer/dashboard/schedule/ScheduleRadarPaintGate';
import {
    resetCalendarEventsCacheForTests,
    setCachedCalendarEvents,
} from '@/app/services/calendar/calendarEventsCache';
import { resetCalendarShellSessionForTests } from '@/app/services/calendar/calendarShellSession';

function LiveRadarStub(): ReactElement {
    return (
        <div data-testid="radar-live-body">
            <div data-testid="radar-selected-day-section">
                <div data-testid="radar-event-card-cal_e1" />
            </div>
        </div>
    );
}

describe('ScheduleRadarPaintGate', () => {
    beforeEach(() => {
        resetCalendarEventsCacheForTests();
        resetCalendarShellSessionForTests();
    });

    it('يبقي صدفة الكروم ويرفع تسليم الجسم الحي دون إزالة الغطاء', async () => {
        const onBack = vi.fn();
        const { rerender } = render(
            <ScheduleRadarPaintGate open onBack={onBack} userId="lawyer-1">
                {null}
            </ScheduleRadarPaintGate>,
        );

        const cover = screen.getByTestId('schedule-radar-paint-cover');
        expect(cover).toHaveAttribute('data-handoff', '0');
        expect(screen.getByTestId('schedule-tab-loading')).toBeTruthy();
        expect(screen.getByTestId('smart-legal-radar')).toHaveAttribute('data-schedule-instant', '1');
        expect(screen.getByTestId('smart-legal-radar')).toHaveAttribute(
            'data-schedule-snapshot',
            'pending',
        );

        act(() => {
            setCachedCalendarEvents('lawyer-1', []);
        });
        rerender(
            <ScheduleRadarPaintGate open onBack={onBack} userId="lawyer-1">
                <LiveRadarStub />
            </ScheduleRadarPaintGate>,
        );

        await waitFor(() => {
            expect(screen.getByTestId('schedule-radar-paint-cover')).toHaveAttribute(
                'data-handoff',
                '1',
            );
        });
        expect(screen.queryByTestId('schedule-tab-loading')).toBeNull();
        expect(screen.getByTestId('radar-live-body')).toBeTruthy();
        expect(screen.getByTestId('smart-legal-radar')).toHaveAttribute(
            'data-schedule-snapshot',
            'ready',
        );
    });
});
