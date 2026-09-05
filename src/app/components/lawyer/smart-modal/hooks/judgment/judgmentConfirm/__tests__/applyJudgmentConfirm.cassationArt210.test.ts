import { describe, expect, it, vi } from 'vitest';
import { applyJudgmentConfirm } from '../applyJudgmentConfirm';
import type { UseSmartFileJudgmentActionsOptions } from '../../judgmentHookTypes';
import type { CaseStage, Party } from '@/app/components/lawyer/LawyerShared';
import type { SmartFileParentData } from '../../../smartFile/parentDataInit';
import {
    LANE_STATE_CASSATION,
    LANE_STATE_LAPSED_EXECUTABLE,
    LANE_STATE_REVIVED_BY_CASSATION_EXTENSION,
} from '@/app/domain/lawsuit/partyChallengeLanes';
import { CASSATION_JUDGMENT_REVERSE_FINAL } from '@/app/domain/lawsuit/cassationArt210';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

const PARTIES: Party[] = [
    { id: 1, name: 'أحمد', role: 'المميز عليه (المدعي)', isClient: true, side: 'right' },
    { id: 2, name: 'سامي', role: 'المميز (المدعى عليه)', isClient: false, side: 'left' },
    { id: 3, name: 'كريم', role: 'المميز عليه (المدعى عليه)', isClient: false, side: 'left' },
];

function parent(): SmartFileParentData {
    return {
        id: 1,
        originalParties: PARTIES,
        parties: PARTIES,
        feesTotal: 0,
        feesPaid: 0,
        docType: 'مطالبة بدين',
        createdDate: '2026-08-04',
        representedParty: 'المدعي',
        caseNo: '111/ب/2026',
        status: 'active',
        disputeIntegrity: 'indivisible',
    };
}

function dossier(): CaseStage[] {
    return [
        {
            id: 'fi',
            name: 'البداءة',
            stageName: 'البداءة',
            status: 'locked',
            parties: PARTIES,
            disputeIntegrity: 'indivisible',
            judgmentForm: 'مختلط',
            partyChallengeLanes: [
                { partyId: '2', disposition: 'حضوري', laneState: LANE_STATE_CASSATION },
                {
                    partyId: '3',
                    disposition: 'غيابي',
                    laneState: LANE_STATE_LAPSED_EXECUTABLE,
                    servedAt: '2026-08-04',
                },
            ],
        } as CaseStage,
        {
            id: 'cass',
            name: 'التمييز',
            stageName: 'التمييز',
            status: 'active',
            parties: PARTIES,
            timeline: [],
            appealMetadata: {
                appellantPartyIds: ['2'],
                appelleePartyIds: ['1', '3'],
                priorStageOutcome: 'LOSS',
                priorJudgmentForm: 'HADORI',
            },
        } as CaseStage,
    ];
}

function optionsFor(stages: CaseStage[]): UseSmartFileJudgmentActionsOptions & { setStages: ReturnType<typeof vi.fn> } {
    const setStages = vi.fn();
    return {
        stages,
        setStages,
        activeStageIndex: 1,
        setActiveStageIndex: vi.fn(),
        setViewingStageIndex: vi.fn(),
        currentStage: stages[1]!,
        parentData: parent(),
        saveToCloud: vi.fn(),
        setStatus: vi.fn(),
        tempJudgmentData: null,
        setTempJudgmentData: vi.fn(),
        setShowAppealTransitionModal: vi.fn(),
        setShowAppealModal: vi.fn(),
        setShowObjectionRegistrationModal: vi.fn(),
        setShowJudgmentModal: vi.fn(),
        setShowCrossAppealModal: vi.fn(),
        status: 'نشطة',
    };
}

describe('applyJudgmentConfirm — تمييز م/210 وم/214', () => {
    it('يحفظ نقض وإعادة مع إحياء الشريك', () => {
        const stages = dossier();
        const options = optionsFor(stages);
        const ok = applyJudgmentConfirm(
            {
                action: 'remand_to_lower',
                judgmentType: 'نقض الحكم وإعادة الإضبارة',
                judgmentForm: 'حضوري',
                judgmentDate: '2026-09-20',
                notes: '',
                stageName: 'التمييز',
                cassationGroundsScope: 'COMMON',
            },
            options,
        );
        expect(ok).toBe(true);
        const saved = options.setStages.mock.calls[0][0] as CaseStage[];
        expect(saved[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '3')?.laneState).toBe(
            LANE_STATE_REVIVED_BY_CASSATION_EXTENSION,
        );
        expect(saved[1]?.appealMetadata?.cassationGroundsScope).toBe('COMMON');
        expect(saved[0]?.status).toBe('active');
    });

    it('يختم النقض والفصل في الموضوع دون إحياء الشركاء', () => {
        const stages = dossier();
        const options = optionsFor(stages);
        const ok = applyJudgmentConfirm(
            {
                action: 'reverse_final',
                judgmentType: CASSATION_JUDGMENT_REVERSE_FINAL,
                judgmentForm: 'حضوري',
                judgmentDate: '2026-09-20',
                notes: '',
                stageName: 'التمييز',
            },
            options,
        );
        expect(ok).toBe(true);
        const saved = options.setStages.mock.calls[0][0] as CaseStage[];
        expect(saved[1]?.finalDecision).toBe(CASSATION_JUDGMENT_REVERSE_FINAL);
        expect(saved[1]?.status).toBe('completed');
        expect(saved[0]?.status).toBe('locked');
        expect(saved[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '3')?.laneState).toBe(
            LANE_STATE_LAPSED_EXECUTABLE,
        );
    });
});
