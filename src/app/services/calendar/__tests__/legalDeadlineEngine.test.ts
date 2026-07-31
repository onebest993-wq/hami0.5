import { describe, expect, it } from 'vitest';
import {
    addLegalWorkingDaysFromStart,
    calculateLegalExpirationDate,
    countLegalWorkingDaysInclusive,
    describeLegalDeadlineForCalendarCard,
    isIraqiLegalWeekend,
    remainingLegalWorkingDaysUntil,
} from '../legalDeadlineEngine';

function ymd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

describe('legalDeadlineEngine weekend skip (Fri/Sat)', () => {
    it('treats Friday and Saturday as legal weekends', () => {
        // 2026-07-24 Friday, 2026-07-25 Saturday, 2026-07-26 Sunday
        expect(isIraqiLegalWeekend(new Date(2026, 6, 24))).toBe(true);
        expect(isIraqiLegalWeekend(new Date(2026, 6, 25))).toBe(true);
        expect(isIraqiLegalWeekend(new Date(2026, 6, 26))).toBe(false);
    });

    it('adds legal working days skipping Fri/Sat from day after start', () => {
        // start Thu 2026-07-23 → count from Fri (skip) Sat (skip) Sun=1 Mon=2 Tue=3
        const end = addLegalWorkingDaysFromStart('2026-07-23', 3);
        expect(ymd(end)).toBe('2026-07-28');
    });

    it('calculates INTERLOCUTORY_216 (7 legal days) across a weekend', () => {
        // start Wed 2026-07-22 → Thu1 Fri- Sat- Sun2 Mon3 Tue4 Wed5 Thu6 Fri- Sat- Sun7 = 2026-08-02
        const result = calculateLegalExpirationDate({
            startDate: '2026-07-22',
            decisionType: 'INTERLOCUTORY_216',
            asOf: '2026-07-22',
        });
        expect(result.durationLegalDays).toBe(7);
        expect(result.periodStartYmd).toBe('2026-07-23');
        expect(result.expirationYmd).toBe('2026-08-02');
        expect(result.decisionTypeLabel).toContain('216');
    });

    it('counts inclusive legal working days between two dates', () => {
        // Sun–Thu week: 2026-07-26..2026-07-30 = 5
        expect(countLegalWorkingDaysInclusive('2026-07-26', '2026-07-30')).toBe(5);
        // includes a Fri/Sat in range: 26–01 Aug = Sun Mon Tue Wed Thu Fri Sat = 5
        expect(countLegalWorkingDaysInclusive('2026-07-26', '2026-08-01')).toBe(5);
    });

    it('remaining days is zero after expiration', () => {
        expect(remainingLegalWorkingDaysUntil('2026-07-20', '2026-07-22')).toBe(0);
    });

    it('calendar card summary includes source and remaining working days', () => {
        const card = describeLegalDeadlineForCalendarCard({
            expirationYmd: '2026-07-30',
            decisionSource: 'آخر موعد طعن على الحكم البدائي',
            asOf: '2026-07-26',
        });
        expect(card.remainingLegalWorkingDays).toBe(5);
        expect(card.summaryAr).toContain('آخر موعد طعن');
        expect(card.summaryAr).toContain('5');
        expect(card.summaryAr).toContain('2026-07-30');
    });
});
