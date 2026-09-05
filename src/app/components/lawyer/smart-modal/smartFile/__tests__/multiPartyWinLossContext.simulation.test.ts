import { describe, expect, it } from 'vitest';
import type { Party } from '@/app/components/lawyer/LawyerShared';
import { resolveFirstInstanceHadoriAppealRights } from '../firstInstanceAppealRights';
import { stageOutcomeFromFirstInstanceRights } from '../stageOutcomeResolution';
import { filterAppellantsByAppealInterest } from '../appealInterestEligibility';
import { filterAppellantPartiesByChallengeMethod } from '@/app/domain/lawsuit/challengeAppellantEligibility';
import type { PartyJudgmentDisposition } from '@/app/domain/lawsuit/partyJudgmentDisposition';
import { attachPartyChallengeLanes } from '@/app/domain/lawsuit/partyChallengeLanes';
import { classifyAbsentObjectionOutcome } from '@/app/domain/lawsuit/objectionAppealConsequence';
import { resolveAbsentObjectionAppealRights } from '../absentJudgmentAppealRights';

/**
 * سيناريو المستخدم: موكل مدعي، أطراف متعددة، مختلط حضور/غياب،
 * جزئي في البداءة ثم اعتراض — مع تفريد operative عند الرد الفردي.
 */
describe('multi-party win/loss context — plaintiff client + mixed presence', () => {
    const parties: Party[] = [
        { id: 1, name: 'سامي', role: 'المدعى عليه', isClient: false, side: 'left' },
        { id: 2, name: 'باسم', role: 'المدعى عليه', isClient: false, side: 'left' },
        { id: 3, name: 'كريم', role: 'المدعى عليه', isClient: false, side: 'left' },
        { id: 4, name: 'أحمد', role: 'المدعي', isClient: true, side: 'right' },
    ];

    const dispositions: PartyJudgmentDisposition[] = [
        { partyId: '1', form: 'حضوري' },
        { partyId: '2', form: 'حضوري' },
        { partyId: '3', form: 'غيابي' },
    ];

    it('الجزئي يخزّن PARTIAL لا LOSS ويُبقي مصلحة الطعن لكلا الجانبين', () => {
        const rights = resolveFirstInstanceHadoriAppealRights('رد الدعوى جزئياً', 'المدعي', {
            parties,
            representedParty: 'المدعي',
        });
        expect(rights.action).toBe('both_paths');
        expect(stageOutcomeFromFirstInstanceRights(rights, 'رد الدعوى جزئياً')).toBe('PARTIAL');

        const eligible = filterAppellantsByAppealInterest(parties, {
            appealType: 'استئناف',
            judgmentType: 'رد الدعوى جزئياً',
        });
        expect(eligible.map((p) => Number(p.id)).sort()).toEqual([1, 2, 3, 4]);
    });

    it('المختلط بلا released: استئناف الحاضرين لا يُخرج المدعي (خارج dispositions)', () => {
        const stage = attachPartyChallengeLanes(
            {
                id: 's0',
                name: 'بداءة بدرجة أولى',
                stageName: 'بداءة بدرجة أولى',
                status: 'active',
                parties,
                partyJudgmentDispositions: dispositions,
                judgmentForm: 'مختلط',
            } as never,
            { dispositions, judgmentDate: '2026-01-10' },
        );
        const byPresence = filterAppellantPartiesByChallengeMethod(parties, {
            appealType: 'استئناف',
            dispositions,
            lanes: stage.partyChallengeLanes,
            scalarForm: 'مختلط',
        });
        expect(byPresence.map((p) => Number(p.id)).sort()).toEqual([1, 2, 3]);

        const byInterest = filterAppellantsByAppealInterest(byPresence, {
            appealType: 'استئناف',
            judgmentType: 'رد الدعوى جزئياً',
        });
        expect(byInterest.map((p) => Number(p.id)).sort()).toEqual([1, 2, 3]);
        expect(byInterest.some((p) => Number(p.id) === 4)).toBe(false);
    });

    it('مختلط + رد بحق أحد الحاضرين: يسقط المبرَّأ ويُضم المدعي الموكل', () => {
        const withReleased: PartyJudgmentDisposition[] = [
            { partyId: '1', form: 'حضوري', operative: 'released' },
            { partyId: '2', form: 'حضوري', operative: 'bound' },
            { partyId: '3', form: 'غيابي', operative: 'bound' },
        ];
        const byPresence = filterAppellantPartiesByChallengeMethod(parties, {
            appealType: 'استئناف',
            dispositions: withReleased,
        });
        expect(byPresence.map((p) => Number(p.id)).sort()).toEqual([2, 3, 4]);
        const byInterest = filterAppellantsByAppealInterest(byPresence, {
            appealType: 'استئناف',
            judgmentType: 'رد الدعوى جزئياً',
            dispositions: withReleased,
        });
        expect(byInterest.map((p) => Number(p.id)).sort()).toEqual([2, 3, 4]);
    });

    it('الاعتراض: تعديل جزئي = partial + both_paths للمدعي المعترض عليه', () => {
        expect(classifyAbsentObjectionOutcome('رد الدعوى جزئياً')).toBe('partial');
        expect(classifyAbsentObjectionOutcome('تعديل جزئي للحكم الغيابي')).toBe('partial');

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
        const rights = resolveAbsentObjectionAppealRights('رد الدعوى جزئياً', objectionParties);
        expect(rights.action).toBe('both_paths');
        expect(stageOutcomeFromFirstInstanceRights(rights, 'رد الدعوى جزئياً')).toBe('PARTIAL');
    });

    it('الاعتراض: إبطال كلي = void_full + self_appeal للمدعي', () => {
        expect(classifyAbsentObjectionOutcome('تعديل الحكم الغيابي')).toBe('void_full');
        const objectionParties: Party[] = [
            {
                id: 3,
                name: 'كريم',
                role: 'المعترض على الحكم الغيابي (المدعى عليه)',
                isClient: false,
            },
            {
                id: 4,
                name: 'أحمد',
                role: 'المعترض عليه بالحكم الغيابي (المدعي)',
                isClient: true,
            },
        ];
        const rights = resolveAbsentObjectionAppealRights('رد الدعوى كلياً', objectionParties);
        expect(rights.action).toBe('self_appeal');
        expect(stageOutcomeFromFirstInstanceRights(rights, 'رد الدعوى كلياً')).toBe('LOSS');
    });
});
