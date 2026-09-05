import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import { applyWaitAppealScenarios } from '../scenarioWaitAppeal';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from '../judgmentConfirmTypes';

function runWaitAppeal(
    action: string,
    stage: Partial<CaseStage>,
    judgmentType: string,
    judgmentForm = 'حضوري',
) {
    const currentStage = {
        id: 's1',
        name: 'البداءة',
        stageName: 'البداءة',
        status: 'active',
        parties: [
            { id: 1, name: 'موكل', role: 'المدعي', isClient: true },
            { id: 2, name: 'خصm', role: 'المدعى عليه', isClient: false },
        ],
        timeline: [],
        ...stage,
    } as CaseStage;

    const updatedStages = [currentStage];
    const rt: JudgmentConfirmRuntime = {
        handled: false,
        judgmentData: {},
        action,
        judgmentType,
        judgmentForm,
        judgmentDate: '2026-08-31',
        notes: '',
        nextStage: '',
        now: '2026-08-31',
        stageName: currentStage.stageName ?? 'البداءة',
        addDays: (d: string, n: number) => d,
        updatedStages,
    };

    const scope: JudgmentConfirmScope = {
        currentStage,
        activeStageIndex: 0,
        parentData: { representedParty: 'المدعي' },
        stages: updatedStages,
        setStatus: () => {},
        setActiveStageIndex: () => {},
    };

    applyWaitAppealScenarios(scope, rt);
    return updatedStages[0];
}

describe('scenarioWaitAppeal structured outcomes', () => {
    it('يكتب clientStageOutcome=WIN عند wait_opponent (مدعي + إجابة)', () => {
        const stage = runWaitAppeal('waiting_for_appeal', {}, 'إجابة الدعوى بالكامل');
        expect(stage?.clientStageOutcome).toBe('WIN');
        expect(stage?.awaitingOpponentAppeal).toBe(true);
    });

    it('يكتب clientStageOutcome=LOSS عند self_appeal (مدعي + رد)', () => {
        const stage = runWaitAppeal('waiting_for_appeal', {}, 'رد الدعوى كلياً');
        expect(stage?.clientStageOutcome).toBe('LOSS');
    });

    it('جزئي: PARTIAL مع انتظار طعن الخصم أيضاً', () => {
        const stage = runWaitAppeal('waiting_for_appeal', {}, 'رد الدعوى جزئياً');
        expect(stage?.clientStageOutcome).toBe('PARTIAL');
        expect(stage?.awaitingOpponentAppeal).toBe(true);
        expect(String(stage?.finalDecision ?? '')).toMatch(/جزئياً|طرفين/);
    });

    it('يكتب clientStageOutcome=WIN على seal_plaintiff_win', () => {
        const stage = runWaitAppeal('seal_plaintiff_win', {}, 'إجابة الدعوى بالكامل');
        expect(stage?.clientStageOutcome).toBe('WIN');
        expect(stage?.status).toBe('completed');
    });

    it('حكم الاستئناف لا يُختم غيابياً حتى لو وُرّث الشكل من البداءة', () => {
        const stage = runWaitAppeal(
            'waiting_for_cassation',
            { name: 'الاستئناف', stageName: 'الاستئناف' },
            'تأييد الحكم البدائي ورد الاستئناف',
            'غيابي',
        );
        expect(stage?.judgmentForm).toBe('حضوري');
        expect(stage?.lastJudgmentType).toBe('حضوري');
    });
});
