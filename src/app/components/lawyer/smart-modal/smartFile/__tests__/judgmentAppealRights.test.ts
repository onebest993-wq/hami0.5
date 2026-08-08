import { describe, expect, it } from 'vitest';
import { INTERPLEADER_JUDGMENT_PLAINTIFF_FULL } from '../interpleaderJudgmentEngine';
import { resolveAbsentObjectionAppealRights } from '../absentJudgmentAppealRights';
import {
    isDefendantOnlyCassationJudgmentType,
    isFirstInstanceStageName,
    isPlaintiffFavorableFinalDecision,
    isAwaitingOpponentAppeal,
    shouldShowOpponentAppealRegisterButton,
    resolveLawyerSide,
    resolveFirstInstanceHadoriAppealRights,
    resolveJudgmentAppealHintForLawyer,
    resolveAllowedOpponentAppealMethods,
    JUDGMENT_TYPE_WAIVER,
} from '../judgmentTypes';

describe('judgmentAppealRights', () => {
    it('excludes extraordinary pleading stages from first-instance classification', () => {
        expect(isFirstInstanceStageName('بداءة بدرجة أولى')).toBe(true);
        expect(isFirstInstanceStageName('إعادة المحاكمة')).toBe(false);
        expect(isFirstInstanceStageName('اعتراض الغير')).toBe(false);
        expect(isFirstInstanceStageName('اعتراض على الحكم الغيابي')).toBe(false);
        expect(isFirstInstanceStageName('أحوال شخصية')).toBe(false);
    });

    it('treats win, sulh, and waiver as defendant-only cassation outcomes', () => {
        expect(isDefendantOnlyCassationJudgmentType('إجابة الدعوى بالكامل')).toBe(true);
        expect(isDefendantOnlyCassationJudgmentType('الصلح')).toBe(true);
        expect(isDefendantOnlyCassationJudgmentType(JUDGMENT_TYPE_WAIVER)).toBe(true);
        expect(isDefendantOnlyCassationJudgmentType('إبطال')).toBe(false);
        expect(isDefendantOnlyCassationJudgmentType('رد الدعوى كلياً')).toBe(false);
    });

    it('detects awaiting opponent appeal state', () => {
        expect(isAwaitingOpponentAppeal('محسومة لصالح الموكل - بانتظار الطعن')).toBe(true);
        expect(isAwaitingOpponentAppeal('محسومة لصالح الموكل - بانتظار تمييز الخصم')).toBe(true);
        expect(isAwaitingOpponentAppeal('إجابة الدعوى بالكامل — ختم الإضبارة')).toBe(false);
    });

    it('shows opponent appeal register button after wait save', () => {
        expect(
            shouldShowOpponentAppealRegisterButton(
                {
                    isPleadingsClosed: true,
                    awaitingOpponentAppeal: true,
                    appealDeadline: '2026-07-01',
                    finalDecision: 'محسومة لصالح الموكل - بانتظار الطعن',
                    stageName: 'البداءة',
                    status: 'active',
                },
                'بانتظار الطعن',
            ),
        ).toBe(true);
        expect(
            shouldShowOpponentAppealRegisterButton(
                {
                    isPleadingsClosed: true,
                    appealDeadline: '2026-07-01',
                    finalDecision: 'محسومة لصالح الموكل - بانتظار الطعن',
                    stageName: 'أحوال شخصية',
                    status: 'active',
                },
                'بانتظار الطعن',
                'وكيل المدعي',
            ),
        ).toBe(true);
        expect(
            shouldShowOpponentAppealRegisterButton(
                {
                    isPleadingsClosed: true,
                    appealDeadline: '2026-07-01',
                    finalDecision: 'محسومة لصالح الموكل - بانتظار الطعن',
                },
                'بانتظار الطعن',
            ),
        ).toBe(true);
        expect(
            shouldShowOpponentAppealRegisterButton(
                { isPleadingsClosed: true, appealDeadline: '2026-07-01', finalDecision: '' },
                'بانتظار طعن الخصم',
            ),
        ).toBe(true);
        expect(
            shouldShowOpponentAppealRegisterButton(
                {
                    isPleadingsClosed: true,
                    appealDeadline: '2026-07-01',
                    finalDecision: 'محسومة ضد الموكل - بانتظار الطعن',
                },
                'بانتظار الطعن',
            ),
        ).toBe(false);
        expect(
            shouldShowOpponentAppealRegisterButton(
                { isPleadingsClosed: true, finalDecision: 'مكتسبة الدرجة القطعية' },
                'نشطة',
            ),
        ).toBe(false);
    });

    it('detects plaintiff-favorable sealed decisions', () => {
        expect(isPlaintiffFavorableFinalDecision('إجابة الدعوى بالكامل — ختم الإضبارة')).toBe(true);
        expect(isPlaintiffFavorableFinalDecision('مكتسبة الدرجة القطعية')).toBe(true);
        expect(isPlaintiffFavorableFinalDecision('رد الدعوى (حكم ضد الموكل)')).toBe(false);
    });

    it('infers lawyer side from client party when representedParty unset', () => {
        expect(
            resolveLawyerSide(null, [{ role: 'المدعي', name: 'أحمد', isClient: true }]),
        ).toBe('المدعي');
        expect(
            resolveLawyerSide(null, [{ role: 'المدعى عليه', name: 'علي', isClient: true }]),
        ).toBe('المدعى عليه');
        expect(
            resolveLawyerSide(null, [
                { id: 1, role: 'صفة اطرف الأول', name: 'أحمد', isClient: true, side: 'right' },
            ]),
        ).toBe('المدعي');
        expect(resolveLawyerSide('المدعي', [])).toBe('المدعي');
    });

    describe('resolveFirstInstanceHadoriAppealRights', () => {
        it('full win: plaintiff waits, defendant appeals', () => {
            expect(
                resolveFirstInstanceHadoriAppealRights('إجابة الدعوى بالكامل', 'المدعي').action,
            ).toBe('wait_opponent');
            expect(
                resolveFirstInstanceHadoriAppealRights('إجابة الدعوى بالكامل', 'المدعى عليه').action,
            ).toBe('self_appeal');
        });

        it('full loss: plaintiff appeals, defendant waits', () => {
            expect(
                resolveFirstInstanceHadoriAppealRights('رد الدعوى كلياً', 'المدعي').action,
            ).toBe('self_appeal');
            expect(
                resolveFirstInstanceHadoriAppealRights('رد الدعوى كلياً', 'المدعى عليه').action,
            ).toBe('wait_opponent');
        });

        it('partial loss: both sides may appeal', () => {
            expect(
                resolveFirstInstanceHadoriAppealRights('رد الدعوى جزئياً', 'المدعي').action,
            ).toBe('self_appeal');
            expect(
                resolveFirstInstanceHadoriAppealRights('رد الدعوى جزئياً', 'المدعى عليه').action,
            ).toBe('self_appeal');
        });

        it('sulh and waiver finalize without appeal', () => {
            expect(
                resolveFirstInstanceHadoriAppealRights('الصلح', 'المدعي').action,
            ).toBe('finalize_non_merit');
            expect(
                resolveFirstInstanceHadoriAppealRights(JUDGMENT_TYPE_WAIVER, 'المدعى عليه').action,
            ).toBe('finalize_non_merit');
        });

        it('appeal hints reflect lawyer side for standard outcomes', () => {
            expect(
                resolveJudgmentAppealHintForLawyer('إجابة الدعوى بالكامل', 'المدعي'),
            ).toContain('لا يحق');
            expect(
                resolveJudgmentAppealHintForLawyer('إجابة الدعوى بالكامل', 'المدعى عليه'),
            ).toContain('يحق');
            expect(
                resolveJudgmentAppealHintForLawyer('رد الدعوى كلياً', 'المدعي'),
            ).toContain('يحق');
            expect(
                resolveJudgmentAppealHintForLawyer('رد الدعوى كلياً', 'المدعى عليه'),
            ).toContain('لا يحق');
        });

        it('resolves interpleader merit judgment from client marker without interpleader lawyer', () => {
            const parties = [
                { id: 1, name: 'مدعي', role: 'المدعي', isClient: true },
                { id: 2, name: 'مدعى', role: 'المدعى عليه', isClient: false },
                { id: 3, name: 'ثالث', role: 'شخص ثالث (اختصامي)', isClient: false },
            ];
            expect(
                resolveFirstInstanceHadoriAppealRights(
                    'الحكم للشخص الثالث الاختصامي (بطلباته)',
                    null,
                    { parties },
                ).action,
            ).toBe('self_appeal');
        });

        it('waits for opponent when marked plaintiff wins interpleader judgment', () => {
            const parties = [
                { id: 1, name: 'مدعي', role: 'صفة اطرف الأول', isClient: true, side: 'right' as const },
                { id: 2, name: 'مدعى', role: 'المدعى عليه', isClient: false, side: 'left' as const },
                { id: 3, name: 'ثالث', role: 'شخص ثالث (اختصامي)', isClient: false },
            ];
            expect(
                resolveFirstInstanceHadoriAppealRights(
                    INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
                    null,
                    { parties },
                ).action,
            ).toBe('wait_opponent');
        });

        it('offers both paths when interpleader judgment has no client side yet', () => {
            const parties = [
                { id: 1, name: 'مدعي', role: 'المدعي', isClient: false },
                { id: 3, name: 'ثالث', role: 'شخص ثالث (اختصامي)', isClient: false },
            ];
            expect(
                resolveFirstInstanceHadoriAppealRights(
                    'الحكم للشخص الثالث الاختصامي (بطلباته)',
                    null,
                    { parties },
                ).action,
            ).toBe('both_paths');
        });

        it('finalizes interpleader sulh without requiring file settings', () => {
            const parties = [
                { id: 1, name: 'مدعي', role: 'المدعي', isClient: true },
                { id: 3, name: 'ثالث', role: 'شخص ثالث (اختصامي)', isClient: false },
            ];
            expect(
                resolveFirstInstanceHadoriAppealRights('الصلح', null, { parties }).action,
            ).toBe('finalize_non_merit');
        });
    });

    describe('resolveAllowedOpponentAppealMethods', () => {
        it('plaintiff lawyer waits after absent-objection uphold (إجابة الدعوى بالكامل)', () => {
            const objectedParties = [
                {
                    id: 1,
                    name: 'موكل',
                    role: 'المعترض عليه بالحكم الغيابي (المدعي)',
                    isClient: true,
                },
            ];
            const objectorParties = [
                {
                    id: 2,
                    name: 'موكل',
                    role: 'المعترض على الحكم الغيابي (المدعى عليه)',
                    isClient: true,
                },
            ];
            expect(
                resolveAbsentObjectionAppealRights('إجابة الدعوى بالكامل', objectedParties).action,
            ).toBe('wait_opponent');
            expect(
                resolveAbsentObjectionAppealRights('إجابة الدعوى بالكامل', objectorParties).action,
            ).toBe('self_appeal');
            expect(
                resolveFirstInstanceHadoriAppealRights('إجابة الدعوى بالكامل', 'المدعي').action,
            ).toBe('wait_opponent');
            expect(
                resolveFirstInstanceHadoriAppealRights('إجابة الدعوى بالكامل', 'المدعى عليه').action,
            ).toBe('self_appeal');
        });

        it('offers استئناف on civil absent-objection stage when بداءة exists in history', () => {
            const methods = resolveAllowedOpponentAppealMethods({
                judgmentForm: 'غيابي',
                stageName: 'الاعتراض على الحكم الغيابي',
                stages: [
                    { stageName: 'بداءة بدرجة أولى' },
                    { stageName: 'الاعتراض على الحكم الغيابي' },
                ],
            });
            expect(methods).toContain('استئناف');
            expect(methods).toContain('تمييز');
        });

        it('hides absentia objection for in-person judgment', () => {
            const methods = resolveAllowedOpponentAppealMethods({
                judgmentForm: 'حضوري',
                stageName: 'البداءة',
            });
            expect(methods).toEqual(['استئناف', 'تمييز']);
            expect(methods).not.toContain('اعتراض غيابي');
        });

        it('shows absentia objection only for default judgment', () => {
            const methods = resolveAllowedOpponentAppealMethods({
                judgmentForm: 'غيابي',
                stageName: 'البداءة',
            });
            expect(methods).toContain('اعتراض غيابي');
            expect(methods).not.toContain('اعتراض الغير');
            expect(methods).not.toContain('إعادة محاكمة');
        });

        it('hides absentia objection after objection stage already exists', () => {
            const methods = resolveAllowedOpponentAppealMethods({
                judgmentForm: 'غيابي',
                stageName: 'البداءة (اعتراض غيابي)',
                stages: [
                    { stageName: 'البداءة' },
                    { stageName: 'البداءة (اعتراض غيابي)' },
                ],
            });
            expect(methods).not.toContain('اعتراض غيابي');
            expect(methods).toContain('تمييز');
        });

        it('hides absentia objection on appeal stage', () => {
            const methods = resolveAllowedOpponentAppealMethods({
                judgmentForm: 'غيابي',
                lastJudgmentType: 'غيابي',
                stageName: 'الاستئناف',
                finalDecision: 'إجابة الدعوى بالكامل',
                stages: [{ stageName: 'البداءة' }, { stageName: 'الاستئناف' }],
            });
            expect(methods).not.toContain('اعتراض غيابي');
        });

        it('hides absentia objection when defendant won absent judgment', () => {
            const methods = resolveAllowedOpponentAppealMethods({
                judgmentForm: 'غيابي',
                stageName: 'البداءة',
                finalDecision: 'رد الدعوى كلياً',
            });
            expect(methods).not.toContain('اعتراض غيابي');
        });

        it('hides extraordinary remedies when appellate appeal is allowed', () => {
            const methods = resolveAllowedOpponentAppealMethods({
                judgmentForm: 'حضوري',
                stageName: 'الاستئناف',
            });
            expect(methods).toEqual(['تمييز']);
        });

        it('removes استئناف when claim value is within last-instance threshold', () => {
            const methods = resolveAllowedOpponentAppealMethods({
                judgmentForm: 'حضوري',
                stageName: 'البداءة',
                appealRoute: { claimValue: '1,000,000' },
            });
            expect(methods).toEqual(['تمييز']);
        });

        it('removes استئناف for undetermined-value or fixed-fee cases', () => {
            expect(
                resolveAllowedOpponentAppealMethods({
                    judgmentForm: 'حضوري',
                    stageName: 'البداءة',
                    appealRoute: { isUndeterminedValue: true },
                }),
            ).toEqual(['تمييز']);
            expect(
                resolveAllowedOpponentAppealMethods({
                    judgmentForm: 'حضوري',
                    stageName: 'البداءة',
                    appealRoute: { isFixedFee: true },
                }),
            ).toEqual(['تمييز']);
        });
    });
});
