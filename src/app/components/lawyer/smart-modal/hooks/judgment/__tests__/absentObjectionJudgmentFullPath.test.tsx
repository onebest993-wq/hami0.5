import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { SmartJudgmentModal } from '../../../SmartJudgmentModal';
import { SmartFileModalThemeProvider } from '../../../smartFile/smartFileModalTheme';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../../smartFile/civilLawsuitTestIds';
import { applyJudgmentConfirm } from '../judgmentConfirm/applyJudgmentConfirm';
import type { UseSmartFileJudgmentActionsOptions } from '../judgmentHookTypes';
import type { CaseStage, Party } from '../../../../LawyerShared';
import type { SmartFileParentData } from '../../../smartFile/parentDataInit';
import { computeFirstInstanceAppealDeadline } from '../../../smartFile/appealDeadlineEngine';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const OBJECTED_PARTIES: Party[] = [
    { id: 1, name: 'أحمد علي', role: 'المعترض عليه بالحكم الغيابي (المدعي)', isClient: true },
    { id: 2, name: 'سامي كاظم', role: 'المعترض على الحكم الغيابي (المدعى عليه)', isClient: false },
];

function parent(): SmartFileParentData {
    return {
        id: 1,
        originalParties: OBJECTED_PARTIES,
        parties: OBJECTED_PARTIES,
        feesTotal: 0,
        feesPaid: 0,
        docType: 'دعوى',
        createdDate: '2026-08-04',
        representedParty: 'المدعي',
        caseNo: '111/ب/2026',
        status: 'active',
    };
}

function objectionStages(): CaseStage[] {
    return [
        {
            id: 's0',
            name: 'بداءة بدرجة أولى',
            stageName: 'بداءة بدرجة أولى',
            status: 'locked',
            parties: OBJECTED_PARTIES,
        },
        {
            id: 's-obj',
            name: 'الاعتراض على الحكم الغيابي',
            stageName: 'الاعتراض على الحكم الغيابي',
            status: 'active',
            parties: OBJECTED_PARTIES,
        },
    ] as CaseStage[];
}

function confirmOptions(stages: CaseStage[]): {
    options: UseSmartFileJudgmentActionsOptions;
    setStages: ReturnType<typeof vi.fn>;
} {
    const setStages = vi.fn();
    const options: UseSmartFileJudgmentActionsOptions = {
        stages,
        setStages,
        activeStageIndex: 1,
        setActiveStageIndex: vi.fn(),
        setViewingStageIndex: vi.fn(),
        currentStage: stages[1],
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
    return { options, setStages };
}

describe('مسار الحكم الكامل — اعتراض غيابي', () => {
    it('applyJudgmentConfirm يحفظ تأييد المعترض عليه بانتظار طعن المعترض ومهلة 15 يوماً', () => {
        const stages = objectionStages();
        const { options, setStages } = confirmOptions(stages);
        const ok = applyJudgmentConfirm(
            {
                action: 'waiting_for_appeal',
                judgmentType: 'إجابة الدعوى بالكامل',
                judgmentForm: 'حضوري',
                judgmentDate: '2026-08-04',
                notes: '',
                nextStage: '',
                stageName: 'الاعتراض على الحكم الغيابي',
                isPleadingsClosed: true,
            },
            options,
        );
        expect(ok).toBe(true);
        expect(setStages).toHaveBeenCalledTimes(1);
        const saved = setStages.mock.calls[0][0][1] as CaseStage;
        expect(saved.finalDecision).toBe('تأييد الحكم الغيابي — بانتظار طعن المعترض');
        expect(saved.awaitingOpponentAppeal).toBe(true);
        expect(saved.judgmentForm).toBe('حضوري');
        expect(saved.isPleadingsClosed).toBe(true);
        expect(saved.appealDeadline).toBe(computeFirstInstanceAppealDeadline('2026-08-04'));
    });

    it('النقر الحقيقي: pointerDown على التأييد ثم حفظ الانتظار يمر عبر applyJudgmentConfirm', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const stages = objectionStages();
        const { options, setStages } = confirmOptions(stages);

        render(
            <SmartFileModalThemeProvider variant="civil">
                <SmartJudgmentModal
                    isOpen
                    onClose={vi.fn()}
                    onConfirm={(data) => applyJudgmentConfirm(data, options)}
                    currentParties={OBJECTED_PARTIES}
                    currentStage="الاعتراض على الحكم الغيابي"
                    representedParty="المدعي"
                    stages={stages}
                    activeStageIndex={1}
                />
            </SmartFileModalThemeProvider>,
        );

        const trigger = screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOutcomePicker);
        fireEvent.click(trigger);
        const option = screen.getByRole('option', {
            name: /تأييد الحكم الغيابي — موكلك ربح الاعتراض/,
        });
        fireEvent.pointerDown(option);
        fireEvent.mouseDown(option);
        fireEvent.mouseUp(option);
        fireEvent.click(trigger);

        expect(screen.queryByRole('listbox')).toBeNull();
        expect(trigger.textContent ?? '').toContain('تأييد الحكم الغيابي — موكلك ربح الاعتراض');

        fireEvent.click(screen.getByRole('button', { name: /حفظ الحكم وانتظار طعن الخصم/ }));

        expect(setStages).toHaveBeenCalled();
        const saved = setStages.mock.calls[0][0][1] as CaseStage;
        expect(saved.finalDecision).toBe('تأييد الحكم الغيابي — بانتظار طعن المعترض');
        expect(saved.awaitingOpponentAppeal).toBe(true);
        expect(saved.judgmentForm).toBe('حضوري');
    });
});
