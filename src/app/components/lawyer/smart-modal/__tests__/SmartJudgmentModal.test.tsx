import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { SmartJudgmentModal } from '../SmartJudgmentModal';
import { SmartFileModalThemeProvider } from '../smartFile/smartFileModalTheme';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { SmartFileStageFooterBar } from '../layout/mainPanel/SmartFileStageFooterBar';
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
    isPartialJudgment: false,
    hasStaggeredCoLitigants: false,
    pendingCrossAppellants: [],
    crossAppellees: [],
    filedCrossAppellants: [],
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

describe('SmartJudgmentModal', () => {
    it('يخفّف الغلاف: بلا تدرج ذهبي وبأزرار 44px', () => {
        renderJudgment();
        const modal = screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentModal);
        const shell = modal.querySelector('[class*="max-w-xl"]');
        expect(shell).not.toBeNull();
        expect(modal.innerHTML).not.toContain('from-[#E6C673]/[0.06]');
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadari).className).toContain(
            'min-h-[44px]',
        );
        expect(screen.getByLabelText('إغلاق').className).toContain('min-h-[44px]');
    });

    it('البداءة: تبديل غيابي ثم حفظ الحكم', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const { onConfirm, onClose } = renderJudgment({ currentStage: 'بداءة بدرجة أولى' });

        expect(screen.getByRole('heading', { name: 'ختم المرافعة وقرار الحكم' })).toBeTruthy();
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabi));
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabi).getAttribute('aria-pressed')).toBe(
            'true',
        );

        pickOutcome(/إجابة الدعوى بالكامل/);
        fireEvent.click(screen.getByRole('button', { name: /حفظ الحكم وانتظار طعن الخصم/ }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'waiting_for_appeal',
                judgmentType: 'إجابة الدعوى بالكامل',
                judgmentForm: 'غيابي',
                isPleadingsClosed: true,
                stageName: 'بداءة بدرجة أولى',
            }),
        );
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('الاستئناف: بلا شكل حكم ويحفظ انتظار التمييز', () => {
        const { onConfirm } = renderJudgment({ currentStage: 'الاستئناف' });

        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadari)).toBeNull();
        pickOutcome(/تأييد الحكم المستأنف ورد الاستئناف/);
        fireEvent.click(screen.getByRole('button', { name: /حفظ وانتظار تمييز الخصم/ }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'waiting_for_cassation',
                judgmentType: 'تأييد الحكم البدائي ورد الاستئناف',
                stageName: 'الاستئناف',
            }),
        );
    });

    it('التمييز: يختم الإضبارة بعد التصديق', () => {
        const { onConfirm } = renderJudgment({ currentStage: 'التمييز' });

        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadari)).toBeNull();
        pickOutcome('تصديق الحكم');
        fireEvent.click(screen.getByRole('button', { name: /ختم الإضبارة/ }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'final_ratification',
                judgmentType: 'تصديق الحكم',
                stageName: 'التمييز',
            }),
        );
    });

    it('تصحيح القرار: عنوان المرحلة وإتمام القبول', () => {
        const { onConfirm } = renderJudgment({ currentStage: 'تصحيح قرار' });

        expect(screen.getByRole('heading', { name: 'قرار طلب تصحيح القرار التمييزي' })).toBeTruthy();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadari)).toBeNull();
        pickOutcome('قبول طلب التصحيح');
        fireEvent.click(screen.getByRole('button', { name: /إتمام التصحيح والعودة لمرحلة الترافع/ }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'correction_complete',
                judgmentType: 'قبول طلب التصحيح',
                stageName: 'تصحيح قرار',
            }),
        );
    });

    it('الأحوال الشخصية: شكل الحكم يظهر ويُحفظ', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const { onConfirm } = renderJudgment({ currentStage: 'أحوال شخصية' });

        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadari)).toBeTruthy();
        pickOutcome(/إجابة الدعوى بالكامل/);
        fireEvent.click(screen.getByRole('button', { name: /حفظ الحكم وانتظار طعن الخصم/ }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                judgmentType: 'إجابة الدعوى بالكامل',
                judgmentForm: 'حضوري',
                stageName: 'أحوال شخصية',
            }),
        );
    });

    it('الاعتراض الغيابي: عنوان خاص بلا تبديل حضوري/غيابي', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const { onConfirm } = renderJudgment({ currentStage: 'اعتراض على الحكم الغيابي' });

        expect(screen.getByRole('heading', { name: 'ختام المرافعة وقرار الاعتراض' })).toBeTruthy();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadari)).toBeNull();
        pickOutcome(/تأييد الحكم الغيابي/);
        fireEvent.click(screen.getByRole('button', { name: /حفظ الحكم وانتظار طعن الخصم/ }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                judgmentType: 'إجابة الدعوى بالكامل',
                judgmentForm: 'حضوري',
                stageName: 'اعتراض على الحكم الغيابي',
            }),
        );
    });

    it('تأييد الغيابي لوكيل المعترض عليه يثبت الاختيار ويظهر انتظار طعن المعترض', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const objectedParties: Party[] = [
            { id: 1, name: 'أحمد علي', role: 'المعترض عليه بالحكم الغيابي (المدعي)', isClient: true },
            { id: 2, name: 'سامي كاظم', role: 'المعترض على الحكم الغيابي (المدعى عليه)', isClient: false },
        ];
        const { onConfirm } = renderJudgment({
            currentStage: 'الاعتراض على الحكم الغيابي',
            currentParties: objectedParties,
            representedParty: 'المدعي',
        });

        const trigger = screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOutcomePicker);
        fireEvent.click(trigger);
        const option = screen.getByRole('option', {
            name: /تأييد الحكم الغيابي — موكلك ربح الاعتراض/,
        });
        fireEvent.pointerDown(option);
        fireEvent.click(trigger);

        expect(screen.queryByRole('listbox')).toBeNull();
        expect(trigger.textContent ?? '').toContain('تأييد الحكم الغيابي — موكلك ربح الاعتراض');
        expect(screen.getByRole('button', { name: /حفظ الحكم وانتظار طعن الخصم/ })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /حفظ والانتقال لمرحلة الطعن/ })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /حفظ الحكم وانتظار طعن الخصم/ }));
        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'waiting_for_appeal',
                judgmentType: 'إجابة الدعوى بالكامل',
                judgmentForm: 'حضوري',
                stageName: 'الاعتراض على الحكم الغيابي',
            }),
        );
    });

    it('شريط المرحلة يفتح نافذة الحكم في البداءة والتمييز والتصحيح', () => {
        const setShow = vi.fn();
        const stages = [
            { name: 'البداءة', label: 'ختام المرافعة' },
            { name: 'التمييز', label: 'تحديد نتيجة القرار التمييزي' },
            { name: 'تصحيح قرار', label: 'تحديد نتيجة طلب التصحيح' },
        ] as const;

        for (const stage of stages) {
            cleanup();
            setShow.mockClear();
            render(
                <SmartFileStageFooterBar
                    isViewingArchived={false}
                    showOpponentAppealBtnEffective={false}
                    showAbsentJudgmentFooter={false}
                    showPostJudgmentAppealFooter={false}
                    showAppealStageFooter={false}
                    showPetitionVoidFooter={false}
                    displayStage={{ id: 's1', name: stage.name, stageName: stage.name, status: 'active' }}
                    crossAppealEligibility={IDLE_CROSS_APPEAL}
                    setShowCrossAppealModal={vi.fn()}
                    petitionVoidFooterPanel={null}
                    absentJudgmentFooterPanel={null}
                    opponentAppealFooterPanel={null}
                    appealStageFooterPanel={null}
                    postJudgmentAppealFooterPanel={null}
                    showPleadingCloseFooter
                    showFlowStatusFooter={false}
                    setShowJudgmentModal={setShow}
                    flowStatusFooterPanel={null}
                />,
            );
            fireEvent.click(screen.getByRole('button', { name: stage.label }));
            expect(setShow).toHaveBeenCalledWith(true);
        }
    });
});
