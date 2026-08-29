import { describe, expect, it } from 'vitest';
import {
    computePastAlimonyDuration,
    computePastAlimonyAmount,
    diffDaysBetween,
    resolveAlimonyCalculatorInsights,
    roundAlimonyAmount,
    type AlimonyPastLawSystem,
} from '../useAlimonyCalculator';

const JAAFARI = 'الفقه الجعفري' satisfies AlimonyPastLawSystem;
const LAW_1959: AlimonyPastLawSystem = 'قانون الأحوال الشخصية 1959';

describe('diffDaysBetween', () => {
    it('returns exact day count between two dates', () => {
        expect(diffDaysBetween('2025-02-01', '2025-06-01')).toBe(120);
    });

    it('returns zero when start is on or after end', () => {
        expect(diffDaysBetween('2026-06-01', '2026-06-01')).toBe(0);
    });
});

describe('roundAlimonyAmount', () => {
    it('rounds to nearest 1000', () => {
        expect(roundAlimonyAmount(400_500)).toBe(401_000);
        expect(roundAlimonyAmount(400_499)).toBe(400_000);
    });
});

describe('computePastAlimonyDuration', () => {
    it('caps past alimony at 360 days (12 months) under 1959 law', () => {
        const r = computePastAlimonyDuration('2020-01-01', '2026-06-01', LAW_1959);
        expect(r.totalDays).toBeGreaterThan(360);
        expect(r.billableDays).toBe(360);
        expect(r.billableMonths).toBe(12);
        expect(r.pastYearCapApplied).toBe(true);
    });

    it('does not cap past alimony under Jaafari law', () => {
        const r = computePastAlimonyDuration('2020-01-01', '2026-06-01', JAAFARI);
        expect(r.billableDays).toBe(r.totalDays);
        expect(r.billableMonths).toBe(r.rawMonths);
        expect(r.billableDays).toBeGreaterThan(360);
        expect(r.pastYearCapApplied).toBe(false);
    });

    it('returns zero when start is on or after end date', () => {
        expect(computePastAlimonyDuration('2026-06-01', '2026-06-01', LAW_1959).billableDays).toBe(
            0,
        );
    });
});

describe('resolveAlimonyCalculatorInsights', () => {
    it('detects execution date before lawsuit date', () => {
        const insights = resolveAlimonyCalculatorInsights({
            alimonyBeneficiary: 'زوجة فقط',
            alimonyLawsuitDate: '2026-08-05',
            alimonyExecutionDate: '2026-02-05',
            alimonyWifeMonthly: '250000',
            alimonyChildrenMonthly: '',
            alimonyChildrenCount: '1',
        });
        expect(insights.status).toBe('execution_before_lawsuit');
        expect(insights.isExecutionAfterLawsuit).toBe(false);
        expect(insights.hints.some((h) => h.includes('يسبق'))).toBe(true);
    });

    it('reports ready state with day count', () => {
        const insights = resolveAlimonyCalculatorInsights({
            alimonyBeneficiary: 'زوجة فقط',
            alimonyLawsuitDate: '2026-02-05',
            alimonyExecutionDate: '2026-08-05',
            alimonyWifeMonthly: '250000',
            alimonyChildrenMonthly: '',
            alimonyChildrenCount: '1',
        });
        expect(insights.status).toBe('ready');
        expect(insights.daysBetween).toBeGreaterThan(0);
    });
});

describe('accumulated alimony formula', () => {
    it('uses days/30 for lawsuit to execution period', () => {
        const days = diffDaysBetween('2025-02-01', '2025-06-01');
        const months = days / 30;
        const wifeMonthly = 100_000;
        expect(roundAlimonyAmount(wifeMonthly * months)).toBe(400_000);
    });
});

describe('computePastAlimonyAmount', () => {
    it('calculates past alimony by daily rate (monthly ÷ 30 × days)', () => {
        expect(computePastAlimonyAmount(300_000, 120)).toBe(1_200_000);
    });
});
