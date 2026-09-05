/**
 * محاكاة سيناريو 3: رد الدعوى الأصلية ورد طلب التدخل (BOTH_DISMISSED).
 * المدعى عليهم كاسبون — لا طعن ولا استئخار؛ المدعي والاختصامي يستأنفان.
 */
import { describe, expect, it } from 'vitest';
import { filterAppellantPartiesByChallengeMethod } from '@/app/domain/lawsuit/challengeAppellantEligibility';
import {
    canOfferArt172AppealStay,
    isGhayabiObjectionPending,
} from '@/app/components/lawyer/smart-modal/smartFile/art172AppealStay';
import { filterAppellantsByAppealInterest } from '@/app/components/lawyer/smart-modal/smartFile/appealInterestEligibility';
import {
    isInterpleaderRequestDismissed,
    resolveAppealDossierMode,
} from '@/app/components/lawyer/smart-modal/smartFile/interpleaderAppealEngine';
import {
    INTERPLEADER_JUDGMENT_BOTH_DISMISSED,
    resolveInterpleaderHadoriAppealRights,
} from '@/app/components/lawyer/smart-modal/smartFile/interpleaderJudgmentEngine';
import {
    IC_ALL_PRESENT,
    IC_PARTIES,
    icAppealRoll,
    icFirstInstance,
} from './interestContractFixtures';

describe('عقد المصلحة S3 — محاكاة فوز المدعى عليهم', () => {
    describe('يطابق العقد', () => {
        it('حقوق المصلحة: مدعى عليه ينتظر؛ مدعي واختصامي يطعنان', () => {
            expect(
                resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_BOTH_DISMISSED, 'defendant')
                    .action,
            ).toBe('wait_opponent');
            expect(
                resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_BOTH_DISMISSED, 'plaintiff')
                    .action,
            ).toBe('self_appeal');
            expect(
                resolveInterpleaderHadoriAppealRights(INTERPLEADER_JUDGMENT_BOTH_DISMISSED, 'interpleader')
                    .action,
            ).toBe('self_appeal');
            expect(isInterpleaderRequestDismissed(INTERPLEADER_JUDGMENT_BOTH_DISMISSED)).toBe(true);
        });

        it('وضع interpleader_appellant عندما الموكل اختصامي خاسر', () => {
            expect(
                resolveAppealDossierMode(
                    INTERPLEADER_JUDGMENT_BOTH_DISMISSED,
                    IC_PARTIES.map((p) => (p.id === 5 ? { ...p, isClient: true } : p)),
                ),
            ).toBe('interpleader_appellant');
        });

        it('لا اعتراض غيابي عند تفريد حضور كامل — الفلتر لا يُبقي أحداً للاعتراض', () => {
            expect(
                filterAppellantPartiesByChallengeMethod(IC_PARTIES, {
                    appealType: 'اعتراض على الحكم الغيابي',
                    dispositions: IC_ALL_PRESENT,
                }),
            ).toEqual([]);
        });

        it('انعدام الاستئخار: لا غيابي → لا اعتراض قائم → لا عرض 172', () => {
            const stages = [
                icFirstInstance({
                    lastJudgmentType: INTERPLEADER_JUDGMENT_BOTH_DISMISSED,
                    judgmentForm: 'حضوري',
                    partyJudgmentDispositions: IC_ALL_PRESENT,
                }),
                icAppealRoll(),
            ];
            expect(isGhayabiObjectionPending({ stages })).toBe(false);
            expect(
                canOfferArt172AppealStay({
                    currentStage: stages[1],
                    stages,
                    parentIntegrity: 'indivisible',
                }),
            ).toBe(false);
        });
    });

    describe('مصلحة الطعن', () => {
        it('فلتر المصلحة يُبقي المدعي والاختصامي ويسقط المدعى عليهم الكاسبين', () => {
            const eligible = filterAppellantsByAppealInterest(
                filterAppellantPartiesByChallengeMethod(IC_PARTIES, {
                    appealType: 'استئناف',
                    dispositions: IC_ALL_PRESENT,
                }),
                {
                    appealType: 'استئناف',
                    judgmentType: INTERPLEADER_JUDGMENT_BOTH_DISMISSED,
                },
            );
            expect(eligible.map((p) => p.id).sort()).toEqual([1, 5]);
        });
    });

    describe('حدود S3', () => {
        it('fixtures بلا operative — إطفاء الكاسب عبر operative لا عبر CaseStage.EXEMPT', () => {
            const row = IC_ALL_PRESENT[0] as Record<string, unknown>;
            expect(row.operative).toBeUndefined();
            expect(row.released).toBeUndefined();
            const fi = icFirstInstance({
                partyJudgmentDispositions: IC_ALL_PRESENT,
            });
            expect(fi.status).not.toBe('EXEMPT');
        });
    });
});
