import { describe, expect, it } from 'vitest';
import {
    toBaghdadYmd,
    todayBaghdadYmd,
    baghdadDateTimeToTimestamp,
    baghdadDayRange,
    addBaghdadDays,
} from '../baghdadTime';

describe('toBaghdadYmd', () => {
    it('keeps plain YYYY-MM-DD as-is', () => {
        expect(toBaghdadYmd('2026-06-01')).toBe('2026-06-01');
    });

    it('converts ISO UTC string to Baghdad date', () => {
        // 2026-06-01T22:30:00Z في بغداد = 2026-06-02 01:30
        expect(toBaghdadYmd('2026-06-01T22:30:00Z')).toBe('2026-06-02');
    });

    it('keeps same date when UTC time is within Baghdad day', () => {
        // 2026-06-01T15:00:00Z في بغداد = 2026-06-01 18:00 → نفس اليوم
        expect(toBaghdadYmd('2026-06-01T15:00:00Z')).toBe('2026-06-01');
    });

    it('handles Date objects', () => {
        const d = new Date('2026-06-01T00:00:00Z'); // بغداد = 03:00 من 2026-06-01
        expect(toBaghdadYmd(d)).toBe('2026-06-01');
    });

    it('returns null for invalid input', () => {
        expect(toBaghdadYmd('not a date')).toBe(null);
    });
});

describe('todayBaghdadYmd', () => {
    it('returns YYYY-MM-DD format', () => {
        const ymd = todayBaghdadYmd();
        expect(ymd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

describe('baghdadDateTimeToTimestamp', () => {
    it('converts YMD + HH:MM to correct UTC timestamp', () => {
        // 2026-06-01 09:00 بغداد = 2026-06-01 06:00 UTC
        const ts = baghdadDateTimeToTimestamp('2026-06-01', '09:00', 'start');
        const expected = Date.UTC(2026, 5, 1, 6, 0, 0, 0);
        expect(ts).toBe(expected);
    });

    it('uses 09:00 Baghdad for start mode without time', () => {
        const ts = baghdadDateTimeToTimestamp('2026-06-01', null, 'start');
        const expected = Date.UTC(2026, 5, 1, 6, 0, 0, 0); // 09:00 - 3h
        expect(ts).toBe(expected);
    });

    it('uses 23:59:59 Baghdad for end mode without time', () => {
        const ts = baghdadDateTimeToTimestamp('2026-06-01', null, 'end');
        const expected = Date.UTC(2026, 5, 1, 20, 59, 59, 999); // 23:59:59 - 3h
        expect(ts).toBe(expected);
    });

    it('returns null for invalid YMD', () => {
        expect(baghdadDateTimeToTimestamp('not-a-date', '12:00')).toBe(null);
    });
});

describe('baghdadDayRange', () => {
    it('returns startMs and endMs spanning a full day', () => {
        const r = baghdadDayRange('2026-06-01');
        expect(r).not.toBeNull();
        if (!r) return;
        // start should be 00:00 Baghdad = 21:00 prev UTC day
        const expectedStart = Date.UTC(2026, 4, 31, 21, 0, 0, 0);
        // end should be 23:59:59.999 Baghdad = 20:59:59.999 same UTC day
        const expectedEnd = Date.UTC(2026, 5, 1, 20, 59, 59, 999);
        expect(r.startMs).toBe(expectedStart);
        expect(r.endMs).toBe(expectedEnd);
        // span is just under 24h
        expect(r.endMs - r.startMs).toBeGreaterThan(23 * 60 * 60 * 1000);
        expect(r.endMs - r.startMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    });
});

describe('addBaghdadDays', () => {
    it('adds positive days', () => {
        expect(addBaghdadDays('2026-06-01', 1)).toBe('2026-06-02');
        expect(addBaghdadDays('2026-06-01', 7)).toBe('2026-06-08');
    });

    it('subtracts negative days', () => {
        expect(addBaghdadDays('2026-06-01', -1)).toBe('2026-05-31');
    });

    it('crosses month boundary', () => {
        expect(addBaghdadDays('2026-05-31', 1)).toBe('2026-06-01');
    });

    it('crosses year boundary', () => {
        expect(addBaghdadDays('2026-12-31', 1)).toBe('2027-01-01');
    });
});
