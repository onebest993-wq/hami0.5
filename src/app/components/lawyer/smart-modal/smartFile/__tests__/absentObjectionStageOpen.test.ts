import { describe, expect, it } from 'vitest';
import type { CaseStage, Party } from '../../../LawyerShared';
import { openAbsentObjectionStage } from '../absentObjectionStageOpen';
import { isAbsentObjectionStageName } from '../absentJudgmentStageNames';
import { resolveAbsentObjectionClientRole } from '../absentJudgmentFlow';

const parties: Party[] = [
    { id: 1, name: 'أحمد الموكل', role: 'المدعي', isClient: false, side: 'right' },
    { id: 2, name: 'علي الخصم', role: 'المدعى عليه', isClient: true, side: 'left' },
];

const firstInstance = {
    id: 'stage_1',
    name: 'بداءة بدرجة أولى',
    stageName: 'بداءة بدرجة أولى',
    status: 'active',
    caseNo: '111/ب/2026',
    court: 'كرخ',
    parties,
    timeline: [],
    decisionDate: '2026-08-01',
    finalDecision: 'حكم غيابي — بانتظار اعتراض المدعى عليه',
} as CaseStage;

describe('openAbsentObjectionStage', () => {
    it('يفتح مرحلة اعتراض جديدة ولا يعيد تسمية البداءة في مكانها', () => {
        const { updatedStages, newActiveIndex, resolvedCaseNumber } = openAbsentObjectionStage({
            stages: [firstInstance],
            activeStageIndex: 0,
            currentStage: firstInstance,
            filingDate: '2026-08-10',
            sessionDate: '2026-08-20',
            archiveTimelineEvent: {
                id: 'reg_1',
                type: 'decision',
                date: '2026-08-10',
                title: 'تسجيل اعتراض غيابي',
                details: 'تقديم الاعتراض',
            },
            archiveFinalDecision: 'حكم غيابي — اعترض المدعى عليه',
            archiveDecisionDate: '2026-08-01',
        });

        expect(updatedStages).toHaveLength(2);
        expect(newActiveIndex).toBe(1);
        expect(updatedStages[0]?.status).toBe('locked');
        expect(updatedStages[0]?.stageName).toBe('بداءة بدرجة أولى');
        expect(updatedStages[0]?.stageName).not.toContain('اعتراض غيابي');

        const objection = updatedStages[1]!;
        expect(isAbsentObjectionStageName(objection.stageName)).toBe(true);
        expect(objection.caseNo).toBe('');
        expect(resolvedCaseNumber).toBe('');
        expect(objection.isPleadingsClosed).toBe(false);
        expect(objection.timeline?.some((e) => e.title === 'جلسة مرافعة (اعتراض غيابي)')).toBe(true);
        expect(objection.timeline?.some((e) => e.date === '2026-08-20')).toBe(true);

        expect(resolveAbsentObjectionClientRole(objection.parties)).toBe('objector');
        expect(objection.parties?.find((p) => p.id === 2)?.role).toContain('المعترض');
        expect(objection.parties?.find((p) => p.id === 1)?.role).toContain('المعترض عليه');
    });

    it('يقصر صفة المعترض على الغائب المختار دون قلب الحاضرين', () => {
        const mixedParties: Party[] = [
            { id: 1, name: 'أحمد', role: 'المدعي', isClient: false, side: 'right' },
            { id: 2, name: 'سامي', role: 'المدعى عليه', isClient: false, side: 'left' },
            { id: 3, name: 'كريم', role: 'المدعى عليه', isClient: true, side: 'left' },
        ];
        const mixedStage = {
            ...firstInstance,
            parties: mixedParties,
            judgmentForm: 'مختلط',
            partyJudgmentDispositions: [
                { partyId: '2', form: 'حضوري' },
                { partyId: '3', form: 'غيابي' },
            ],
        } as CaseStage;

        const { updatedStages } = openAbsentObjectionStage({
            stages: [mixedStage],
            activeStageIndex: 0,
            currentStage: mixedStage,
            filingDate: '2026-08-10',
            objectorPartyIds: [3],
            archiveTimelineEvent: {
                id: 'reg_mixed',
                type: 'decision',
                date: '2026-08-10',
                title: 'تسجيل اعتراض غيابي',
                details: 'اعتراض كريم فقط',
            },
            archiveDecisionDate: '2026-08-01',
        });

        const objection = updatedStages[1]!;
        expect(objection.parties?.find((p) => p.id === 3)?.role).toContain('المعترض');
        expect(objection.parties?.find((p) => p.id === 2)).toBeUndefined();
        expect(objection.parties?.find((p) => p.id === 1)?.role).toContain('المعترض عليه');
        expect(updatedStages[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '3')?.laneState).toBe(
            'objection',
        );
        expect(updatedStages[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '2')?.laneState).not.toBe(
            'objection',
        );
    });
});
