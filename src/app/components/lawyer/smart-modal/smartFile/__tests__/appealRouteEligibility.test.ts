import { describe, expect, it } from 'vitest';
import {
    APPELLATE_CLAIM_THRESHOLD_IQD,
    filterMethodsForAppealRoute,
    isAppellateAppealAllowed,
    parseClaimValueIqd,
    resolveAppealEffectiveStage,
    resolveAppealRouteContext,
    resolveCassationOnlyHint,
} from '../appealRouteEligibility';

describe('appealRouteEligibility', () => {
    it('parses formatted claim values', () => {
        expect(parseClaimValueIqd('1,000,000')).toBe(1_000_000);
        expect(parseClaimValueIqd('500000')).toBe(500_000);
        expect(parseClaimValueIqd('')).toBe(0);
    });

    it('blocks appellate appeal when claim value is at or below threshold', () => {
        expect(
            isAppellateAppealAllowed({ claimValue: String(APPELLATE_CLAIM_THRESHOLD_IQD) }),
        ).toBe(false);
        expect(isAppellateAppealAllowed({ claimValue: '500,000' })).toBe(false);
        expect(isAppellateAppealAllowed({ claimValue: '1,500,000' })).toBe(true);
    });

    it('blocks appellate appeal for undetermined value or fixed fee flags', () => {
        expect(isAppellateAppealAllowed({ isUndeterminedValue: true, claimValue: '5,000,000' })).toBe(
            false,
        );
        expect(isAppellateAppealAllowed({ isFixedFee: true, claimValue: '5,000,000' })).toBe(false);
    });

    it('blocks appellate appeal for last-instance stage label', () => {
        expect(isAppellateAppealAllowed({ stageName: 'البداءة بدرجة أخيرة', claimValue: '2,000,000' })).toBe(
            false,
        );
    });

    it('filters out استئناف when appellate appeal is not allowed', () => {
        const methods = filterMethodsForAppealRoute(
            ['اعتراض غيابي', 'استئناف', 'تمييز'],
            { claimValue: '800,000' },
        );
        expect(methods).toEqual(['اعتراض غيابي', 'تمييز']);
    });

    it('keeps all methods when appellate appeal is allowed', () => {
        const methods = filterMethodsForAppealRoute(['استئناف', 'تمييز'], { claimValue: '2,000,000' });
        expect(methods).toEqual(['استئناف', 'تمييز']);
    });

    it('resolves context from file and first-instance stage', () => {
        const ctx = resolveAppealRouteContext(
            {
                claimValue: '3,000,000',
                isUndeterminedValue: false,
                isFixedFee: false,
                currentStage: 'البداءة',
            },
            {
                claimValue: '1,000,000',
                isUndeterminedValue: true,
                stageName: 'البداءة',
            },
        );
        expect(ctx.claimValue).toBe('1,000,000');
        expect(ctx.isUndeterminedValue).toBe(true);
        expect(ctx.stageName).toBe('البداءة');
    });

    it('returns cassation-only hint for low value claims', () => {
        const hint = resolveCassationOnlyHint({ claimValue: '1,000,000' });
        expect(hint).toContain('تمييز');
        expect(hint).toContain('القيمة التقديرية');
    });

    it('extraordinary procedure: inherits appeal rules from retrialTargetStage', () => {
        expect(
            resolveAppealEffectiveStage({
                currentStage: 'اعتراض على الحكم الغيابي',
                retrialTargetStage: 'بداءة بدرجة أخيرة',
            }),
        ).toBe('بداءة بدرجة أخيرة');

        expect(
            isAppellateAppealAllowed({
                currentStage: 'اعتراض الغير',
                retrialTargetStage: 'بداءة بدرجة أخيرة',
            }),
        ).toBe(false);

        expect(
            isAppellateAppealAllowed({
                currentStage: 'اعتراض الغير',
                retrialTargetStage: 'بداءة بدرجة أولى',
            }),
        ).toBe(true);
    });

    it('retrial: inherits appeal rules from retrialTargetStage', () => {
        expect(
            resolveAppealEffectiveStage({
                currentStage: 'إعادة المحاكمة',
                retrialTargetStage: 'بداءة بدرجة أخيرة',
            }),
        ).toBe('بداءة بدرجة أخيرة');

        expect(
            isAppellateAppealAllowed({
                currentStage: 'إعادة المحاكمة',
                retrialTargetStage: 'بداءة بدرجة أخيرة',
            }),
        ).toBe(false);

        expect(
            isAppellateAppealAllowed({
                currentStage: 'إعادة المحاكمة',
                retrialTargetStage: 'استئناف',
            }),
        ).toBe(false);

        expect(
            isAppellateAppealAllowed({
                currentStage: 'إعادة المحاكمة',
                retrialTargetStage: 'بداءة بدرجة أولى',
            }),
        ).toBe(true);

        const methods = filterMethodsForAppealRoute(
            ['استئناف', 'تمييز'],
            {
                currentStage: 'إعادة المحاكمة',
                retrialTargetStage: 'بداءة بدرجة أخيرة',
            },
        );
        expect(methods).toEqual(['تمييز']);
    });

    it('resolveAppealRouteContext passes retrialTargetStage from file', () => {
        const ctx = resolveAppealRouteContext({
            currentStage: 'إعادة المحاكمة',
            retrialTargetStage: 'بداءة بدرجة أولى',
        });
        expect(ctx.retrialTargetStage).toBe('بداءة بدرجة أولى');
        expect(ctx.currentStage).toBe('إعادة المحاكمة');
    });
});
