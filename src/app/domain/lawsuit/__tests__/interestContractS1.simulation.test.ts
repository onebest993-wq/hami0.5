/**
 * محاكاة سيناريو 1 من عقد المصلحة مقابل الـAPIs الحالية.
 * S1: إجابة دعوى المدعي بالكامل + رد الاختصامي + إلزام المدعى عليهم.
 */
import { describe, expect, it } from 'vitest';
import { filterAppellantPartiesByChallengeMethod } from '@/app/domain/lawsuit/challengeAppellantEligibility';
import { shouldSpawnIndependentChallengeDossier } from '@/app/domain/lawsuit/independentChallengeDossier';
import {
    ART172_STAY_CAUSE_LIFTED,
    OBJECTION_VOID_PLAINTIFF_NEW_APPEAL_NOTICE,
    classifyAbsentObjectionOutcome,
    plaintiffMustFileNewOriginalAppeal,
    resolveObjectionAppealNotices,
} from '@/app/domain/lawsuit/objectionAppealConsequence';
import { listJudgmentDispositionDefendants } from '@/app/domain/lawsuit/partyJudgmentDisposition';
import {
    canOfferArt172AppealStay,
    isGhayabiObjectionPending,
} from '@/app/components/lawyer/smart-modal/smartFile/art172AppealStay';
import { resolveFirstInstanceHadoriAppealRights } from '@/app/components/lawyer/smart-modal/smartFile/firstInstanceAppealRights';
import {
    INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
    resolveInterpleaderHadoriAppealRights,
} from '@/app/components/lawyer/smart-modal/smartFile/interpleaderJudgmentEngine';
import { canUnifyObjectionAppealIntoExisting } from '@/app/components/lawyer/smart-modal/smartFile/unifyObjectionAppealIntoExisting';
import {
    IC_MIXED_D3_GHIABI,
    IC_PARTIES,
    icAppealRoll,
    icFirstInstance,
    icObjectionPending,
} from './interestContractFixtures';

describe('عقد المصلحة S1 — محاكاة', () => {
    describe('يطابق العقد', () => {
        it('الاختصامي خارج مصفوفة الحضور/الغياب', () => {
            const defendants = listJudgmentDispositionDefendants(IC_PARTIES);
            expect(defendants.map((p) => p.id).sort()).toEqual([2, 3, 4]);
            expect(defendants.some((p) => String(p.role).includes('اختصامي'))).toBe(false);
        });

        it('مصلحة الموكل عند فوز المدعي بالكامل', () => {
            expect(
                resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, 'plaintiff')
                    .action,
            ).toBe('wait_opponent');
            expect(
                resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, 'defendant')
                    .action,
            ).toBe('self_appeal');
            expect(
                resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, 'interpleader')
                    .action,
            ).toBe('self_appeal');
        });

        it('resolveFirstInstanceHadoriAppealRights يمرّر لمحرك الاختصامي', () => {
            const asPlaintiff = resolveFirstInstanceHadoriAppealRights(
                INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
                'المدعي',
                { parties: IC_PARTIES.map((p) => (p.id === 1 ? { ...p, isClient: true } : p)) },
            );
            expect(asPlaintiff.action).toBe('wait_opponent');

            const asInterpleader = resolveFirstInstanceHadoriAppealRights(
                INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
                null,
                {
                    parties: IC_PARTIES.map((p) => (p.id === 5 ? { ...p, isClient: true } : p)),
                },
            );
            expect(asInterpleader.action).toBe('self_appeal');
        });

        it('فلتر الاعتراض يُبقي الغائب (3) فقط', () => {
            const eligible = filterAppellantPartiesByChallengeMethod(IC_PARTIES, {
                appealType: 'اعتراض على الحكم الغيابي',
                dispositions: IC_MIXED_D3_GHIABI,
            });
            expect(eligible.map((p) => p.id)).toEqual([4]);
        });

        it('فلتر الاستئناف المختلط يُبقي الحاضرين والغائب الملزَم + الاختصامي', () => {
            const eligible = filterAppellantPartiesByChallengeMethod(IC_PARTIES, {
                appealType: 'استئناف',
                dispositions: IC_MIXED_D3_GHIABI,
            });
            expect(eligible.map((p) => p.id).sort()).toEqual([2, 3, 4, 5]);
        });

        it('لا يُعرض استئخار 172 بلا اعتراض مقيد', () => {
            const stages = [
                icFirstInstance({ lastJudgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL }),
                icAppealRoll(),
            ];
            expect(
                canOfferArt172AppealStay({
                    currentStage: stages[1],
                    stages,
                    parentIntegrity: 'indivisible',
                }),
            ).toBe(false);
        });

        it('يُعرض استئخار 172 عند اعتراض غيابي قائم', () => {
            const stages = [
                icFirstInstance({ lastJudgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL }),
                icAppealRoll(),
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

        it('الاعتراض الغيابي لا يستقل عن الملف', () => {
            expect(
                shouldSpawnIndependentChallengeDossier({
                    stages: [
                        icFirstInstance({ lastJudgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL }),
                        icAppealRoll(),
                    ],
                    sourceStage: icFirstInstance(),
                    appealType: 'اعتراض على الحكم الغيابي',
                }),
            ).toBe(false);
        });

        it('بعد إبطال الحكم الغيابي: عريضة مدعي أصلية جديدة', () => {
            expect(classifyAbsentObjectionOutcome('تعديل الحكم الغيابي — يحق لموكلك الطعن')).toBe(
                'void_full',
            );
            expect(plaintiffMustFileNewOriginalAppeal('void_full')).toBe(true);
            const notices = resolveObjectionAppealNotices({
                outcome: 'void_full',
                clientRole: 'objected',
                stayActive: true,
                objectionResolved: true,
                indivisible: true,
                clientIsPresentAppellant: false,
            });
            expect(notices).toContain(ART172_STAY_CAUSE_LIFTED);
            expect(notices).toContain(OBJECTION_VOID_PLAINTIFF_NEW_APPEAL_NOTICE);
        });

        it('من الاعتراض مع رول مستخرج وإبطال: باب استقلال الاستئناف (انقلاب مراكز)', () => {
            const stages = [
                icFirstInstance({ lastJudgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL }),
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

    describe('فجوات صريحة (لا تُخفى)', () => {
        it('S1 fixtures بلا مفتاح operative — التطبيع يفترض bound', () => {
            const row = IC_MIXED_D3_GHIABI[0] as Record<string, unknown>;
            expect(row.operative).toBeUndefined();
            expect(
                IC_MIXED_D3_GHIABI.every((d) => !('operative' in d)),
            ).toBe(true);
        });

        it('بعد التأييد مع رول قائم: استقلال الطعن اللاحق (لا ضم/متقابل)', () => {
            const stagesUphold = [
                icFirstInstance({ lastJudgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL }),
                icAppealRoll(),
                icObjectionPending({
                    finalDecision: 'تأييد الحكم الغيابي — بانتظار طعن المعترض',
                    isPleadingsClosed: true,
                }),
            ];
            expect(
                shouldSpawnIndependentChallengeDossier({
                    stages: stagesUphold,
                    sourceStage: stagesUphold[2],
                    appealType: 'استئناف',
                }),
            ).toBe(true);
            // التوحيد اليدوي يبقى خياراً صريحاً للمحامي إن أراد
            expect(
                canUnifyObjectionAppealIntoExisting({
                    stages: stagesUphold,
                    sourceStage: stagesUphold[2],
                    appealType: 'استئناف',
                }),
            ).toBe(true);
        });
    });
});
