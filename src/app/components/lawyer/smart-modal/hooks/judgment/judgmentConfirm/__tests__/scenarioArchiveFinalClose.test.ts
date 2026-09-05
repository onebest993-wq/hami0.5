import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../../LawyerShared';
import { applyArchiveScenarios } from '../scenarioArchive';
import { applyFinalCloseScenario } from '../scenarioFinalClose';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from '../judgmentConfirmTypes';
import {
    resolveOpponentAppealPriorOutcome,
} from '../../../../smartFile/stageOutcomeResolution';

function baseStage(overrides: Partial<CaseStage> = {}): CaseStage {
    return {
        id: 's1',
        name: 'البداءة',
        stageName: 'البداءة',
        status: 'active',
        parties: [
            { id: 1, name: 'موكل', role: 'المدعي', isClient: true },
            { id: 2, name: 'خصم', role: 'المدعى عليه', isClient: false },
        ],
        timeline: [],
        ...overrides,
    } as CaseStage;
}

function makeRt(
    action: string,
    judgmentType: string,
    updatedStages: CaseStage[],
): JudgmentConfirmRuntime {
    return {
        handled: false,
        judgmentData: {},
        action,
        judgmentType,
        judgmentForm: 'حضوري',
        judgmentDate: '2026-08-31',
        notes: '',
        nextStage: '',
        now: '2026-08-31',
        stageName: 'البداءة',
        addDays: (d: string, n: number) => `${d}+${n}`,
        updatedStages,
    };
}

function makeScope(currentStage: CaseStage, updatedStages: CaseStage[]): JudgmentConfirmScope {
    return {
        currentStage,
        activeStageIndex: 0,
        parentData: { representedParty: 'المدعي' },
        stages: updatedStages,
        setStatus: () => {},
        setActiveStageIndex: () => {},
    };
}

describe('scenarioArchive / finalClose structured outcomes', () => {
    it('finalize_non_merit يكتب clientStageOutcome=FINALIZED', () => {
        const currentStage = baseStage();
        const updatedStages = [currentStage];
        applyArchiveScenarios(
            makeScope(currentStage, updatedStages),
            makeRt('finalize_non_merit', 'الصلح', updatedStages),
        );
        expect(updatedStages[0]?.clientStageOutcome).toBe('FINALIZED');
        expect(updatedStages[0]?.status).toBe('completed');
    });

    it('archive_annulled يكتب clientStageOutcome=FINALIZED', () => {
        const currentStage = baseStage();
        const updatedStages = [currentStage];
        applyArchiveScenarios(
            makeScope(currentStage, updatedStages),
            makeRt('archive_annulled', 'إبطال', updatedStages),
        );
        expect(updatedStages[0]?.clientStageOutcome).toBe('FINALIZED');
    });

    it('final_close يكتب LOSS عند رد الدعوى للمدعي', () => {
        const currentStage = baseStage();
        const updatedStages = [currentStage];
        applyFinalCloseScenario(
            makeScope(currentStage, updatedStages),
            makeRt('final_close', 'رد الدعوى كلياً', updatedStages),
        );
        expect(updatedStages[0]?.clientStageOutcome).toBe('LOSS');
        expect(updatedStages[0]?.legalTimers?.finalAppealDeadline).toBeTruthy();
    });
});

describe('resolveOpponentAppealPriorOutcome', () => {
    it('يفضّل clientStageOutcome الصريح', () => {
        expect(
            resolveOpponentAppealPriorOutcome({
                clientStageOutcome: 'PARTIAL',
                awaitingOpponentAppeal: true,
            }),
        ).toBe('PARTIAL');
    });

    it('يفترض WIN عند انتظار طعن الخصم بلا outcome', () => {
        expect(
            resolveOpponentAppealPriorOutcome({ awaitingOpponentAppeal: true }),
        ).toBe('WIN');
    });
});
