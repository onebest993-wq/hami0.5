/**
 * مصفوفة شاملة: دخول الشخص الثالث الاختصامي × كل نتائج الحكم × كل المراكز.
 * محاكاة مقابل الـAPIs الإنتاجية — توثيق السلوك والتأثير على الطعن/الاستئخار/الاستقلال.
 */
import { describe, expect, it } from 'vitest';
import { filterAppellantPartiesByChallengeMethod } from '@/app/domain/lawsuit/challengeAppellantEligibility';
import { shouldSpawnIndependentChallengeDossier } from '@/app/domain/lawsuit/independentChallengeDossier';
import { listJudgmentDispositionDefendants } from '@/app/domain/lawsuit/partyJudgmentDisposition';
import {
    canOfferArt172AppealStay,
    isGhayabiObjectionPending,
} from '@/app/components/lawyer/smart-modal/smartFile/art172AppealStay';
import {
    filterAppellantsByAppealInterest,
    partyHasMeritAppealInterest,
    resolvePartyAppealInterestBucket,
} from '@/app/components/lawyer/smart-modal/smartFile/appealInterestEligibility';
import {
    isInterpleaderRequestAnswered,
    isInterpleaderRequestDismissed,
    resolveAppealDossierMode,
} from '@/app/components/lawyer/smart-modal/smartFile/interpleaderAppealEngine';
import {
    INTERPLEADER_JUDGMENT_BOTH_DISMISSED,
    INTERPLEADER_JUDGMENT_FORMAL_NULLITY,
    INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
    INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL,
    INTERPLEADER_JUDGMENT_THIRD_FULL,
    INTERPLEADER_JUDGMENT_THIRD_PARTIAL,
    interpleaderClientAwaitingOpponentAppeal,
    interpleaderOriginalClaimOutcome,
    resolveInterpleaderHadoriAppealRights,
    type LawyerJudgmentBucket,
} from '@/app/components/lawyer/smart-modal/smartFile/interpleaderJudgmentEngine';
import {
    IC_MIXED_D3_GHIABI,
    IC_PARTIES,
    IC_ALL_PRESENT,
    icAppealRoll,
    icFirstInstance,
    icObjectionPending,
} from './interestContractFixtures';

const BUCKETS: LawyerJudgmentBucket[] = ['plaintiff', 'defendant', 'interpleader'];

type Action = 'wait_opponent' | 'self_appeal' | 'archive_void' | 'both_paths' | 'finalize_non_merit';

/** العقد التشغيلي الحالي كما يُنفَّذ في المحرك (مصدر الحقيقة للاختبار). */
const RIGHTS_MATRIX: Record<string, Record<LawyerJudgmentBucket, Action>> = {
    [INTERPLEADER_JUDGMENT_PLAINTIFF_FULL]: {
        plaintiff: 'wait_opponent',
        defendant: 'self_appeal',
        interpleader: 'self_appeal',
    },
    [INTERPLEADER_JUDGMENT_THIRD_FULL]: {
        plaintiff: 'self_appeal',
        defendant: 'wait_opponent',
        interpleader: 'wait_opponent',
    },
    [INTERPLEADER_JUDGMENT_BOTH_DISMISSED]: {
        plaintiff: 'self_appeal',
        defendant: 'wait_opponent',
        interpleader: 'self_appeal',
    },
    [INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL]: {
        plaintiff: 'self_appeal',
        defendant: 'self_appeal',
        interpleader: 'self_appeal',
    },
    [INTERPLEADER_JUDGMENT_THIRD_PARTIAL]: {
        plaintiff: 'self_appeal',
        defendant: 'wait_opponent',
        interpleader: 'self_appeal',
    },
    [INTERPLEADER_JUDGMENT_FORMAL_NULLITY]: {
        plaintiff: 'archive_void',
        defendant: 'archive_void',
        interpleader: 'archive_void',
    },
};

const ORIGINAL_CLAIM: Record<string, 'full_win' | 'partial_win' | 'full_loss' | 'neutral'> = {
    [INTERPLEADER_JUDGMENT_PLAINTIFF_FULL]: 'full_win',
    [INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL]: 'partial_win',
    [INTERPLEADER_JUDGMENT_THIRD_FULL]: 'full_loss',
    [INTERPLEADER_JUDGMENT_THIRD_PARTIAL]: 'full_loss',
    [INTERPLEADER_JUDGMENT_BOTH_DISMISSED]: 'full_loss',
    [INTERPLEADER_JUDGMENT_FORMAL_NULLITY]: 'neutral',
};

function markClient(bucket: LawyerJudgmentBucket) {
    const id = bucket === 'plaintiff' ? 1 : bucket === 'defendant' ? 2 : 5;
    return IC_PARTIES.map((p) => ({ ...p, isClient: p.id === id }));
}

describe('مصفوفة شاملة — شخص ثالث اختصامي × النتائج × المراكز', () => {
    it('ثابت بنيوي: الاختصامي خارج تفريد الحضور/الغياب دائماً', () => {
        const defendants = listJudgmentDispositionDefendants(IC_PARTIES);
        expect(defendants.map((p) => p.id).sort()).toEqual([2, 3, 4]);
        expect(resolvePartyAppealInterestBucket(IC_PARTIES[4]!)).toBe('interpleader');
    });

    it.each(Object.keys(RIGHTS_MATRIX))(
        'حقوق الطعن لكل مركز — %s',
        (judgmentType) => {
            for (const bucket of BUCKETS) {
                const expected = RIGHTS_MATRIX[judgmentType]![bucket]!;
                expect(
                    resolveInterpleaderHadoriAppealRights(judgmentType, bucket).action,
                    `${judgmentType} / ${bucket}`,
                ).toBe(expected);
                const party = IC_PARTIES.find((p) =>
                    bucket === 'plaintiff'
                        ? p.id === 1
                        : bucket === 'defendant'
                          ? p.id === 2
                          : p.id === 5,
                )!;
                expect(
                    partyHasMeritAppealInterest({ judgmentType, party }),
                    `interest ${judgmentType} / ${bucket}`,
                ).toBe(expected === 'self_appeal' || expected === 'both_paths');
            }
            expect(interpleaderOriginalClaimOutcome(judgmentType)).toBe(ORIGINAL_CLAIM[judgmentType]);
        },
    );

    it('وضع إضبارة الطعن حسب الموكل × النتيجة', () => {
        const cases: Array<{
            type: string;
            bucket: LawyerJudgmentBucket;
            mode: 'standard' | 'interpleader_appellant' | 'against_interpleader';
        }> = [
            { type: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, bucket: 'interpleader', mode: 'interpleader_appellant' },
            { type: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, bucket: 'plaintiff', mode: 'standard' },
            { type: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, bucket: 'defendant', mode: 'standard' },
            { type: INTERPLEADER_JUDGMENT_BOTH_DISMISSED, bucket: 'interpleader', mode: 'interpleader_appellant' },
            { type: INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL, bucket: 'interpleader', mode: 'interpleader_appellant' },
            { type: INTERPLEADER_JUDGMENT_THIRD_FULL, bucket: 'plaintiff', mode: 'against_interpleader' },
            { type: INTERPLEADER_JUDGMENT_THIRD_FULL, bucket: 'defendant', mode: 'against_interpleader' },
            { type: INTERPLEADER_JUDGMENT_THIRD_FULL, bucket: 'interpleader', mode: 'standard' },
            { type: INTERPLEADER_JUDGMENT_THIRD_PARTIAL, bucket: 'plaintiff', mode: 'against_interpleader' },
            { type: INTERPLEADER_JUDGMENT_THIRD_PARTIAL, bucket: 'interpleader', mode: 'standard' },
            { type: INTERPLEADER_JUDGMENT_FORMAL_NULLITY, bucket: 'interpleader', mode: 'standard' },
            { type: INTERPLEADER_JUDGMENT_FORMAL_NULLITY, bucket: 'plaintiff', mode: 'standard' },
        ];
        for (const row of cases) {
            expect(
                resolveAppealDossierMode(row.type, markClient(row.bucket)),
                `${row.type} / ${row.bucket}`,
            ).toBe(row.mode);
        }
        expect(isInterpleaderRequestAnswered(INTERPLEADER_JUDGMENT_THIRD_FULL)).toBe(true);
        expect(isInterpleaderRequestDismissed(INTERPLEADER_JUDGMENT_PLAINTIFF_FULL)).toBe(true);
        expect(isInterpleaderRequestDismissed(INTERPLEADER_JUDGMENT_FORMAL_NULLITY)).toBe(false);
    });

    it('فلتر الحضور + المصلحة: من يظهر في قائمة الاستئناف المختلط لكل نتيجة', () => {
        const byPresence = filterAppellantPartiesByChallengeMethod(IC_PARTIES, {
            appealType: 'استئناف',
            dispositions: IC_MIXED_D3_GHIABI,
        });
        // حاضرون 2,3 + غائب ملزَم 4 + اختصامي 5
        expect(byPresence.map((p) => p.id).sort()).toEqual([2, 3, 4, 5]);

        const expectIds = (type: string, ids: number[]) => {
            expect(
                filterAppellantsByAppealInterest(byPresence, {
                    appealType: 'استئناف',
                    judgmentType: type,
                })
                    .map((p) => p.id)
                    .sort(),
            ).toEqual(ids);
        };

        expectIds(INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, [2, 3, 4, 5]);
        expectIds(INTERPLEADER_JUDGMENT_THIRD_FULL, []); // الكاسبون في القائمة يسقطون
        expectIds(INTERPLEADER_JUDGMENT_BOTH_DISMISSED, [5]); // المدعى عليهم كاسبون؛ الاختصامي خاسر
        expectIds(INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL, [2, 3, 4, 5]);
        expectIds(INTERPLEADER_JUDGMENT_THIRD_PARTIAL, [5]); // جزئي للاختصامي ⇒ canAppeal
        expectIds(INTERPLEADER_JUDGMENT_FORMAL_NULLITY, []);

        // المدعي يُمرَّر من تخطيط against_interpleader لا من فلتر dispositions
        expect(
            filterAppellantsByAppealInterest([IC_PARTIES[0]!], {
                appealType: 'استئناف',
                judgmentType: INTERPLEADER_JUDGMENT_THIRD_FULL,
            }).map((p) => p.id),
        ).toEqual([1]);
    });

    it('مسار الاعتراض: الاختصامي لا يدخل؛ الغائب فقط؛ لا يُصفّى بمصلحة الحكم البدائي', () => {
        expect(
            filterAppellantPartiesByChallengeMethod(IC_PARTIES, {
                appealType: 'اعتراض على الحكم الغيابي',
                dispositions: IC_MIXED_D3_GHIABI,
            }).map((p) => p.id),
        ).toEqual([4]);
        const objectionParties = [
            { id: 1, role: 'المعترض عليه بالحكم الغيابي (المدعي)' },
            { id: 4, role: 'المعترض على الحكم الغيابي (المدعى عليه)' },
        ];
        expect(
            filterAppellantsByAppealInterest(objectionParties, {
                appealType: 'استئناف',
                judgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
            }),
        ).toEqual(objectionParties);
    });

    it('استئخار 172: مع غيابي+اعتراض يعمل؛ مع حضور كامل لا يعمل — لكل نتائج الحكم', () => {
        for (const type of Object.keys(RIGHTS_MATRIX)) {
            const withObj = [
                icFirstInstance({ lastJudgmentType: type }),
                icAppealRoll(),
                icObjectionPending(),
            ];
            expect(isGhayabiObjectionPending({ stages: withObj }), type).toBe(true);
            expect(
                canOfferArt172AppealStay({
                    currentStage: withObj[1],
                    stages: withObj,
                    parentIntegrity: 'indivisible',
                }),
                type,
            ).toBe(true);

            const allPresent = [
                icFirstInstance({
                    lastJudgmentType: type,
                    judgmentForm: 'حضوري',
                    partyJudgmentDispositions: IC_ALL_PRESENT,
                }),
                icAppealRoll(),
            ];
            expect(isGhayabiObjectionPending({ stages: allPresent }), `${type} present`).toBe(false);
            expect(
                canOfferArt172AppealStay({
                    currentStage: allPresent[1],
                    stages: allPresent,
                    parentIntegrity: 'indivisible',
                }),
                `${type} present stay`,
            ).toBe(false);
        }
    });

    it('استقلال الإضبارة: استئناف لاحق من الاعتراض ينشق مع رول استئناف مفتوح (إبطال أو تأييد)', () => {
        for (const type of [
            INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
            INTERPLEADER_JUDGMENT_THIRD_FULL,
            INTERPLEADER_JUDGMENT_BOTH_DISMISSED,
        ]) {
            const voidStages = [
                icFirstInstance({ lastJudgmentType: type }),
                icAppealRoll({ isSuspended: true }),
                icObjectionPending({
                    finalDecision: 'تعديل الحكم الغيابي — يحق لموكلك الطعن',
                    isPleadingsClosed: true,
                }),
            ];
            expect(
                shouldSpawnIndependentChallengeDossier({
                    stages: voidStages,
                    sourceStage: voidStages[2],
                    appealType: 'استئناف',
                }),
            ).toBe(true);

            const upholdStages = [
                icFirstInstance({ lastJudgmentType: type }),
                icAppealRoll(),
                icObjectionPending({
                    finalDecision: 'تأييد الحكم الغيابي — بانتظار طعن المعترض',
                    isPleadingsClosed: true,
                }),
            ];
            /** رول استئناف مفتوح + مصدر ≠ الرول ⇒ إضبارة مستقلة (سياسة الطعن اللاحق) */
            expect(
                shouldSpawnIndependentChallengeDossier({
                    stages: upholdStages,
                    sourceStage: upholdStages[2],
                    appealType: 'استئناف',
                }),
            ).toBe(true);
        }
    });

    it('awaitingOpponent: الكاسب ينتظر فقط (full_win في محرك النتيجة)', () => {
        expect(interpleaderClientAwaitingOpponentAppeal(INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, 'plaintiff')).toBe(
            true,
        );
        expect(interpleaderClientAwaitingOpponentAppeal(INTERPLEADER_JUDGMENT_THIRD_FULL, 'interpleader')).toBe(
            true,
        );
        expect(interpleaderClientAwaitingOpponentAppeal(INTERPLEADER_JUDGMENT_THIRD_FULL, 'defendant')).toBe(
            true,
        );
        expect(interpleaderClientAwaitingOpponentAppeal(INTERPLEADER_JUDGMENT_BOTH_DISMISSED, 'defendant')).toBe(
            true,
        );
        expect(interpleaderClientAwaitingOpponentAppeal(INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, 'interpleader')).toBe(
            false,
        );
        expect(interpleaderClientAwaitingOpponentAppeal(INTERPLEADER_JUDGMENT_FORMAL_NULLITY, 'plaintiff')).toBe(false);
    });
});
