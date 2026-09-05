import { describe, expect, it } from 'vitest';
import type { CaseStage, Party } from '../../../LawyerShared';
import {
    applyAppealStageTransition,
} from '../appealStageTransition';
import {
    overlayAppellantLanesAfterAppealHop,
    resolveHopPriorJudgmentForm,
    shouldCarryFirstInstanceChallengeTruth,
} from '../appealChallengeTruth';
import { LANE_STATE_APPEAL, LANE_STATE_CASSATION, LANE_STATE_PENDING } from '@/app/domain/lawsuit/partyChallengeLanes';

const PARTIES: Party[] = [
    { id: 1, name: 'أحمد الموكل', role: 'المدعي', isClient: true, side: 'right' },
    { id: 2, name: 'سامي', role: 'المدعى عليه', isClient: false, side: 'left' },
    { id: 3, name: 'كريم', role: 'المدعى عليه', isClient: false, side: 'left' },
];

const MIXED_DISPOSITIONS = [
    { partyId: '2', form: 'حضوري' as const },
    { partyId: '3', form: 'غيابي' as const },
];

const MIXED_LANES = [
    {
        partyId: '2',
        disposition: 'حضوري' as const,
        laneState: LANE_STATE_PENDING,
        appealDeadline: '2026-08-20',
    },
    {
        partyId: '3',
        disposition: 'غيابي' as const,
        laneState: LANE_STATE_PENDING,
        servedAt: null,
    },
];

function mixedFirstInstance(overrides: Partial<CaseStage> = {}): CaseStage {
    return {
        id: 'stage_1',
        name: 'البداءة',
        stageName: 'البداءة',
        status: 'active',
        caseNo: '10/2026',
        parties: PARTIES,
        timeline: [],
        isPleadingsClosed: true,
        clientStageOutcome: 'WIN',
        judgmentForm: 'مختلط',
        disputeIntegrity: 'indivisible',
        partyJudgmentDispositions: MIXED_DISPOSITIONS,
        partyChallengeLanes: MIXED_LANES,
        decisionDate: '2026-08-04',
        ...overrides,
    } as CaseStage;
}

describe('appealChallengeTruth — أمانة الحكم الغيابي/المختلط في الاستئناف', () => {
    it('يحفظ المختلط في metadata ولا يجعل الاستئناف غيابيّاً', () => {
        const source = mixedFirstInstance();
        const { updatedStages, newActiveIndex } = applyAppealStageTransition([source], 0, source, {
            appealType: 'استئناف',
            appellant: 'المدعى عليه',
            filingDate: '2026-08-21',
            newCaseNumber: '55/س/2026',
            includedAppellantPartyIds: [2],
            includedOpponentPartyIds: [1, 3],
        });
        const appeal = updatedStages[newActiveIndex]!;
        expect(appeal.appealMetadata?.priorJudgmentForm).toBe('MIXED');
        expect(appeal.judgmentForm).toBeUndefined();
        expect(appeal.partyJudgmentDispositions).toBeUndefined();
        expect(appeal.disputeIntegrity).toBe('indivisible');
        expect(appeal.partyChallengeLanes).toBeUndefined();
        expect(updatedStages[0]?.status).toBe('locked');
        expect(updatedStages[0]?.partyChallengeLanes).toEqual(MIXED_LANES);
        expect(updatedStages[0]?.partyJudgmentDispositions).toEqual(MIXED_DISPOSITIONS);
    });

    it('يحفظ الغيابي الصرف GHAYABI وبمثابة الحضوري حضور-مثل', () => {
        const ghayabi = mixedFirstInstance({
            judgmentForm: 'غيابي',
            partyJudgmentDispositions: [
                { partyId: '2', form: 'غيابي' },
                { partyId: '3', form: 'غيابي' },
            ],
            partyChallengeLanes: MIXED_LANES.map((lane) => ({ ...lane, disposition: 'غيابي' as const })),
        });
        const ghayabiHop = applyAppealStageTransition([ghayabi], 0, ghayabi, {
            appealType: 'استئناف',
            appellant: 'المدعى عليه',
            filingDate: '2026-08-21',
            newCaseNumber: '56/س/2026',
        });
        expect(ghayabiHop.updatedStages[1]?.appealMetadata?.priorJudgmentForm).toBe('GHAYABI');

        const deemed = mixedFirstInstance({
            judgmentForm: 'بمثابة الحضوري',
            disputeIntegrity: 'severable',
            partyJudgmentDispositions: [
                { partyId: '2', form: 'بمثابة الحضوري' },
                { partyId: '3', form: 'حضوري' },
            ],
        });
        const deemedHop = applyAppealStageTransition([deemed], 0, deemed, {
            appealType: 'استئناف',
            appellant: 'المدعى عليه',
            filingDate: '2026-08-21',
            newCaseNumber: '57/س/2026',
        });
        expect(deemedHop.updatedStages[1]?.appealMetadata?.priorJudgmentForm).toBe('HADORI');
    });

    it('يسم بطاقة المستأنف على البداءة دون نقل الغياب إلى الاستئناف', () => {
        const source = mixedFirstInstance();
        const { updatedStages, newActiveIndex } = applyAppealStageTransition([source], 0, source, {
            appealType: 'استئناف',
            appellant: 'المدعى عليه',
            filingDate: '2026-08-21',
            newCaseNumber: '55/س/2026',
            includedAppellantPartyIds: [2],
        });
        const overlaid = overlayAppellantLanesAfterAppealHop({
            stages: updatedStages,
            sourceIndex: 0,
            destIndex: newActiveIndex,
            appellantPartyIds: [2],
            today: '2026-08-21',
        });
        expect(overlaid[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '2')?.laneState).toBe(
            LANE_STATE_APPEAL,
        );
        expect(overlaid[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '3')?.laneState).toBe(
            LANE_STATE_PENDING,
        );
        expect(overlaid[newActiveIndex]?.partyChallengeLanes).toBeUndefined();
        expect(overlaid[newActiveIndex]?.partyJudgmentDispositions).toBeUndefined();
        expect(overlaid[newActiveIndex]?.judgmentForm).toBeUndefined();
    });

    it('لا يحمل حقيقة البداءة من الاستئناف إلى التمييز ولا يختم المختلط من النسخة المحمولة', () => {
        expect(shouldCarryFirstInstanceChallengeTruth('الاستئناف', 'التمييز')).toBe(false);
        expect(shouldCarryFirstInstanceChallengeTruth('البداءة', 'الاستئناف')).toBe(false);
        expect(shouldCarryFirstInstanceChallengeTruth('البداءة', 'التمييز')).toBe(false);

        const appeal = {
            id: 's1',
            name: 'الاستئناف',
            stageName: 'الاستئناف',
            status: 'active',
            clientStageOutcome: 'LOSS',
            judgmentForm: undefined,
            partyJudgmentDispositions: MIXED_DISPOSITIONS,
            parties: PARTIES,
        } as CaseStage;
        expect(resolveHopPriorJudgmentForm(appeal, 'الاستئناف')).toBe('HADORI');

        const { updatedStages } = applyAppealStageTransition([appeal], 0, appeal, {
            appealType: 'تمييز',
            appellant: 'المدعى عليه',
            filingDate: '2026-09-01',
            newCaseNumber: '1/ت/2026',
        });
        expect(updatedStages[1]?.appealMetadata?.priorJudgmentForm).toBe('HADORI');
        expect(updatedStages[1]?.partyJudgmentDispositions).toBeUndefined();
    });

    it('وسم تمييز مباشر على بطاقة البداءة دون نسخ الغياب إلى التمييز', () => {
        const source = mixedFirstInstance();
        const { updatedStages, newActiveIndex } = applyAppealStageTransition([source], 0, source, {
            appealType: 'تمييز',
            appellant: 'المدعى عليه',
            filingDate: '2026-08-21',
            newCaseNumber: '1/ت/2026',
            includedAppellantPartyIds: [3],
        });
        const overlaid = overlayAppellantLanesAfterAppealHop({
            stages: updatedStages,
            sourceIndex: 0,
            destIndex: newActiveIndex,
            appellantPartyIds: [3],
            today: '2026-08-21',
        });
        expect(overlaid[0]?.partyChallengeLanes?.find((row) => row.partyId === '3')?.laneState).toBe(
            LANE_STATE_CASSATION,
        );
        expect(overlaid[newActiveIndex]?.partyChallengeLanes).toBeUndefined();
        expect(overlaid[newActiveIndex]?.judgmentForm).toBeUndefined();
    });

    it('من الاستئناف إلى التمييز: يسم بطاقة البداءة تمييزاً ولا يأخذ مهلة التبليغ الغيابي لمهلة المرحلة', () => {
        const source = mixedFirstInstance();
        const appealHop = applyAppealStageTransition([source], 0, source, {
            appealType: 'استئناف',
            appellant: 'المدعى عليه',
            filingDate: '2026-08-21',
            newCaseNumber: '55/س/2026',
            includedAppellantPartyIds: [2],
        });
        const appeal = appealHop.updatedStages[1]!;
        const cassHop = applyAppealStageTransition(appealHop.updatedStages, 1, appeal, {
            appealType: 'تمييز',
            appellant: 'المدعى عليه',
            filingDate: '2026-09-01',
            newCaseNumber: '1/ت/2026',
            includedAppellantPartyIds: [2],
            priorStageOutcome: 'LOSS',
        });
        expect(cassHop.updatedStages[cassHop.newActiveIndex]?.legalTimers).toBeUndefined();
        expect(cassHop.updatedStages[cassHop.newActiveIndex]?.appealMetadata?.priorJudgmentForm).toBe(
            'HADORI',
        );
        const overlaid = overlayAppellantLanesAfterAppealHop({
            stages: cassHop.updatedStages,
            sourceIndex: 1,
            destIndex: cassHop.newActiveIndex,
            appellantPartyIds: [2],
            today: '2026-09-01',
        });
        expect(overlaid[0]?.partyChallengeLanes?.find((row) => row.partyId === '2')?.laneState).toBe(
            LANE_STATE_CASSATION,
        );
        expect(overlaid[0]?.partyChallengeLanes?.find((row) => row.partyId === '3')?.laneState).toBe(
            LANE_STATE_PENDING,
        );
        expect(overlaid[cassHop.newActiveIndex]?.partyChallengeLanes).toBeUndefined();
    });

    it('لا ينسخ بطاقات البداءة إلى مرحلة الاعتراض الغيابي', () => {
        const source = mixedFirstInstance();
        const { updatedStages } = applyAppealStageTransition([source], 0, source, {
            appealType: 'اعتراض على الحكم الغيابي',
            appellant: 'المدعى عليه',
            filingDate: '2026-08-21',
            newCaseNumber: '10/اعتراضية/2026',
            includedAppellantPartyIds: [3],
        });
        expect(updatedStages[1]?.stageName).toContain('اعتراض');
        expect(updatedStages[1]?.partyChallengeLanes).toBeUndefined();
        expect(updatedStages[1]?.appealMetadata?.priorJudgmentForm).toBe('MIXED');
    });

    it('hop الاعتراض من البداءة المقفولة يُبقي الاستئناف نشطاً', () => {
        const source = mixedFirstInstance();
        const appealHop = applyAppealStageTransition([source], 0, source, {
            appealType: 'استئناف',
            appellant: 'المدعى عليه',
            filingDate: '2026-08-21',
            newCaseNumber: '55/س/2026',
            includedAppellantPartyIds: [2],
            includedOpponentPartyIds: [1],
        });
        const afterAppeal = overlayAppellantLanesAfterAppealHop({
            stages: appealHop.updatedStages,
            sourceIndex: 0,
            destIndex: appealHop.newActiveIndex,
            appellantPartyIds: [2],
            today: '2026-08-21',
        });
        expect(afterAppeal[0]?.status).toBe('locked');
        expect(afterAppeal[1]?.status).toBe('active');

        const objectionHop = applyAppealStageTransition(
            afterAppeal,
            0,
            afterAppeal[0]!,
            {
                appealType: 'اعتراض على الحكم الغيابي',
                appellant: 'المدعى عليه',
                filingDate: '2026-08-22',
                newCaseNumber: '10/اعتراضية/2026',
                includedAppellantPartyIds: [3],
                priorStageOutcome: 'WIN',
            },
        );
        expect(objectionHop.updatedStages).toHaveLength(3);
        expect(objectionHop.updatedStages[0]?.status).toBe('locked');
        expect(objectionHop.updatedStages[1]?.status).toBe('active');
        expect(objectionHop.updatedStages[2]?.status).toBe('active');
        expect(String(objectionHop.updatedStages[2]?.stageName ?? '')).toContain('اعتراض');
        expect(String(objectionHop.updatedStages[1]?.stageName ?? '')).toContain('استئناف');
    });
});
