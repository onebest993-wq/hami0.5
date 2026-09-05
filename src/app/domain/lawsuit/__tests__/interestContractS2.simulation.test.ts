/**
 * محاكاة سيناريو 2: فوز الشخص الثالث الاختصامي (THIRD_FULL).
 * المدعي يستأنف؛ الاختصامي ينتظر؛ (3) غيابي → اعتراض + استئخار.
 */
import { describe, expect, it } from 'vitest';
import { filterAppellantPartiesByChallengeMethod } from '@/app/domain/lawsuit/challengeAppellantEligibility';
import { shouldSpawnIndependentChallengeDossier } from '@/app/domain/lawsuit/independentChallengeDossier';
import {
    canOfferArt172AppealStay,
    isGhayabiObjectionPending,
} from '@/app/components/lawyer/smart-modal/smartFile/art172AppealStay';
import { filterAppellantsByAppealInterest } from '@/app/components/lawyer/smart-modal/smartFile/appealInterestEligibility';
import {
    isInterpleaderRequestAnswered,
    resolveAppealDossierMode,
} from '@/app/components/lawyer/smart-modal/smartFile/interpleaderAppealEngine';
import {
    INTERPLEADER_JUDGMENT_THIRD_FULL,
    resolveInterpleaderHadoriAppealRights,
} from '@/app/components/lawyer/smart-modal/smartFile/interpleaderJudgmentEngine';
import {
    IC_MIXED_D3_GHIABI,
    IC_PARTIES,
    IC_PLAINTIFF,
    IC_INTERPLEADER,
    icAppealRoll,
    icFirstInstance,
    icObjectionPending,
} from './interestContractFixtures';

describe('عقد المصلحة S2 — محاكاة فوز الاختصامي', () => {
    describe('يطابق العقد', () => {
        it('حقوق المصلحة: اختصامي ينتظر، مدعي يطعن، مدعى عليه ينتظر', () => {
            expect(
                resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_THIRD_FULL, 'interpleader')
                    .action,
            ).toBe('wait_opponent');
            expect(
                resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_THIRD_FULL, 'plaintiff')
                    .action,
            ).toBe('self_appeal');
            expect(
                resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_THIRD_FULL, 'defendant')
                    .action,
            ).toBe('wait_opponent');
            expect(isInterpleaderRequestAnswered(INTERPLEADER_JUDGMENT_THIRD_FULL)).toBe(true);
        });

        it('وضع الإضبارة against_interpleader عندما الموكل مدعي', () => {
            expect(
                resolveAppealDossierMode(
                    INTERPLEADER_JUDGMENT_THIRD_FULL,
                    IC_PARTIES.map((p) => (p.id === 1 ? { ...p, isClient: true } : p)),
                ),
            ).toBe('against_interpleader');
        });

        it('فلتر الاعتراض يُبقي الغائب فقط — الاختصامي لا يسلك الاعتراض', () => {
            expect(
                filterAppellantPartiesByChallengeMethod(IC_PARTIES, {
                    appealType: 'اعتراض على الحكم الغيابي',
                    dispositions: IC_MIXED_D3_GHIABI,
                }).map((p) => p.id),
            ).toEqual([4]);
        });

        it('استئخار 172 عند اعتراض (3) القائم', () => {
            const stages = [
                icFirstInstance({ lastJudgmentType: INTERPLEADER_JUDGMENT_THIRD_FULL }),
                icAppealRoll({
                    parties: [
                        { ...IC_PLAINTIFF, role: 'المستأنف (المدعي)', isClient: true, side: 'right' },
                        {
                            ...IC_INTERPLEADER,
                            role: 'المستأنف عليه (شخص ثالث اختصامي)',
                            side: 'left',
                        },
                    ],
                }),
                icObjectionPending(),
            ];
            expect(isGhayabiObjectionPending({ stages })).toBe(true);
            expect(
                canOfferArt172AppealStay({
                    currentStage: stages[1],
                    stages,
                    parentIntegrity: 'indivisible',
                }),
            ).toBe(true);
        });

        it('بعد فوز المعترض ضد الاختصامي: استقلال استئناف الاختصامي/المدعي عند الإبطال', () => {
            const stages = [
                icFirstInstance({ lastJudgmentType: INTERPLEADER_JUDGMENT_THIRD_FULL }),
                icAppealRoll({ isSuspended: true }),
                icObjectionPending({
                    finalDecision: 'تعديل الحكم الغيابي — يحق لموكلك الطعن',
                    isPleadingsClosed: true,
                }),
            ];
            expect(
                shouldSpawnIndependentChallengeDossier({
                    stages,
                    sourceStage: stages[2],
                    appealType: 'استئناف',
                }),
            ).toBe(true);
        });
    });

    describe('مصلحة الطعن', () => {
        it('يسقط المدعى عليهما والاختصامي الكاسبين من مسار الاستئناف المختلط؛ المدعي يبقى عند تمريره', () => {
            const byPresence = filterAppellantPartiesByChallengeMethod(IC_PARTIES, {
                appealType: 'استئناف',
                dispositions: IC_MIXED_D3_GHIABI,
            });
            expect(byPresence.map((p) => p.id).sort()).toEqual([2, 3, 4, 5]);
            expect(
                filterAppellantsByAppealInterest(byPresence, {
                    appealType: 'استئناف',
                    judgmentType: INTERPLEADER_JUDGMENT_THIRD_FULL,
                }),
            ).toEqual([]);
            expect(
                filterAppellantsByAppealInterest([IC_PLAINTIFF], {
                    appealType: 'استئناف',
                    judgmentType: INTERPLEADER_JUDGMENT_THIRD_FULL,
                }).map((p) => p.id),
            ).toEqual([1]);
        });
    });
});
