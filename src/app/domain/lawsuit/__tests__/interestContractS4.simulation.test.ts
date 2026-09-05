/**
 * محاكاة سيناريو 4: حكم مركّب (إلزام البعض / رد بحق البعض) بعد فك التجميد.
 */
import { describe, expect, it } from 'vitest';
import { filterAppellantPartiesByChallengeMethod } from '@/app/domain/lawsuit/challengeAppellantEligibility';
import {
    canOfferArt172AppealStay,
    isGhayabiObjectionPending,
} from '@/app/components/lawyer/smart-modal/smartFile/art172AppealStay';
import { filterAppellantsByAppealInterest } from '@/app/components/lawyer/smart-modal/smartFile/appealInterestEligibility';
import {
    INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL,
    resolveInterpleaderHadoriAppealRights,
} from '@/app/components/lawyer/smart-modal/smartFile/interpleaderJudgmentEngine';
import {
    attachPartyChallengeLanes,
    LANE_STATE_WAIVED,
} from '@/app/domain/lawsuit/partyChallengeLanes';
import {
    coerceJudgmentTypeForReleasedOperatives,
    hasAnyReleasedDisposition,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';
import {
    IC_D1,
    IC_PARTIES,
    IC_PLAINTIFF,
    IC_S4_MIXED_PRESENCE,
    icAppealRoll,
    icFirstInstance,
    icObjectionPending,
} from './interestContractFixtures';

describe('عقد المصلحة S4 — مركّب bound|released', () => {
    it('حقوق جزئية: المحرك يعطي self_appeal للاختصام الجزئي (مسار اختصام مستقل)', () => {
        expect(
            resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL, 'plaintiff')
                .action,
        ).toBe('self_appeal');
        expect(
            resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL, 'defendant')
                .action,
        ).toBe('self_appeal');
        expect(
            resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL, 'interpleader')
                .action,
        ).toBe('self_appeal');
    });

    it('أي released يفرض رد جزئي حتى لو اختير إجابة كاملة', () => {
        expect(hasAnyReleasedDisposition(IC_S4_MIXED_PRESENCE)).toBe(true);
        expect(
            coerceJudgmentTypeForReleasedOperatives('إجابة الدعوى بالكامل', IC_S4_MIXED_PRESENCE),
        ).toBe('رد الدعوى جزئياً');
    });

    it('فلتر الحضور يسقط المبرَّأ (2) ويبقي الحاضر والغائب الملزَمين + الاختصامي', () => {
        expect(
            filterAppellantPartiesByChallengeMethod(IC_PARTIES, {
                appealType: 'استئناف',
                dispositions: IC_S4_MIXED_PRESENCE,
            })
                .map((p) => p.id)
                .sort(),
        ).toEqual([3, 4, 5]);
        expect(
            filterAppellantPartiesByChallengeMethod(IC_PARTIES, {
                appealType: 'اعتراض على الحكم الغيابي',
                dispositions: IC_S4_MIXED_PRESENCE,
            }).map((p) => p.id),
        ).toEqual([4]);
    });

    it('مصلحة الاستئناف: المبرَّأ لا يطعن؛ المدعي الموكل يُضم عند وجود رد فردي', () => {
        const partiesWithClientPlaintiff = IC_PARTIES.map((p) =>
            p.id === IC_PLAINTIFF.id ? { ...p, isClient: true } : p,
        );
        const byPresence = filterAppellantPartiesByChallengeMethod(partiesWithClientPlaintiff, {
            appealType: 'استئناف',
            dispositions: IC_S4_MIXED_PRESENCE,
        });
        expect(byPresence.map((p) => Number(p.id)).sort()).toEqual([1, 3, 4, 5]);

        const byInterest = filterAppellantsByAppealInterest(byPresence, {
            appealType: 'استئناف',
            judgmentType: 'رد الدعوى جزئياً',
            dispositions: IC_S4_MIXED_PRESENCE,
        });
        expect(byInterest.map((p) => Number(p.id)).sort()).toEqual([1, 3, 4, 5]);
        expect(byInterest.some((p) => Number(p.id) === Number(IC_D1.id))).toBe(false);
    });

    it('بطاقة المبرَّأ waived بلا مهلة', () => {
        const stage = attachPartyChallengeLanes(
            icFirstInstance({
                lastJudgmentType: 'رد الدعوى جزئياً',
                partyJudgmentDispositions: IC_S4_MIXED_PRESENCE,
            }),
            { dispositions: IC_S4_MIXED_PRESENCE, judgmentDate: '2026-01-10' },
        );
        const releasedLane = stage.partyChallengeLanes?.find((l) => l.partyId === '2');
        expect(releasedLane?.laneState).toBe(LANE_STATE_WAIVED);
        expect(releasedLane?.appealDeadline).toBeNull();
        expect(releasedLane?.objectionDeadline).toBeNull();
    });

    it('استئخار يعمل بوجود غيابي ملزَم + اعتراض — المبرَّأ لا يلغي م/172', () => {
        const stages = [
            icFirstInstance({
                lastJudgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL,
                partyJudgmentDispositions: IC_S4_MIXED_PRESENCE,
            }),
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

    it('EXEMPT على CaseStage ما زال مرفوضاً — الإطفاء عبر operative فقط', () => {
        const fi = icFirstInstance({
            lastJudgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL,
            partyJudgmentDispositions: IC_S4_MIXED_PRESENCE,
        });
        expect(fi.status).not.toBe('EXEMPT');
        expect(String(fi.status)).not.toMatch(/exempt/i);
    });
});
