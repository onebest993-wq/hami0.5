import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { SmartJudgmentModal } from '../SmartJudgmentModal';
import { SmartFileModalThemeProvider } from '../smartFile/smartFileModalTheme';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { SmartFileStageFooterBar } from '../layout/mainPanel/SmartFileStageFooterBar';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { Party } from '../../LawyerShared';
import type { CrossAppealEligibility } from '../smartFile/crossAppealEngine';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const PARTIES: Party[] = [
    { id: 1, name: 'أحمد علي', role: 'مدعي', isClient: true },
    { id: 2, name: 'سامي كاظم', role: 'مدعى عليه', isClient: false },
];

const IDLE_CROSS_APPEAL: CrossAppealEligibility = {
    showButton: false,
    canFileCrossAppeal: false,
    isPleadingClosed: false,
    isPartialJudgment: false,
    hasStaggeredCoLitigants: false,
    pendingCrossAppellants: [],
    crossAppellees: [],
    filedCrossAppellants: [],
    clientRole: null,
};

function renderJudgment(props: Partial<React.ComponentProps<typeof SmartJudgmentModal>> = {}) {
    const onConfirm = vi.fn(() => true);
    const onClose = vi.fn();
    render(
        <SmartFileModalThemeProvider variant="civil">
            <SmartJudgmentModal
                isOpen
                onClose={onClose}
                onConfirm={onConfirm}
                currentParties={PARTIES}
                currentStage="البداءة"
                representedParty="المدعي"
                {...props}
            />
        </SmartFileModalThemeProvider>,
    );
    return { onConfirm, onClose };
}

function pickOutcome(label: string | RegExp) {
    fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOutcomePicker));
    const option = screen.getByRole('option', { name: label });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
}

function setJudgmentDate(ymd = '2026-08-31') {
    fireEvent.change(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentDate), {
        target: { value: ymd },
    });
}

describe('SmartJudgmentModal', () => {
    it('يخفّف الغلاف: بلا تدرج ذهبي وبأزرار 44px', () => {
        renderJudgment();
        const modal = screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentModal);
        expect(modal.innerHTML).not.toContain('from-[#E6C673]/[0.06]');
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadari).className).toContain(
            'min-h-[44px]',
        );
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOutcomePicker)).toBeTruthy();
    });

    it('لا يحفظ الحكم إذا بقي تاريخ الحكم فارغاً', () => {
        const toastError = vi.spyOn(SmartToast, 'error').mockImplementation(() => '');
        const { onConfirm } = renderJudgment({ currentStage: 'بداءة بدرجة أولى' });
        pickOutcome(/إجابة الدعوى بالكامل/);
        fireEvent.click(screen.getByRole('button', { name: /حفظ الحكم وانتظار طعن الخصم/ }));
        expect(onConfirm).not.toHaveBeenCalled();
        expect(toastError).toHaveBeenCalled();
    });

    it('البداءة: تبديل غيابي ثم حفظ الحكم', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const { onConfirm, onClose } = renderJudgment({ currentStage: 'بداءة بدرجة أولى' });

        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabi));
        pickOutcome(/إجابة الدعوى بالكامل/);
        setJudgmentDate();
        fireEvent.click(screen.getByRole('button', { name: /حفظ الحكم وانتظار طعن الخصم/ }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'waiting_for_appeal',
                judgmentType: 'إجابة الدعوى بالكامل',
                judgmentForm: 'غيابي',
                isPleadingsClosed: true,
            }),
        );
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('شريط المرحلة يبدأ بختام المرافعة ثم تاريخ القرار', () => {
        const setJudgment = vi.fn();
        const setAdjourn = vi.fn();
        const setPendingDate = vi.fn();
        render(
            <SmartFileStageFooterBar
                isViewingArchived={false}
                showOpponentAppealBtnEffective={false}
                showAbsentJudgmentFooter={false}
                showPostJudgmentAppealFooter={false}
                showAppealStageFooter={false}
                showPetitionVoidFooter={false}
                displayStage={{ id: 's1', name: 'البداءة', stageName: 'البداءة', status: 'active' }}
                crossAppealEligibility={IDLE_CROSS_APPEAL}
                setShowCrossAppealModal={vi.fn()}
                petitionVoidFooterPanel={null}
                absentJudgmentFooterPanel={null}
                opponentAppealFooterPanel={null}
                appealStageFooterPanel={null}
                postJudgmentAppealFooterPanel={null}
                showPleadingCloseFooter
                showFlowStatusFooter={false}
                setShowJudgmentModal={setJudgment}
                setShowAdjournPleadingModal={setAdjourn}
                setPendingJudgmentDate={setPendingDate}
                flowStatusFooterPanel={null}
            />,
        );
        expect(screen.getByRole('button', { name: 'ختام المرافعة' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'ختام المرافعة' }));
        expect(screen.getByText('تاريخ صدور القرار')).toBeTruthy();
    });
});
