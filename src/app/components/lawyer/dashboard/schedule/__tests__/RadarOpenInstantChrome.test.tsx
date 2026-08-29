import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RadarOpenInstantChrome } from '@/app/components/lawyer/dashboard/schedule/RadarOpenInstantChrome';
import { buildRadarOpenInstantSnapshot } from '@/app/components/lawyer/dashboard/schedule/radarOpenInstantChromeModel';
import {
    consumeNativeBackForTests,
    resetNativeBackHandlersForTests,
} from '@/app/runtime/nativeBackStack';

describe('RadarOpenInstantChrome', () => {
    beforeEach(() => {
        resetNativeBackHandlersForTests();
    });

    it('يعرض قشرة رادار بشريط الشهر والأسبوع لا صناديق فارغة', () => {
        const onBack = vi.fn();
        const snap = buildRadarOpenInstantSnapshot();
        render(<RadarOpenInstantChrome onBack={onBack} />);

        const shell = screen.getByTestId('schedule-tab-loading');
        expect(shell).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByRole('heading', { name: 'رادار المواعيد' })).toBeTruthy();
        expect(screen.getByTestId('radar-month-label').textContent).toBe(snap.monthLabel);
        expect(screen.getByTestId('radar-week-strip').children).toHaveLength(7);
        expect(screen.getByTestId('radar-empty-state').textContent).toContain(
            'لا توجد مواعيد لهذا اليوم',
        );
        expect(screen.getByText('الشهر')).toBeTruthy();
        expect(screen.getByText('إضافة موعد')).toBeTruthy();

        fireEvent.click(screen.getByTestId('radar-back'));
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('Escape وCap يرجعان قبل تركيب الرادار', () => {
        const onBack = vi.fn();
        render(<RadarOpenInstantChrome onBack={onBack} />);

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onBack).toHaveBeenCalledTimes(1);

        expect(consumeNativeBackForTests()).toBe(true);
        expect(onBack).toHaveBeenCalledTimes(2);
    });
});

describe('buildRadarOpenInstantSnapshot', () => {
    it('يبني أسبوع أحد→سبت حول اليوم المحدد', () => {
        const snap = buildRadarOpenInstantSnapshot(new Date('2026-08-25T12:00:00'));
        expect(snap.selectedDate).toBe('2026-08-25');
        expect(snap.monthLabel).toBe('أغسطس 2026');
        expect(snap.week).toHaveLength(7);
        expect(snap.week[0]?.ymd).toBe('2026-08-23');
        expect(snap.week[0]?.name).toBe('أحد');
        const selected = snap.week.find((d) => d.selected);
        expect(selected?.ymd).toBe('2026-08-25');
        expect(selected?.name).toBe('ثلاثاء');
    });
});
