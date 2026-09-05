import { describe, expect, it } from 'vitest';
import type { CaseStage, Party } from '../../../LawyerShared';
import { openAbsentObjectionStage } from '../absentObjectionStageOpen';
import { isAbsentObjectorRole } from '../partyRoleClassification';
import {
    applyJoinGhayabiObjectorToObjectionStage,
    canOfferJoinCoObjector,
    resolveUnifiedObjectionBanner,
} from '../joinGhayabiObjectorToStage';
import { markLaneServed, mergePartyChallengeLanes } from '@/app/domain/lawsuit/partyChallengeLanes';
import { UNIFIED_OBJECTION_BANNER_PREFIX } from '@/app/domain/lawsuit/joinGhayabiObjector';

const parties: Party[] = [
    { id: 1, name: 'أحمد', role: 'المدعي', isClient: false, side: 'right' },
    { id: 2, name: 'سامي', role: 'المدعى عليه', isClient: false, side: 'left' },
    { id: 3, name: 'كريم', role: 'المدعى عليه', isClient: true, side: 'left' },
];

function twoGhayabiFirstInstance(): CaseStage {
    const lanes = markLaneServed(
        markLaneServed(
            mergePartyChallengeLanes({
                parties,
                dispositions: [
                    { partyId: '2', form: 'غيابي' },
                    { partyId: '3', form: 'غيابي' },
                ],
                judgmentDate: '2026-08-01',
            }),
            '2',
            '2026-08-10',
        ),
        '3',
        '2026-08-12',
    );
    return {
        id: 'stage_1',
        name: 'بداءة بدرجة أولى',
        stageName: 'بداءة بدرجة أولى',
        status: 'active',
        caseNo: '111/ب/2026',
        court: 'كرخ',
        parties,
        timeline: [],
        decisionDate: '2026-08-01',
        judgmentForm: 'غيابي',
        partyJudgmentDispositions: [
            { partyId: '2', form: 'غيابي' },
            { partyId: '3', form: 'غيابي' },
        ],
        partyChallengeLanes: lanes,
        finalDecision: 'حكم غيابي — بانتظار اعتراض المدعى عليه',
    } as CaseStage;
}

function openFirstObjector(fi = twoGhayabiFirstInstance()) {
    return openAbsentObjectionStage({
        stages: [fi],
        activeStageIndex: 0,
        currentStage: fi,
        filingDate: '2026-08-15',
        objectorPartyIds: [2],
        archiveTimelineEvent: {
            id: 'reg_1',
            type: 'decision',
            date: '2026-08-15',
            title: 'تسجيل اعتراض غيابي',
            details: 'اعتراض سامي',
        },
        archiveDecisionDate: '2026-08-01',
    });
}

describe('ضم معترض غائب لاحق لنفس مرحلة الاعتراض', () => {
    it('يضم الغائب الثاني دون إنشاء مرحلة جديدة ويقلب صفته فقط', () => {
        const opened = openFirstObjector();
        expect(opened.updatedStages).toHaveLength(2);
        expect(opened.updatedStages[1]?.parties?.find((p) => p.id === 3)).toBeUndefined();
        expect(opened.updatedStages[1]?.parties?.find((p) => p.id === 1)?.role).toContain('المعترض عليه');
        expect(isAbsentObjectorRole(String(opened.updatedStages[1]?.parties?.find((p) => p.id === 2)?.role))).toBe(true);

        const joined = applyJoinGhayabiObjectorToObjectionStage({
            stages: opened.updatedStages,
            objectorPartyId: '3',
            today: '2026-08-16',
        });
        expect('error' in joined).toBe(false);
        if ('error' in joined) return;

        expect(joined.stages).toHaveLength(2);
        const fi = joined.stages[0]!;
        const objection = joined.stages[1]!;
        expect(fi.partyChallengeLanes?.find((lane) => lane.partyId === '2')?.laneState).toBe('objection');
        expect(fi.partyChallengeLanes?.find((lane) => lane.partyId === '3')?.laneState).toBe('objection');

        expect(isAbsentObjectorRole(String(objection.parties?.find((p) => p.id === 2)?.role))).toBe(true);
        expect(isAbsentObjectorRole(String(objection.parties?.find((p) => p.id === 3)?.role))).toBe(true);
        expect(objection.parties?.find((p) => p.id === 1)?.role).toContain('المعترض عليه');
        expect(joined.banner).toBe(`${UNIFIED_OBJECTION_BANNER_PREFIX} سامي وكريم`);
        expect(resolveUnifiedObjectionBanner(objection.parties)).toBe(joined.banner);
        expect(objection.timeline?.some((event) => event.title === 'ضم معترض غائب')).toBe(true);
    });

    it('لا يعرض زر الضم — أُلغي لصالح الإضبارة المستقلة', () => {
        const opened = openFirstObjector();
        const objection = opened.updatedStages[1]!;
        expect(canOfferJoinCoObjector({
            currentStage: objection,
            stages: opened.updatedStages,
            viewingStageIndex: 1,
            today: '2026-08-16',
        })).toBe(false);
        expect(canOfferJoinCoObjector({
            currentStage: opened.updatedStages[0],
            stages: opened.updatedStages,
            viewingStageIndex: 0,
            today: '2026-08-16',
        })).toBe(false);
    });

    it('لا يضم المعترض اللاحق — يطلب إضبارة مستقلة إذا وُجد اعتراض قائم', () => {
        const opened = openFirstObjector();
        const again = openAbsentObjectionStage({
            stages: opened.updatedStages,
            activeStageIndex: 1,
            currentStage: opened.updatedStages[1]!,
            filingDate: '2026-08-16',
            objectorPartyIds: [3],
            archiveTimelineEvent: {
                id: 'reg_2',
                type: 'decision',
                date: '2026-08-16',
                title: 'تسجيل اعتراض غيابي',
                details: 'اعتراض كريم',
            },
        });
        expect(again.updatedStages).toHaveLength(2);
        expect(again.needsIndependentDossier).toBe(true);
        expect(again.joinedExisting).toBeUndefined();
        expect(again.updatedStages[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '3')?.laneState)
            .not.toBe('objection');
    });

    it('لا يضم الحاضر ولا غير المبلَّغ', () => {
        const mixedParties: Party[] = [
            { id: 1, name: 'أحمد', role: 'المدعي', isClient: false, side: 'right' },
            { id: 2, name: 'سامي', role: 'المدعى عليه', isClient: false, side: 'left' },
            { id: 3, name: 'كريم', role: 'المدعى عليه', isClient: true, side: 'left' },
        ];
        const lanes = markLaneServed(
            mergePartyChallengeLanes({
                parties: mixedParties,
                dispositions: [
                    { partyId: '2', form: 'حضوري' },
                    { partyId: '3', form: 'غيابي' },
                ],
                judgmentDate: '2026-08-01',
            }),
            '3',
            '2026-08-10',
        );
        const fi = {
            ...twoGhayabiFirstInstance(),
            parties: mixedParties,
            judgmentForm: 'مختلط',
            partyJudgmentDispositions: [
                { partyId: '2', form: 'حضوري' },
                { partyId: '3', form: 'غيابي' },
            ],
            partyChallengeLanes: lanes,
        } as CaseStage;
        const opened = openAbsentObjectionStage({
            stages: [fi],
            activeStageIndex: 0,
            currentStage: fi,
            filingDate: '2026-08-15',
            objectorPartyIds: [3],
            archiveTimelineEvent: {
                id: 'reg_mixed',
                type: 'decision',
                date: '2026-08-15',
                title: 'تسجيل اعتراض غيابي',
                details: 'اعتراض كريم',
            },
        });
        expect(canOfferJoinCoObjector({
            currentStage: opened.updatedStages[1],
            stages: opened.updatedStages,
            viewingStageIndex: 1,
            today: '2026-08-16',
        })).toBe(false);
        expect(applyJoinGhayabiObjectorToObjectionStage({
            stages: opened.updatedStages,
            objectorPartyId: '2',
            today: '2026-08-16',
        })).toEqual(expect.objectContaining({ error: expect.any(String) }));
    });
});
