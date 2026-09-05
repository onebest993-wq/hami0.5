import { describe, expect, it, vi } from 'vitest';
import { applyJudgmentConfirm } from '../applyJudgmentConfirm';
import type { UseSmartFileJudgmentActionsOptions } from '../../judgmentHookTypes';
import type { CaseStage, Party } from '@/app/components/lawyer/LawyerShared';
import type { SmartFileParentData } from '../../../smartFile/parentDataInit';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

const PARTIES: Party[] = [
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
        caseNo: '111/ب/2026',
        status: 'active',
    };
}

function stages(): CaseStage[] {
    return [
        {
            id: 's0',
            name: 'بداءة بدرجة أولى',
            stageName: 'بداءة بدرجة أولى',
            status: 'active',
            parties: PARTIES,
        } as CaseStage,
    ];
}

describe('applyJudgmentConfirm — dispositions مختلطة', () => {
    it('يختم المرحلة بالملخص المختلط دون محو صفة الأطراف', () => {
        const nextStages = stages();
        const setStages = vi.fn();
        const saveToCloud = vi.fn();
        const options: UseSmartFileJudgmentActionsOptions = {
            stages: nextStages,
            setStages,
            activeStageIndex: 0,
            setActiveStageIndex: vi.fn(),
            setViewingStageIndex: vi.fn(),
            currentStage: nextStages[0],
            parentData: parent(),
            saveToCloud,
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

        const ok = applyJudgmentConfirm(
            {
                action: 'waiting_for_appeal',
                judgmentType: 'إجابة الدعوى بالكامل',
                judgmentForm: 'مختلط',
                judgmentDate: '2026-08-04',
                notes: '',
                nextStage: '',
                stageName: 'بداءة بدرجة أولى',
                isPleadingsClosed: true,
                disputeIntegrity: 'severable',
                partyJudgmentDispositions: [
                    { partyId: '2', form: 'حضوري' },
                    { partyId: '3', form: 'غيابي' },
                ],
            },
            options,
        );

        expect(ok).toBe(true);
        const saved = setStages.mock.calls[0][0][0] as CaseStage;
        expect(saved.judgmentForm).toBe('مختلط');
        expect(saved.lastJudgmentType).toBeUndefined();
        expect(saved.partyJudgmentDispositions).toEqual([
            { partyId: '2', form: 'حضوري', operative: 'bound' },
            { partyId: '3', form: 'غيابي', operative: 'bound' },
        ]);
        expect(saved.disputeIntegrity).toBe('severable');
        expect(saved.awaitingAbsentJudgmentNotification).toBe(true);
        expect(saved.partyChallengeLanes?.some((lane) => lane.partyId === '3' && lane.disposition === 'غيابي')).toBe(
            true,
        );
        expect(saveToCloud.mock.calls[0][1]).toEqual(
            expect.objectContaining({ disputeIntegrity: 'severable' }),
        );
    });

    it('يرفض تثبيت حكم جديد أثناء استئخار الاستئناف (م/172)', async () => {
        const { SmartToast } = await import('@/app/components/ui/SmartToast');
        const { ART172_STAY_BADGE, ART172_SUSPENSION_REASON } = await import(
            '@/app/components/lawyer/smart-modal/smartFile/art172AppealStay'
        );
        const appeal: CaseStage = {
            id: 's1',
            name: 'الاستئناف',
            stageName: 'الاستئناف',
            status: 'active',
            parties: PARTIES,
            isSuspended: true,
            suspensionReason: ART172_SUSPENSION_REASON,
        } as CaseStage;
        const setStages = vi.fn();
        const options: UseSmartFileJudgmentActionsOptions = {
            stages: [appeal],
            setStages,
            activeStageIndex: 0,
            setActiveStageIndex: vi.fn(),
            setViewingStageIndex: vi.fn(),
            currentStage: appeal,
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

        const ok = applyJudgmentConfirm(
            {
                action: 'waiting_for_appeal',
                judgmentType: 'تأييد الحكم البدائي ورد الاستئناف',
                judgmentForm: 'حضوري',
                judgmentDate: '2026-09-01',
                notes: '',
                nextStage: '',
                stageName: 'الاستئناف',
                isPleadingsClosed: true,
            },
            options,
        );

        expect(ok).toBe(false);
        expect(setStages).not.toHaveBeenCalled();
        expect(SmartToast.info).toHaveBeenCalledWith(ART172_STAY_BADGE);
    });
});
