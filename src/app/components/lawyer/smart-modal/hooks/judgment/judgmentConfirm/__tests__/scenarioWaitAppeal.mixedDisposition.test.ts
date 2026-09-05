import { describe, expect, it, vi } from 'vitest';
import { applyWaitAppealScenarios } from '../scenarioWaitAppeal';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from '../judgmentConfirmTypes';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import type { SmartFileParentData } from '../../../../smartFile/parentDataInit';
import { computeFirstInstanceAppealDeadline } from '../../../../smartFile/appealDeadlineEngine';

const PARTIES = [
    { id: 1, name: 'أحمد علي', role: 'مدعي', isClient: true },
    { id: 2, name: 'سامي كاظم', role: 'مدعى عليه', isClient: false },
    { id: 3, name: 'كريم حسن', role: 'مدعى عليه', isClient: false },
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
    };
}

function firstInstanceStage(): CaseStage {
    return {
        id: 's0',
        name: 'بداءة بدرجة أولى',
        stageName: 'بداءة بدرجة أولى',
        status: 'active',
        parties: PARTIES,
    } as CaseStage;
}

function runWait(judgmentForm: string, dispositions?: Array<{ partyId: string; form: 'حضوري' | 'غيابي' }>) {
    const stages = [firstInstanceStage()];
    const currentStage = stages[0];
    const updatedStages = stages.map((s) => ({ ...s }));
    const scope: JudgmentConfirmScope = {
        stages,
        currentStage,
        activeStageIndex: 0,
        parentData: parent(),
        setStatus: vi.fn(),
        setActiveStageIndex: vi.fn(),
    };
    const rt: JudgmentConfirmRuntime = {
        judgmentData: {
            action: 'waiting_for_appeal',
            partyJudgmentDispositions: dispositions,
        },
        action: 'waiting_for_appeal',
        judgmentType: 'إجابة الدعوى بالكامل',
        judgmentForm,
        judgmentDate: '2026-08-04',
        notes: '',
        nextStage: '',
        now: new Date('2026-08-04T00:00:00'),
        stageName: 'بداءة بدرجة أولى',
        addDays: (date, days) => {
            const d = new Date(date);
            d.setDate(d.getDate() + days);
            return d.toISOString().slice(0, 10);
        },
        updatedStages,
        handled: false,
        successToast: '',
        openAppealModalAfterSave: false,
        openObjectionModalAfterSave: false,
        remandNewActiveIndex: null,
    };
    applyWaitAppealScenarios(scope, rt);
    return rt.updatedStages[0];
}

describe('applyWaitAppealScenarios — صفة الحكم لكل مدعى عليه', () => {
    it('الكل حضوري: مهلة استئناف دون تبليغ غيابي', () => {
        const saved = runWait('حضوري', [
            { partyId: '2', form: 'حضوري' },
            { partyId: '3', form: 'حضوري' },
        ]);
        expect(saved.judgmentForm).toBe('حضوري');
        expect(saved.lastJudgmentType).toBe('حضوري');
        expect(saved.awaitingAbsentJudgmentNotification).toBeFalsy();
        expect(saved.appealDeadline).toBe(computeFirstInstanceAppealDeadline('2026-08-04'));
    });

    it('الكل غيابي: تبليغ دون مهلة استئناف حضوري', () => {
        const saved = runWait('غيابي', [
            { partyId: '2', form: 'غيابي' },
            { partyId: '3', form: 'غيابي' },
        ]);
        expect(saved.judgmentForm).toBe('غيابي');
        expect(saved.lastJudgmentType).toBe('غيابي');
        expect(saved.awaitingAbsentJudgmentNotification).toBe(true);
        expect(saved.appealDeadline).toBeUndefined();
        expect(saved.finalDecision).toBe('حكم غيابي — بانتظار التبليغ والاعتراض');
    });

    it('غيابي بلا صفات فردية يبذر بطاقة لكل مدعى عليه', () => {
        const saved = runWait('غيابي', []);
        expect(saved.awaitingAbsentJudgmentNotification).toBe(true);
        expect(saved.partyJudgmentDispositions).toEqual([
            { partyId: '2', form: 'غيابي', operative: 'bound' },
            { partyId: '3', form: 'غيابي', operative: 'bound' },
        ]);
        expect(saved.partyChallengeLanes).toHaveLength(2);
        expect(saved.partyChallengeLanes?.every((lane) => !lane.servedAt)).toBe(true);
    });

    it('مختلط: يحتفظ بالصفتين ويفتح التبليغ ومهلة الاستئناف معاً', () => {
        const saved = runWait('مختلط', [
            { partyId: '2', form: 'حضوري' },
            { partyId: '3', form: 'غيابي' },
        ]);
        expect(saved.judgmentForm).toBe('مختلط');
        expect(saved.lastJudgmentType).toBeUndefined();
        expect(saved.partyJudgmentDispositions).toEqual([
            { partyId: '2', form: 'حضوري', operative: 'bound' },
            { partyId: '3', form: 'غيابي', operative: 'bound' },
        ]);
        expect(saved.awaitingAbsentJudgmentNotification).toBe(true);
        expect(saved.appealDeadline).toBe(computeFirstInstanceAppealDeadline('2026-08-04'));
        expect(saved.finalDecision).toBe('بانتظار التبليغ والطعن');
        expect(saved.timeline?.[0]?.title).toBe('حكم بـ إجابة الدعوى بالكامل');
        expect(saved.timeline?.[0]?.details).toContain('سامي كاظم — حضوري — إلزام');
        expect(saved.timeline?.[0]?.details).toContain('كريم حسن — غيابي — إلزام');
        expect(saved.timeline?.[0]?.details).not.toContain('مختلط');
        expect(saved.timeline?.[0]?.details).not.toContain('النتيجة للموكل');
        expect(saved.partyChallengeLanes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ partyId: '2', disposition: 'حضوري', laneState: 'pending' }),
                expect.objectContaining({
                    partyId: '3',
                    disposition: 'غيابي',
                    servedAt: null,
                    laneState: 'pending',
                }),
            ]),
        );
    });
});
