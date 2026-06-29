import { describe, expect, it } from 'vitest';
import {
    addCalendarDaysYmd,
    daysElapsedFromAnchorYmd,
    gracePeriodFirstCoerciveDayYmd,
    gracePeriodWindowBoundsYmd,
    lastDayOfYmdWindow,
    normalizeYmd,
    windowBoundsYmd,
} from '@/app/utils/executionYmdCalendar';

describe('executionYmdCalendar', () => {
    it('normalizeYmd يقبل ISO و YYYY-MM-DD', () => {
        expect(normalizeYmd('2026-06-01')).toBe('2026-06-01');
        expect(normalizeYmd('2026-06-01T15:30:00.000Z').slice(0, 10)).toMatch(/2026-06-0[12]/);
    });

    it('inclusive_same_day — يوم الإصدار = 0', () => {
        expect(
            daysElapsedFromAnchorYmd('2026-06-01', new Date('2026-06-01'), 'inclusive_same_day'),
        ).toBe(0);
        expect(
            daysElapsedFromAnchorYmd('2026-06-01', new Date('2026-06-03'), 'inclusive_same_day'),
        ).toBe(2);
    });

    it('inclusive_same_day — نافذة 3 أيام', () => {
        expect(windowBoundsYmd('2026-06-01', 3, 'inclusive_same_day')).toEqual({
            startYmd: '2026-06-01',
            endYmd: '2026-06-03',
        });
    });

    it('next_day_start — مهلة رضا من الغد', () => {
        expect(windowBoundsYmd('2026-06-01', 7, 'next_day_start')).toEqual({
            startYmd: '2026-06-02',
            endYmd: '2026-06-08',
        });
        expect(
            daysElapsedFromAnchorYmd('2026-06-01', new Date('2026-06-01'), 'next_day_start'),
        ).toBe(-1);
        expect(
            daysElapsedFromAnchorYmd('2026-06-01', new Date('2026-06-02'), 'next_day_start'),
        ).toBe(0);
    });

    it('lastDayOfYmdWindow للتمييز 7 أيام من الإصدار', () => {
        expect(lastDayOfYmdWindow('2026-06-01', 7, 'inclusive_same_day')).toBe('2026-06-07');
    });

    it('gracePeriodWindowBoundsYmd — 7 أيام من الغد', () => {
        expect(gracePeriodWindowBoundsYmd('2026-02-10')).toEqual({
            startYmd: '2026-02-11',
            endYmd: '2026-02-17',
        });
        expect(gracePeriodFirstCoerciveDayYmd('2026-02-10')).toBe('2026-02-18');
    });

    it('addCalendarDaysYmd بدون انزياح UTC', () => {
        expect(addCalendarDaysYmd('2026-06-01', 2)).toBe('2026-06-03');
    });
});
