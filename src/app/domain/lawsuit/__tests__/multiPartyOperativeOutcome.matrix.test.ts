/**
 * مصفوفة محاكاة: ربح / خسارة / جزئي × متعدّد مدّعين/مدعى عليهم × حضور مختلط × operative.
 */
import { describe, expect, it } from 'vitest';
import type { Party } from '@/app/components/lawyer/LawyerShared';
import { resolveFirstInstanceHadoriAppealRights } from '@/app/components/lawyer/smart-modal/smartFile/firstInstanceAppealRights';
import { stageOutcomeFromFirstInstanceRights } from '@/app/components/lawyer/smart-modal/smartFile/stageOutcomeResolution';
import { filterAppellantsByAppealInterest } from '@/app/components/lawyer/smart-modal/smartFile/appealInterestEligibility';
import { filterAppellantPartiesByChallengeMethod } from '@/app/domain/lawsuit/challengeAppellantEligibility';
import {
    attachPartyChallengeLanes,
    LANE_STATE_WAIVED,
} from '@/app/domain/lawsuit/partyChallengeLanes';
import {
    coerceJudgmentTypeForReleasedOperatives,
    type PartyJudgmentDisposition,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';
import { applyArt210CassationExtension } from '@/app/domain/lawsuit/cassationArt210';
import { classifyAbsentObjectionOutcome } from '@/app/domain/lawsuit/objectionAppealConsequence';
import { resolveAbsentObjectionAppealRights } from '@/app/components/lawyer/smart-modal/smartFile/absentJudgmentAppealRights';

const multiDefendants: Party[] = [
    { id: 1, name: 'سامي', role: 'المدعى عليه', isClient: false, side: 'left' },
    { id: 2, name: 'باسم', role: 'المدعى عليه', isClient: false, side: 'left' },
    { id: 3, name: 'كريم', role: 'المدعى عليه', isClient: false, side: 'left' },
    { id: 4, name: 'أحمد', role: 'المدعي', isClient: true, side: 'right' },
];

const multiPlaintiffs: Party[] = [
    { id: 10, name: 'مدعي أ', role: 'المدعي', isClient: true, side: 'right' },
    { id: 11, name: 'مدعي ب', role: 'المدعي', isClient: false, side: 'right' },
    { id: 20, name: 'مدعى عليه', role: 'المدعى عليه', isClient: false, side: 'left' },
    { id: 21, name: 'مدعى عليه 2', role: 'المدعى عليه', isClient: false, side: 'left' },
];

describe('مصفوفة ربح/خسارة/جزئي — تعدد الأطراف + operative', () => {
    describe('فوز كامل — كل الملزَمين bound', () => {
        const dispositions: PartyJudgmentDisposition[] = [
            { partyId: '1', form: 'حضوري', operative: 'bound' },
            { partyId: '2', form: 'حضوري', operative: 'bound' },
            { partyId: '3', form: 'غيابي', operative: 'bound' },
        ];

        it('المدعي: wait_opponent + WIN؛ لا إكراه جزئي', () => {
            expect(
                coerceJudgmentTypeForReleasedOperatives('إجابة الدعوى بالكامل', dispositions),
            ).toBe('إجابة الدعوى بالكامل');
            const rights = resolveFirstInstanceHadoriAppealRights('إجابة الدعوى بالكامل', 'المدعي', {
                parties: multiDefendants,
                representedParty: 'المدعي',
            });
            expect(rights.action).toBe('wait_opponent');
            expect(stageOutcomeFromFirstInstanceRights(rights, 'إجابة الدعوى بالكامل')).toBe('WIN');
        });

        it('استئناف المختلط: الحاضر والغائب الملزَم؛ الاعتراض للغائب فقط', () => {
            expect(
                filterAppellantPartiesByChallengeMethod(multiDefendants, {
                    appealType: 'استئناف',
                    dispositions,
                })
                    .map((p) => Number(p.id))
                    .sort(),
            ).toEqual([1, 2, 3]);
            expect(
                filterAppellantPartiesByChallengeMethod(multiDefendants, {
                    appealType: 'اعتراض على الحكم الغيابي',
                    dispositions,
                }).map((p) => Number(p.id)),
            ).toEqual([3]);
        });
    });

    describe('خسارة كاملة — رد كلي', () => {
        it('المدعي: self_appeal + LOSS', () => {
            const rights = resolveFirstInstanceHadoriAppealRights('رد الدعوى كلياً', 'المدعي', {
                parties: multiDefendants,
                representedParty: 'المدعي',
            });
            expect(rights.action).toBe('self_appeal');
            expect(stageOutcomeFromFirstInstanceRights(rights, 'رد الدعوى كلياً')).toBe('LOSS');
        });

        it('مصلحة الاستئناف: المدعي يطعن والمدعى عليهم لا (عند رد كلي)', () => {
            const eligible = filterAppellantsByAppealInterest(multiDefendants, {
                appealType: 'استئناف',
                judgmentType: 'رد الدعوى كلياً',
            });
            expect(eligible.map((p) => Number(p.id))).toEqual([4]);
        });
    });

    describe('جزئي منطوق موحّد — بدون تفريد released', () => {
        it('both_paths + PARTIAL لكلا الجانبين في فلتر المصلحة', () => {
            const rights = resolveFirstInstanceHadoriAppealRights('رد الدعوى جزئياً', 'المدعي', {
                parties: multiDefendants,
                representedParty: 'المدعي',
            });
            expect(rights.action).toBe('both_paths');
            expect(stageOutcomeFromFirstInstanceRights(rights, 'رد الدعوى جزئياً')).toBe('PARTIAL');
            const eligible = filterAppellantsByAppealInterest(multiDefendants, {
                appealType: 'استئناف',
                judgmentType: 'رد الدعوى جزئياً',
            });
            expect(eligible.map((p) => Number(p.id)).sort()).toEqual([1, 2, 3, 4]);
        });
    });

    describe('جزئي تفريدي — رد بحق أحد الخصوم', () => {
        const dispositions: PartyJudgmentDisposition[] = [
            { partyId: '1', form: 'حضوري', operative: 'released' },
            { partyId: '2', form: 'حضوري', operative: 'bound' },
            { partyId: '3', form: 'غيابي', operative: 'bound' },
        ];

        it('إكراه المنطوق إلى جزئي + PARTIAL', () => {
            const coerced = coerceJudgmentTypeForReleasedOperatives(
                'إجابة الدعوى بالكامل',
                dispositions,
            );
            expect(coerced).toBe('رد الدعوى جزئياً');
            const rights = resolveFirstInstanceHadoriAppealRights(coerced, 'المدعي', {
                parties: multiDefendants,
                representedParty: 'المدعي',
            });
            expect(rights.action).toBe('both_paths');
            expect(stageOutcomeFromFirstInstanceRights(rights, coerced)).toBe('PARTIAL');
        });

        it('رد الجميع → رد كلي + LOSS', () => {
            const allReleased: PartyJudgmentDisposition[] = [
                { partyId: '1', form: 'حضوري', operative: 'released' },
                { partyId: '2', form: 'حضوري', operative: 'released' },
                { partyId: '3', form: 'غيابي', operative: 'released' },
            ];
            const coerced = coerceJudgmentTypeForReleasedOperatives(
                'إجابة الدعوى بالكامل',
                allReleased,
            );
            expect(coerced).toBe('رد الدعوى كلياً');
            const rights = resolveFirstInstanceHadoriAppealRights(coerced, 'المدعي', {
                parties: multiDefendants,
                representedParty: 'المدعي',
            });
            expect(rights.action).toBe('self_appeal');
            expect(stageOutcomeFromFirstInstanceRights(rights, coerced)).toBe('LOSS');
        });

        it('المبرَّأ يسقط من الاستئناف؛ المدعي الموكل يُضم؛ الغائب الملزَم للاعتراض', () => {
            const byPresence = filterAppellantPartiesByChallengeMethod(multiDefendants, {
                appealType: 'استئناف',
                dispositions,
            });
            expect(byPresence.map((p) => Number(p.id)).sort()).toEqual([2, 3, 4]);

            const byInterest = filterAppellantsByAppealInterest(byPresence, {
                appealType: 'استئناف',
                judgmentType: 'رد الدعوى جزئياً',
                dispositions,
            });
            expect(byInterest.map((p) => Number(p.id)).sort()).toEqual([2, 3, 4]);
            expect(byInterest.some((p) => Number(p.id) === 1)).toBe(false);

            expect(
                filterAppellantPartiesByChallengeMethod(multiDefendants, {
                    appealType: 'اعتراض على الحكم الغيابي',
                    dispositions,
                }).map((p) => Number(p.id)),
            ).toEqual([3]);
        });

        it('بطاقة المبرَّأ waived؛ م/210 لا تحييه', () => {
            const stage = attachPartyChallengeLanes(
                {
                    id: 's0',
                    name: 'بداءة بدرجة أولى',
                    stageName: 'بداءة بدرجة أولى',
                    status: 'active',
                    parties: multiDefendants,
                    partyJudgmentDispositions: dispositions,
                    judgmentForm: 'مختلط',
                    disputeIntegrity: 'indivisible',
                } as never,
                { dispositions, judgmentDate: '2026-01-10' },
            );
            expect(stage.partyChallengeLanes?.find((l) => l.partyId === '1')?.laneState).toBe(
                LANE_STATE_WAIVED,
            );
            const revived = applyArt210CassationExtension({
                lanes: stage.partyChallengeLanes,
                integrity: 'indivisible',
                groundsScope: 'COMMON',
                cassatorPartyIds: ['2'],
                effect: 'REVERSED_REMANDED',
                dispositions,
            });
            expect(revived.find((l) => l.partyId === '1')?.laneState).toBe(LANE_STATE_WAIVED);
        });
    });

    describe('مدّعون متعددون + مدعى عليهم', () => {
        const dispositions: PartyJudgmentDisposition[] = [
            { partyId: '20', form: 'حضوري', operative: 'bound' },
            { partyId: '21', form: 'حضوري', operative: 'released' },
        ];

        it('خسارة كلية: المدّعون يطعنون', () => {
            const eligible = filterAppellantsByAppealInterest(multiPlaintiffs, {
                appealType: 'استئناف',
                judgmentType: 'رد الدعوى كلياً',
            });
            expect(eligible.map((p) => Number(p.id)).sort()).toEqual([10, 11]);
        });

        it('جزئي تفريدي: المبرَّأ يسقط؛ المدعي الموكل يبقى', () => {
            const byPresence = filterAppellantPartiesByChallengeMethod(multiPlaintiffs, {
                appealType: 'استئناف',
                dispositions,
            });
            /* ليس مختلط حضور — لا فلتر حضور؛ المصلحة تسقط released */
            const byInterest = filterAppellantsByAppealInterest(multiPlaintiffs, {
                appealType: 'استئناف',
                judgmentType: 'رد الدعوى جزئياً',
                dispositions,
            });
            expect(byInterest.some((p) => Number(p.id) === 21)).toBe(false);
            expect(byInterest.map((p) => Number(p.id)).sort()).toEqual([10, 11, 20]);
            expect(byPresence.map((p) => Number(p.id)).sort()).toEqual([10, 11, 20, 21]);
        });
    });

    describe('اعتراض غيابي — جزئي / إبطال', () => {
        const objectionParties: Party[] = [
            {
                id: 3,
                name: 'كريم',
                role: 'المعترض على الحكم الغيابي (المدعى عليه)',
                isClient: false,
                side: 'right',
            },
            {
                id: 4,
                name: 'أحمد',
                role: 'المعترض عليه بالحكم الغيابي (المدعي)',
                isClient: true,
                side: 'left',
            },
        ];

        it('تعديل جزئي → partial + both_paths', () => {
            expect(classifyAbsentObjectionOutcome('رد الدعوى جزئياً')).toBe('partial');
            const rights = resolveAbsentObjectionAppealRights('رد الدعوى جزئياً', objectionParties);
            expect(rights.action).toBe('both_paths');
            expect(stageOutcomeFromFirstInstanceRights(rights, 'رد الدعوى جزئياً')).toBe('PARTIAL');
        });

        it('إبطال كلي → void_full + self_appeal للمدعي', () => {
            expect(classifyAbsentObjectionOutcome('تعديل الحكم الغيابي')).toBe('void_full');
            const rights = resolveAbsentObjectionAppealRights('رد الدعوى كلياً', objectionParties);
            expect(rights.action).toBe('self_appeal');
            expect(stageOutcomeFromFirstInstanceRights(rights, 'رد الدعوى كلياً')).toBe('LOSS');
        });
    });
});
