import { describe, expect, it, vi } from 'vitest';
import { applyWaitAppealScenarios } from '../scenarioWaitAppeal';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from '../judgmentConfirmTypes';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import type { SmartFileParentData } from '../../../../smartFile/parentDataInit';
import { computeFirstInstanceAppealDeadline } from '../../../../smartFile/appealDeadlineEngine';

const OBJECTED_PARTIES = [
    {
        id: 1,
        name: 'أحمد علي',
        role: 'المعترض عليه بالحكم الغيابي (المدعي)',
        isClient: true,
    },
    {
        id: 2,
        name: 'سامي كاظم',
        role: 'المعترض على الحكم الغيابي (المدعى عليه)',
        isClient: false,
    },
];

function parentData(overrides: Partial<SmartFileParentData> = {}): SmartFileParentData {
    return {
        id: 1,
        originalParties: OBJECTED_PARTIES,
        parties: OBJECTED_PARTIES,
        feesTotal: 0,
        feesPaid: 0,
        docType: 'دعوى',
        createdDate: '2026-08-04',
        representedParty: 'المدعي',
        ...overrides,
    };
}

function stage(overrides: Partial<CaseStage> = {}): CaseStage {
    return {
        id: 's-obj',
        name: 'الاعتراض على الحكم الغيابي',
        stageName: 'الاعتراض على الحكم الغيابي',
        status: 'active',
        parties: OBJECTED_PARTIES,
        ...overrides,
    } as CaseStage;
}

function runWait(params: {
    stageName: string;
    stages: CaseStage[];
    judgmentType?: string;
    parent?: SmartFileParentData;
}): { scope: JudgmentConfirmScope; rt: JudgmentConfirmRuntime } {
    const currentStage = params.stages[params.stages.length - 1];
    const updatedStages = params.stages.map((s) => ({ ...s }));
    const scope: JudgmentConfirmScope = {
        stages: params.stages,
        currentStage,
        activeStageIndex: params.stages.length - 1,
        parentData: params.parent ?? parentData(),
        setStatus: vi.fn(),
        setActiveStageIndex: vi.fn(),
    };
    const rt: JudgmentConfirmRuntime = {
        judgmentData: { action: 'waiting_for_appeal' },
        action: 'waiting_for_appeal',
        judgmentType: params.judgmentType ?? 'إجابة الدعوى بالكامل',
        judgmentForm: 'حضوري',
        judgmentDate: '2026-08-04',
        notes: '',
        nextStage: '',
        now: new Date('2026-08-04T00:00:00'),
        stageName: params.stageName,
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
    return { scope, rt };
}

describe('applyWaitAppealScenarios — اعتراض الحكم الغيابي', () => {
    it('تأييد الغيابي لوكيل المعترض عليه: انتظار طعن المعترض + مهلة استئناف 15 يوماً في المدني', () => {
        const civil = stage();
        const { rt } = runWait({
            stageName: 'الاعتراض على الحكم الغيابي',
            stages: [stage({ id: 's0', name: 'بداءة بدرجة أولى', stageName: 'بداءة بدرجة أولى' }), civil],
        });
        const saved = rt.updatedStages[1];
        expect(saved.finalDecision).toBe('تأييد الحكم الغيابي — بانتظار طعن المعترض');
        expect(saved.awaitingOpponentAppeal).toBe(true);
        expect(saved.judgmentForm).toBe('حضوري');
        expect(saved.appealDeadline).toBe(computeFirstInstanceAppealDeadline('2026-08-04'));
        expect(String(saved.timeline?.[0]?.details ?? '')).toContain('الاستئناف');
    });

    it('تعديل الحكم بالكامل لوكيل المعترض عليه: طعن الموكل بلا انتظار الخصم', () => {
        const { rt } = runWait({
            stageName: 'اعتراض على الحكم الغيابي',
            stages: [
                stage({ id: 's0', name: 'بداءة بدرجة أولى', stageName: 'بداءة بدرجة أولى' }),
                stage({ name: 'اعتراض على الحكم الغيابي', stageName: 'اعتراض على الحكم الغيابي' }),
            ],
            judgmentType: 'رد الدعوى كلياً',
        });
        const saved = rt.updatedStages[1];
        expect(saved.finalDecision).toBe('تعديل الحكم الغيابي — يحق لموكلك الطعن');
        expect(saved.awaitingOpponentAppeal).toBe(false);
        expect(saved.appealDeadline).toBe(computeFirstInstanceAppealDeadline('2026-08-04'));
    });

    it('في الأحوال الشخصية: تمييز فقط بلا مهلة استئناف', () => {
        const { rt } = runWait({
            stageName: 'الاعتراض على الحكم الغيابي',
            stages: [
                stage({ id: 's0', name: 'أحوال شخصية', stageName: 'أحوال شخصية' }),
                stage(),
            ],
            parent: parentData({ docType: 'أحوال شخصية' }),
        });
        const saved = rt.updatedStages[1];
        expect(saved.finalDecision).toBe('تأييد الحكم الغيابي — بانتظار طعن المعترض');
        expect(saved.appealDeadline).toBeUndefined();
        expect(String(saved.timeline?.[0]?.details ?? '')).toContain('التمييز');
        expect(String(saved.timeline?.[0]?.details ?? '')).not.toContain('الاستئناف');
    });
});
