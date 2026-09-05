import { describe, expect, it, vi } from 'vitest';
import type { CaseStage, Party } from '../../../../LawyerShared';
import { applyCassationScenarios } from '../scenarioCassation';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from '../judgmentConfirmTypes';
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

function firstInstance(overrides: Partial<CaseStage> = {}): CaseStage {
    return {
        id: 'fi',
        name: 'البداءة',
        stageName: 'البداءة',
        status: 'locked',
        parties: PARTIES,
        disputeIntegrity: 'indivisible',
        judgmentForm: 'مختلط',
        partyJudgmentDispositions: [
            { partyId: '2', form: 'حضوري' },
            { partyId: '3', form: 'غيابي' },
        ],
        partyChallengeLanes: [
            { partyId: '2', disposition: 'حضوري', laneState: LANE_STATE_CASSATION },
            {
                partyId: '3',
                disposition: 'غيابي',
                laneState: LANE_STATE_LAPSED_EXECUTABLE,
                servedAt: '2026-08-04',
            },
        ],
        ...overrides,
    } as CaseStage;
}

function cassationStage(): CaseStage {
    return {
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
        clientStageOutcome: 'LOSS',
    } as CaseStage;
}

function runCassation(
    action: string,
    judgmentType: string,
    extras?: { grounds?: 'COMMON' | 'PERSONAL'; fi?: Partial<CaseStage> },
) {
    const fi = firstInstance(extras?.fi);
    const cassation = cassationStage();
    const updatedStages = [fi, cassation];
    const rt: JudgmentConfirmRuntime = {
        handled: false,
        judgmentData: extras?.grounds ? { cassationGroundsScope: extras.grounds } : {},
        action,
        judgmentType,
        judgmentForm: 'حضوري',
        judgmentDate: '2026-09-20',
        notes: '',
        nextStage: '',
        now: '2026-09-20' as unknown as Date,
        stageName: 'التمييز',
        addDays: () => '2026-09-20',
        updatedStages,
        successToast: '',
        openAppealModalAfterSave: false,
        openObjectionModalAfterSave: false,
        remandNewActiveIndex: null,
    };
    const scope: JudgmentConfirmScope = {
        currentStage: cassation,
        activeStageIndex: 1,
        parentData: { representedParty: 'المدعي', disputeIntegrity: 'indivisible' },
        stages: updatedStages,
        setStatus: () => {},
        setActiveStageIndex: () => {},
    };
    applyCassationScenarios(scope, rt);
    return { rt, updatedStages };
}

describe('scenarioCassation — م/210 وم/214', () => {
    it('يعيد الإضبارة ويحيي الشريك عند أسباب مشتركة ونزاع غير قابل للتجزئة', () => {
        const { rt, updatedStages } = runCassation(
            'remand_to_lower',
            'نقض الحكم وإعادة الإضبارة',
        );
        expect(rt.handled).toBe(true);
        expect(rt.remandNewActiveIndex).toBe(0);
        expect(updatedStages[1]?.appealMetadata?.cassationGroundsScope).toBe('COMMON');
        expect(updatedStages[0]?.status).toBe('active');
        expect(updatedStages[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '3')?.laneState).toBe(
            LANE_STATE_REVIVED_BY_CASSATION_EXTENSION,
        );
        expect(updatedStages[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '2')?.laneState).toBe(
            LANE_STATE_CASSATION,
        );
    });

    it('لا يمد الأثر عند أسباب شخصية', () => {
        const { updatedStages } = runCassation(
            'remand_to_lower',
            'نقض الحكم وإعادة الإضبارة',
            { grounds: 'PERSONAL' },
        );
        expect(updatedStages[1]?.appealMetadata?.cassationGroundsScope).toBe('PERSONAL');
        expect(updatedStages[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '3')?.laneState).toBe(
            LANE_STATE_LAPSED_EXECUTABLE,
        );
    });

    it('نقض والفصل في الموضوع يختم التمييز بلا إعادة', () => {
        const { rt, updatedStages } = runCassation('reverse_final', CASSATION_JUDGMENT_REVERSE_FINAL);
        expect(rt.handled).toBe(true);
        expect(rt.remandNewActiveIndex).toBeNull();
        expect(rt.nextCaseStatus).toBe('مكتسبة الدرجة القطعية');
        expect(updatedStages[1]?.status).toBe('completed');
        expect(updatedStages[1]?.finalDecision).toBe(CASSATION_JUDGMENT_REVERSE_FINAL);
        expect(updatedStages[0]?.status).toBe('locked');
        expect(updatedStages[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '3')?.laneState).toBe(
            LANE_STATE_LAPSED_EXECUTABLE,
        );
    });
});
