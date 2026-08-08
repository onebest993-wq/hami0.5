import { describe, expect, it } from 'vitest';
import {
    buildGhuramaaContext,
    buildGhuramaaEqualSplitInputs,
    computeGhuramaaManualDistribution,
} from '../focGhuramaaDistribution';

describe('focGhuramaaDistribution', () => {
    const creditors = [
        {
            creditorId: 'c1',
            creditorName: 'دائن أ',
            debtBeforeDistribution: 600_000,
            remainingDebt: 500_000,
        },
        {
            creditorId: 'c2',
            creditorName: 'دائن ب',
            debtBeforeDistribution: 400_000,
            remainingDebt: 300_000,
        },
    ];

    it('buildGhuramaaContext rejects zero trust balance', () => {
        const ctx = buildGhuramaaContext(creditors, 0);
        expect(ctx.canOpen).toBe(false);
        expect(ctx.note).toContain('الأمانات');
    });

    it('buildGhuramaaContext accepts eligible creditors with trust', () => {
        const ctx = buildGhuramaaContext(creditors, 200_000);
        expect(ctx.canOpen).toBe(true);
        expect(ctx.eligible).toHaveLength(2);
        expect(ctx.available).toBe(200_000);
    });

    it('equal split distributes full trust without remainder', () => {
        const ctx = buildGhuramaaContext(creditors, 100_000);
        const inputs = buildGhuramaaEqualSplitInputs(ctx.eligible, ctx.available);
        const result = computeGhuramaaManualDistribution({
            context: ctx,
            shareInputs: inputs,
            splitMode: 'equal',
        });
        expect(result.ok).toBe(true);
        expect(result.sum).toBe(100_000);
        expect(result.remainingAfter).toBe(0);
    });

    it('manual mode rejects share above remaining debt', () => {
        const ctx = buildGhuramaaContext(creditors, 600_000);
        const result = computeGhuramaaManualDistribution({
            context: ctx,
            shareInputs: { c1: '550,000', c2: '0' },
            splitMode: 'manual',
        });
        expect(result.ok).toBe(false);
        expect(result.validationNote).toContain('دينه المتبقي');
    });

    it('manual mode allows partial trust remainder', () => {
        const ctx = buildGhuramaaContext(creditors, 200_000);
        const result = computeGhuramaaManualDistribution({
            context: ctx,
            shareInputs: { c1: '100,000', c2: '50,000' },
            splitMode: 'manual',
        });
        expect(result.ok).toBe(true);
        expect(result.partialWarning).toBeTruthy();
        expect(result.remainingAfter).toBe(50_000);
    });
});
