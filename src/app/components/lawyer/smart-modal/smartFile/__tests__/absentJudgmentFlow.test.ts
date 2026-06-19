import { describe, expect, it } from 'vitest';
import {
    ABSENT_JUDGMENT_OBJECTION_DAYS,
    absentObjectionJudgmentOptions,
    computeAbsentObjectionDeadline,
    daysRemainingUntil,
    isAbsentObjectionStageName,
    isAwaitingAbsentJudgmentNotification,
    isAbsentJudgmentForm,
} from '../absentJudgmentFlow';

describe('absentJudgmentFlow', () => {
    it('detects absent judgment form', () => {
        expect(isAbsentJudgmentForm('غيابي')).toBe(true);
        expect(isAbsentJudgmentForm('حضوري')).toBe(false);
    });

    it('computes objection deadline 10 days after notification', () => {
        expect(computeAbsentObjectionDeadline('2026-06-01')).toBe('2026-06-11');
        expect(ABSENT_JUDGMENT_OBJECTION_DAYS).toBe(10);
    });

    it('detects awaiting notification state', () => {
        expect(
            isAwaitingAbsentJudgmentNotification({
                judgmentForm: 'غيابي',
                isPleadingsClosed: true,
                finalDecision: 'حكم غيابي — بانتظار التبليغ والاعتراض',
            }),
        ).toBe(true);
        expect(
            isAwaitingAbsentJudgmentNotification({
                judgmentForm: 'غيابي',
                isPleadingsClosed: true,
                absentJudgmentNotificationDate: '2026-06-01',
                finalDecision: 'حكم غيابي',
            }),
        ).toBe(false);
    });

    it('calculates days remaining', () => {
        const remaining = daysRemainingUntil('2099-01-01', new Date('2098-12-20'));
        expect(remaining).toBeGreaterThan(0);
    });

    it('detects absent objection stage name', () => {
        expect(isAbsentObjectionStageName('الاعتراض على الحكم الغيابي')).toBe(true);
        expect(isAbsentObjectionStageName('بداءة بدرجة أولى (اعتراض غيابي)')).toBe(true);
        expect(isAbsentObjectionStageName('بداءة بدرجة أولى')).toBe(false);
    });

    it('exposes objection-stage judgment labels without إبطال', () => {
        const options = absentObjectionJudgmentOptions();
        const labels = options.map((o) => o.label).join(' ');
        expect(labels).toContain('تأييد الحكم الغيابي');
        expect(labels).toContain('تعديل الحكم الغيابي بالكامل');
        expect(options.some((o) => o.value === 'إبطال')).toBe(false);
    });
});
