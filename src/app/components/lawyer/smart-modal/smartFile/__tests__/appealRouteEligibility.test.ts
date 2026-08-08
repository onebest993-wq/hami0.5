import { describe, expect, it } from 'vitest';
import {
    APPELLATE_CLAIM_THRESHOLD_IQD,
    findFirstInstanceBasisStage,
    filterMethodsForAppealRoute,
    inferRetrialTargetStageLabel,
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

    it('blocks appellate appeal for last-instance stage label when value is within threshold', () => {
        expect(isAppellateAppealAllowed({ stageName: 'البداءة بدرجة أخيرة', claimValue: '500,000' })).toBe(
            false,
        );
    });

    it('allows appellate appeal for last-instance label when quantified value exceeds threshold', () => {
        expect(isAppellateAppealAllowed({ stageName: 'بداءة بدرجة أخيرة', claimValue: '2,000,000' })).toBe(
            true,
        );
    });

    it('parses Arabic-Indic claim values', () => {
        expect(parseClaimValueIqd('٢٬٥٠٠٬٠٠٠')).toBe(2_500_000);
        expect(
            isAppellateAppealAllowed({ stageName: 'البداءة', claimValue: '٢٬٥٠٠٬٠٠٠' }),
        ).toBe(true);
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
        expect(ctx.claimValue).toBe('3,000,000');
        expect(ctx.isUndeterminedValue).toBe(false);
        expect(isAppellateAppealAllowed(ctx)).toBe(true);
    });

    it('allows appellate appeal when file claim exceeds threshold despite stale last-instance stage', () => {
        const ctx = resolveAppealRouteContext(
            {
                claimValue: '2,500,000',
                currentStage: 'بداءة بدرجة أخيرة',
                isUndeterminedValue: true,
            },
            { stageName: 'البداءة', isUndeterminedValue: true },
        );
        expect(isAppellateAppealAllowed(ctx)).toBe(true);
    });

    it('prefers active first-instance stage over stale last-instance currentStage label', () => {
        expect(
            resolveAppealEffectiveStage({
                currentStage: 'بداءة بدرجة أخيرة',
                stageName: 'البداءة',
            }),
        ).toBe('البداءة');
    });

    it('resolves claim value from lawsuit file details fallback', () => {
        const ctx = resolveAppealRouteContext(
            {
                details: { claimValue: '3,000,000' },
                currentStage: 'بداءة بدرجة أخيرة',
                isUndeterminedValue: true,
            },
            { stageName: 'بداءة بدرجة أخيرة', isUndeterminedValue: true },
        );
        expect(ctx.claimValue).toBe('3,000,000');
        expect(isAppellateAppealAllowed(ctx)).toBe(true);
    });

    it('resolves claim value from lawsuit file root and stages', () => {
        const ctx = resolveAppealRouteContext(
            {
                claimValue: '3,000,000',
                currentStage: 'البداءة',
                stages: [{ claimValue: '500,000', stageName: 'البداءة' }],
            },
            { stageName: 'البداءة', claimValue: '800,000' },
        );
        expect(ctx.claimValue).toBe('3,000,000');
        expect(isAppellateAppealAllowed(ctx)).toBe(true);
    });

    it('allows appellate appeal when file claim exceeds threshold despite stale stage flags', () => {
        const ctx = resolveAppealRouteContext(
            { claimValue: '2,500,000', isUndeterminedValue: false },
            { isUndeterminedValue: true, isFixedFee: true, stageName: 'البداءة' },
        );
        expect(isAppellateAppealAllowed(ctx)).toBe(true);
        expect(filterMethodsForAppealRoute(['استئناف', 'تمييز'], ctx)).toEqual(['استئناف', 'تمييز']);
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

    it('inferRetrialTargetStageLabel prefers locked basis stage over stale file retrialTargetStage', () => {
        const stages = [
            {
                id: 's1',
                stageName: 'بداءة بدرجة أولى',
                status: 'locked',
            },
            {
                id: 's2',
                stageName: 'الاعتراض على الحكم الغيابي',
                status: 'active',
            },
        ];
        const basis = findFirstInstanceBasisStage(stages, stages[1]!);
        expect(
            inferRetrialTargetStageLabel('بداءة بدرجة أخيرة', basis, stages[1]!),
        ).toBe('بداءة بدرجة أولى');
    });

    it('resolveAppealRouteContext uses activeStage for extraordinary procedure inference', () => {
        const stages = [
            {
                id: 's1',
                stageName: 'بداءة بدرجة أولى',
                status: 'locked',
                claimValue: '2,500,000',
            },
            {
                id: 's2',
                stageName: 'الاعتراض على الحكم الغيابي',
                status: 'active',
                claimValue: '2,500,000',
                appealMetadata: { previousStage: 'بداءة بدرجة أولى' },
            },
        ];
        const ctx = resolveAppealRouteContext(
            {
                currentStage: 'الاعتراض على الحكم الغيابي',
                retrialTargetStage: 'بداءة بدرجة أخيرة',
                isUndeterminedValue: true,
                stages,
                activeStage: stages[1],
            },
            stages[0],
        );
        expect(ctx.retrialTargetStage).toBe('بداءة بدرجة أولى');
        expect(isAppellateAppealAllowed(ctx)).toBe(true);
        expect(filterMethodsForAppealRoute(['استئناف', 'تمييز'], ctx)).toEqual([
            'استئناف',
            'تمييز',
        ]);
    });

    it('absent objection stage: allows appellate appeal when underlying value exceeds threshold', () => {
        const stages = [
            {
                id: 's1',
                stageName: 'بداءة بدرجة أولى',
                status: 'locked',
                claimValue: '2,500,000',
            },
            {
                id: 's2',
                stageName: 'الاعتراض على الحكم الغيابي',
                status: 'active',
                claimValue: '2,500,000',
                appealMetadata: { previousStage: 'بداءة بدرجة أولى' },
            },
        ];
        const basis = findFirstInstanceBasisStage(stages, stages[1]!);
        expect(String(basis?.stageName ?? basis?.name ?? '')).toBe('بداءة بدرجة أولى');

        const ctx = resolveAppealRouteContext(
            {
                currentStage: 'الاعتراض على الحكم الغيابي',
                retrialTargetStage: 'بداءة بدرجة أخيرة',
                isUndeterminedValue: true,
                stages,
            },
            stages[1],
        );
        expect(ctx.retrialTargetStage).toBe('بداءة بدرجة أولى');
        expect(isAppellateAppealAllowed(ctx)).toBe(true);
        expect(filterMethodsForAppealRoute(['استئناف', 'تمييز'], ctx)).toEqual([
            'استئناف',
            'تمييز',
        ]);
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
