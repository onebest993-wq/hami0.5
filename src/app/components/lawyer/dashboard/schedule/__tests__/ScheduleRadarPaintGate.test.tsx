import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ScheduleRadarPaintGate } from '@/app/components/lawyer/dashboard/schedule/ScheduleRadarPaintGate';

function LiveRadarStub(): ReactElement {
    return (
        <div data-testid="smart-legal-radar">
            <button type="button" data-testid="radar-back">
                <svg />
            </button>
            <p data-testid="radar-month-label">أغسطس 2026</p>
            <div data-testid="radar-week-strip">أسبوع</div>
        </div>
    );
}

describe('ScheduleRadarPaintGate', () => {
    it('يبقي الغطاء حتى يستقر كروم الرادار الحي ثم يرفعه', async () => {
        const onBack = vi.fn();
        const { rerender } = render(
            <ScheduleRadarPaintGate open onBack={onBack}>
                {null}
            </ScheduleRadarPaintGate>,
        );

        expect(screen.getByTestId('schedule-radar-paint-cover')).toBeTruthy();
        expect(screen.getByTestId('schedule-tab-loading')).toBeTruthy();

        rerender(
            <ScheduleRadarPaintGate open onBack={onBack}>
                <LiveRadarStub />
            </ScheduleRadarPaintGate>,
        );

        await waitFor(() => {
            expect(screen.queryByTestId('schedule-radar-paint-cover')).toBeNull();
        });
        expect(screen.getByTestId('smart-legal-radar')).toBeTruthy();
    });
});
