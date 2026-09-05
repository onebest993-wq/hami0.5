import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const LOCK_SAVE_BTN = /حفظ الحكم/;
const LOCK_SAVE_TESTID = 'smart-judgment-lock-save';

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
        fireEvent.click(screen.getByRole('button', { name: LOCK_SAVE_BTN }));
        expect(onConfirm).not.toHaveBeenCalled();
        expect(toastError).toHaveBeenCalled();
    });

    it('البداءة: تبديل غيابي ثم حفظ الحكم', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const { onConfirm, onClose } = renderJudgment({ currentStage: 'بداءة بدرجة أولى' });

        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabi));
        pickOutcome(/إجابة الدعوى بالكامل/);
        setJudgmentDate();
        fireEvent.click(screen.getByRole('button', { name: LOCK_SAVE_BTN }));

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

    it('مدعى عليه واحد يبقي أزرار الشكل الموحدة', () => {
        renderJudgment({ currentStage: 'بداءة بدرجة أولى' });
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadari)).toBeTruthy();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentPartyFormList)).toBeNull();
    });

    it('مدعى عليهما: صفة لكل طرف ثم حفظ مختلط غير قابل للتجزئة', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const parties: Party[] = [
            { id: 1, name: 'أحمد علي', role: 'مدعي', isClient: true },
            { id: 2, name: 'سامي كاظم', role: 'مدعى عليه', isClient: false },
            { id: 3, name: 'كريم حسن', role: 'مدعى عليه', isClient: false },
        ];
        const { onConfirm } = renderJudgment({
            currentParties: parties,
            currentStage: 'بداءة بدرجة أولى',
            caseDocType: 'مطالبة بدين',
        });

        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadari)).toBeNull();
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentPartyFormList)).toBeTruthy();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOutcomePicker)).toBeNull();
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentDerivedOutcome)).toHaveTextContent(
            'إجابة الدعوى بالكامل',
        );
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentBoundMeritFull)).toBeTruthy();
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabiParty(3)));
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOperativeBoundParty(2))).toBeTruthy();
        setJudgmentDate();
        fireEvent.click(screen.getByRole('button', { name: LOCK_SAVE_BTN }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'waiting_for_appeal',
                judgmentType: 'إجابة الدعوى بالكامل',
                judgmentForm: 'مختلط',
                disputeIntegrity: 'indivisible',
                partyJudgmentDispositions: [
                    { partyId: '2', form: 'حضوري', operative: 'bound' },
                    { partyId: '3', form: 'غيابي', operative: 'bound' },
                ],
            }),
        );
    });

    it('أربعة مدعى عليهم + انضمامي: يُحفظ مختلطاً ويظهر الانضمامي في القائمة', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const parties: Party[] = [
            { id: 1, name: 'أحمد', role: 'مدعي', isClient: true },
            { id: 11, name: 'باسم', role: 'مدعي', isClient: false },
            { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
            { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: false },
            { id: 4, name: 'نادر', role: 'مدعى عليه', isClient: false },
            { id: 5, name: 'هيثم', role: 'مدعى عليه', isClient: false },
            { id: 7, name: 'هناء', role: 'شخص ثالث انضمامي — جانب المدعى عليه', isClient: false },
        ];
        const { onConfirm } = renderJudgment({
            currentParties: parties,
            currentStage: 'بداءة بدرجة أولى',
            caseDocType: 'إزالة شيوع',
        });

        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentPartyFormList)).toBeTruthy();
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabiParty(5))).toBeTruthy();
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabiParty(7))).toBeTruthy();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentIntegrityIndivisible)).toBeNull();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentIntegritySeverable)).toBeNull();
        expect(screen.queryByText('وحدة النزاع')).toBeNull();
        expect(screen.queryByText('بمثابة الحضوري')).toBeNull();

        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabiParty(3)));
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabiParty(5)));
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentDerivedOutcome)).toHaveTextContent(
            'إجابة الدعوى بالكامل',
        );
        setJudgmentDate();
        fireEvent.click(screen.getByRole('button', { name: LOCK_SAVE_BTN }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                judgmentType: 'إجابة الدعوى بالكامل',
                judgmentForm: 'مختلط',
                disputeIntegrity: 'indivisible',
                partyJudgmentDispositions: [
                    { partyId: '2', form: 'حضوري', operative: 'bound' },
                    { partyId: '3', form: 'غيابي', operative: 'bound' },
                    { partyId: '4', form: 'حضوري', operative: 'bound' },
                    { partyId: '5', form: 'غيابي', operative: 'bound' },
                    { partyId: '7', form: 'حضوري', operative: 'bound' },
                ],
            }),
        );
    });

    it('رد بحق أحد الخصوم يشتق منطوقاً جزئياً عند الحفظ', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const parties: Party[] = [
            { id: 1, name: 'أحمد', role: 'مدعي', isClient: true },
            { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
            { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: false },
        ];
        const { onConfirm } = renderJudgment({
            currentParties: parties,
            currentStage: 'بداءة بدرجة أولى',
            caseDocType: 'مطالبة بدين',
        });

        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOperativeReleasedParty(3)));
        await waitFor(() => {
            expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentDerivedOutcome)).toHaveTextContent(
                'رد الدعوى جزئياً',
            );
        });
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentBoundMerit)).toBeNull();
        setJudgmentDate();
        fireEvent.click(screen.getByRole('button', { name: LOCK_SAVE_BTN }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                judgmentType: 'رد الدعوى جزئياً',
                partyJudgmentDispositions: expect.arrayContaining([
                    expect.objectContaining({ partyId: '2', operative: 'bound' }),
                    expect.objectContaining({ partyId: '3', operative: 'released' }),
                ]),
            }),
        );
    });

    it('رد بحق جميع الخصوم يشتق رد كلي', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const parties: Party[] = [
            { id: 1, name: 'أحمد', role: 'مدعي', isClient: true },
            { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
            { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: false },
        ];
        const { onConfirm } = renderJudgment({
            currentParties: parties,
            currentStage: 'بداءة بدرجة أولى',
            caseDocType: 'مطالبة بدين',
        });

        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOperativeReleasedParty(2)));
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOperativeReleasedParty(3)));
        await waitFor(() => {
            expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentDerivedOutcome)).toHaveTextContent(
                'رد الدعوى كلياً',
            );
        });
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentBoundMerit)).toBeNull();
        setJudgmentDate();
        fireEvent.click(screen.getByRole('button', { name: /حفظ الحكم/ }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                judgmentType: 'رد الدعوى كلياً',
            }),
        );
    });

    it('إلزام الجميع مع جزئي موضوعي يُحفظ رداً جزئياً', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const parties: Party[] = [
            { id: 1, name: 'أحمد', role: 'مدعي', isClient: true },
            { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
            { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: false },
        ];
        const { onConfirm } = renderJudgment({
            currentParties: parties,
            currentStage: 'بداءة بدرجة أولى',
            caseDocType: 'مطالبة بدين',
        });

        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentBoundMeritPartial));
        await waitFor(() => {
            expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentDerivedOutcome)).toHaveTextContent(
                'رد الدعوى جزئياً',
            );
        });
        setJudgmentDate();
        fireEvent.click(screen.getByRole('button', { name: LOCK_SAVE_BTN }));

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                judgmentType: 'رد الدعوى جزئياً',
                partyJudgmentDispositions: expect.arrayContaining([
                    expect.objectContaining({ partyId: '2', operative: 'bound' }),
                    expect.objectContaining({ partyId: '3', operative: 'bound' }),
                ]),
            }),
        );
    });

    it('الاختصامي المستقل لا يظهر في قائمة صفة الحكم لكل مدعى عليه', () => {
        renderJudgment({
            currentParties: [
                { id: 1, name: 'أحمد', role: 'مدعي', isClient: true },
                { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
                { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: false },
                { id: 6, name: 'زيد', role: 'شخص ثالث اختصامي', isClient: false },
            ],
            currentStage: 'بداءة بدرجة أولى',
        });
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentPartyFormList)).toBeTruthy();
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabiParty(2))).toBeTruthy();
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabiParty(3))).toBeTruthy();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabiParty(6))).toBeNull();
    });

    it('صف المدعى عليه لا يعرض بمثابة الحضوري', () => {
        renderJudgment({
            currentParties: [
                { id: 1, name: 'أحمد', role: 'مدعي', isClient: true },
                { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
                { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: false },
            ],
            currentStage: 'بداءة بدرجة أولى',
        });
        expect(screen.queryByRole('button', { name: 'بمثابة الحضوري' })).toBeNull();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormDeemedHadariParty(2))).toBeNull();
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadariParty(2))).toBeTruthy();
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabiParty(2))).toBeTruthy();
    });

    it('مرحلة الاستئناف لا تعرض شكل الحكم الغيابي وتحفظ حضورياً', () => {
        const { onConfirm } = renderJudgment({
            currentStage: 'الاستئناف',
            stages: [
                {
                    id: 's0',
                    name: 'بداءة بدرجة أولى',
                    stageName: 'بداءة بدرجة أولى',
                    status: 'locked',
                    judgmentForm: 'مختلط',
                    partyJudgmentDispositions: [
                        { partyId: '2', form: 'غيابي' },
                    ],
                    parties: PARTIES,
                } as never,
                {
                    id: 's1',
                    name: 'الاستئناف',
                    stageName: 'الاستئناف',
                    status: 'active',
                    partyJudgmentDispositions: [
                        { partyId: '2', form: 'غيابي' },
                    ],
                    parties: PARTIES,
                } as never,
            ],
            activeStageIndex: 1,
            presetJudgmentDate: '2026-09-01',
        });
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadari)).toBeNull();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabi)).toBeNull();
        pickOutcome(/تأييد الحكم المستأنف ورد الاستئناف/);
        fireEvent.click(screen.getByRole('button', { name: /حفظ وانتظار تمييز الخصم/ }));
        expect(onConfirm).toHaveBeenCalled();
        expect(onConfirm.mock.calls[0]?.[0]?.judgmentForm).toBe('حضوري');
        expect(onConfirm.mock.calls[0]?.[0]?.partyJudgmentDispositions).toBeUndefined();
    });

    it('مرحلة التمييز: نطاق أسباب النقض عند إعادة الإضبارة والفصل في الموضوع دون إعادة', () => {
        const cassationProps = {
            currentStage: 'التمييز',
            stages: [
                {
                    id: 's0',
                    name: 'بداءة بدرجة أولى',
                    stageName: 'بداءة بدرجة أولى',
                    status: 'locked',
                    parties: PARTIES,
                } as never,
                {
                    id: 's1',
                    name: 'التمييز',
                    stageName: 'التمييز',
                    status: 'active',
                    parties: PARTIES,
                } as never,
            ],
            activeStageIndex: 1,
            presetJudgmentDate: '2026-09-15',
        };
        const first = renderJudgment(cassationProps);
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabi)).toBeNull();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentCassationGroundsCommon)).toBeNull();
        pickOutcome(/نقض الحكم وإعادة الإضبارة/);
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentCassationGroundsCommon)).toBeTruthy();
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentCassationGroundsPersonal));
        fireEvent.click(screen.getByRole('button', { name: 'إعادة الإضبارة' }));
        expect(first.onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'remand_to_lower',
                judgmentType: 'نقض الحكم وإعادة الإضبارة',
                cassationGroundsScope: 'PERSONAL',
                judgmentForm: 'حضوري',
            }),
        );
        cleanup();
        const second = renderJudgment(cassationProps);
        pickOutcome(/نقض الحكم والفصل في الموضوع/);
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentCassationGroundsCommon)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /ختم الإضبارة/ }));
        expect(second.onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'reverse_final',
                judgmentType: 'نقض الحكم والفصل في الموضوع',
                judgmentForm: 'حضوري',
            }),
        );
        expect(second.onConfirm.mock.calls[0]?.[0]?.cassationGroundsScope).toBeUndefined();
    });

    it('الموكل الغائب في حكم مختلط يرى حفظاً واعتراضاً اختيارياً بلا كاسب/خاسر', () => {
        const parties: Party[] = [
            { id: 1, name: 'أحمد علي', role: 'مدعي', isClient: false },
            { id: 2, name: 'سامي كاظم', role: 'مدعى عليه', isClient: false },
            { id: 3, name: 'كريم حسن', role: 'مدعى عليه', isClient: true },
        ];
        renderJudgment({
            currentParties: parties,
            currentStage: 'بداءة بدرجة أولى',
            representedParty: 'المدعى عليه',
            caseDocType: 'مطالبة بدين',
        });
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabiParty(3)));
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentDerivedOutcome)).toHaveTextContent(
            'إجابة الدعوى بالكامل',
        );
        expect(screen.getByTestId(LOCK_SAVE_TESTID)).toBeTruthy();
        expect(screen.getByTestId('smart-judgment-save-objection')).toBeTruthy();
        expect(screen.queryByText(/\(الكاسب\)|\(الخاسر\)/)).toBeNull();
        expect(screen.queryByRole('button', { name: /الانتقال للطعن/ })).toBeNull();
    });

    it('جزئي مع موكل غائب ملزَم: حفظ واحد + اعتراض اختياري', async () => {
        const parties: Party[] = [
            { id: 1, name: 'أحمد', role: 'مدعي', isClient: false },
            { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
            { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: true },
        ];
        renderJudgment({
            currentParties: parties,
            currentStage: 'بداءة بدرجة أولى',
            representedParty: 'المدعى عليه',
            caseDocType: 'مطالبة بدين',
        });
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOperativeReleasedParty(2)));
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabiParty(3)));
        await waitFor(() => {
            expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentDerivedOutcome)).toHaveTextContent(
                'رد الدعوى جزئياً',
            );
        });
        expect(screen.getByTestId(LOCK_SAVE_TESTID)).toBeTruthy();
        expect(screen.getByTestId('smart-judgment-save-objection')).toBeTruthy();
        expect(screen.queryByText(/\(الكاسب\)|\(الخاسر\)/)).toBeNull();
        expect(screen.queryByRole('button', { name: /الانتقال للطعن/ })).toBeNull();
    });

    it('جزئي لمدعي مع غيابي ملزَم: حفظ واحد بلا كاسب/خاسر', async () => {
        const parties: Party[] = [
            { id: 1, name: 'أحمد', role: 'مدعي', isClient: true },
            { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
            { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: false },
        ];
        renderJudgment({
            currentParties: parties,
            currentStage: 'بداءة بدرجة أولى',
            representedParty: 'المدعي',
            caseDocType: 'مطالبة بدين',
        });
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOperativeReleasedParty(2)));
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabiParty(3)));
        await waitFor(() => {
            expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentDerivedOutcome)).toHaveTextContent(
                'رد الدعوى جزئياً',
            );
        });
        expect(screen.queryByText(/\(الكاسب\)|\(الخاسر\)/)).toBeNull();
        expect(screen.getByTestId(LOCK_SAVE_TESTID)).toHaveTextContent(/اعتراض أو طعن الخصم|حفظ الحكم/);
        expect(screen.queryByRole('button', { name: /الانتقال للطعن/ })).toBeNull();
    });

    it('الموكل الحاضر في حكم مختلط لا يرى الاعتراض', () => {
        const parties: Party[] = [
            { id: 1, name: 'أحمد علي', role: 'مدعي', isClient: false },
            { id: 2, name: 'سامي كاظم', role: 'مدعى عليه', isClient: true },
            { id: 3, name: 'كريم حسن', role: 'مدعى عليه', isClient: false },
        ];
        renderJudgment({
            currentParties: parties,
            currentStage: 'بداءة بدرجة أولى',
            representedParty: 'المدعى عليه',
            caseDocType: 'مطالبة بدين',
        });
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadariParty(2)));
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabiParty(3)));
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentDerivedOutcome)).toHaveTextContent(
            'إجابة الدعوى بالكامل',
        );
        expect(screen.queryByRole('button', { name: /حفظ وتقديم اعتراض غيابي/ })).toBeNull();
        expect(screen.getByRole('button', { name: /حفظ الحكم/ })).toBeTruthy();
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

    it('شريط الاستئناف يخفي ختام المرافعة ويعرض علامة استئخار تعليمية', () => {
        const onStay = vi.fn();
        render(
            <SmartFileStageFooterBar
                isViewingArchived={false}
                showOpponentAppealBtnEffective={false}
                showAbsentJudgmentFooter={false}
                showPostJudgmentAppealFooter={false}
                showAppealStageFooter={false}
                showPetitionVoidFooter={false}
                displayStage={{
                    id: 's1',
                    name: 'الاستئناف',
                    stageName: 'الاستئناف',
                    status: 'active',
                }}
                crossAppealEligibility={IDLE_CROSS_APPEAL}
                setShowCrossAppealModal={vi.fn()}
                petitionVoidFooterPanel={null}
                absentJudgmentFooterPanel={null}
                opponentAppealFooterPanel={null}
                appealStageFooterPanel={null}
                postJudgmentAppealFooterPanel={null}
                showPleadingCloseFooter={false}
                showArt172StayFooter
                onArt172Stay={onStay}
                showFlowStatusFooter={false}
                setShowJudgmentModal={vi.fn()}
                setShowAdjournPleadingModal={vi.fn()}
                flowStatusFooterPanel={null}
            />,
        );
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.art172Stay)).toBeNull();
        expect(screen.queryByRole('button', { name: 'ختام المرافعة' })).toBeNull();
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.art172StayHint).textContent).toContain('!');
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.art172StayHint).textContent).toContain(
            'يجب استئخار الاستئناف لوجود اعتراض غيابي',
        );
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.art172StayHint));
        expect(onStay).toHaveBeenCalledTimes(1);
    });

    it('شريط الاستئناف يعرض استئناف السير بدل ختام المرافعة بعد الاستئخار', () => {
        const onResume = vi.fn();
        render(
            <SmartFileStageFooterBar
                isViewingArchived={false}
                showOpponentAppealBtnEffective={false}
                showAbsentJudgmentFooter={false}
                showPostJudgmentAppealFooter={false}
                showAppealStageFooter={false}
                showPetitionVoidFooter={false}
                displayStage={{
                    id: 's1',
                    name: 'الاستئناف',
                    stageName: 'الاستئناف',
                    status: 'active',
                    isSuspended: true,
                    suspensionReason: 'PENDING_CO_DEFENDANT_OBJECTION',
                }}
                crossAppealEligibility={IDLE_CROSS_APPEAL}
                setShowCrossAppealModal={vi.fn()}
                petitionVoidFooterPanel={null}
                absentJudgmentFooterPanel={null}
                opponentAppealFooterPanel={null}
                appealStageFooterPanel={null}
                postJudgmentAppealFooterPanel={null}
                showPleadingCloseFooter={false}
                showArt172ResumeFooter
                onArt172Resume={onResume}
                showFlowStatusFooter={false}
                setShowJudgmentModal={vi.fn()}
                setShowAdjournPleadingModal={vi.fn()}
                flowStatusFooterPanel={null}
            />,
        );
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.art172Resume));
        expect(onResume).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('button', { name: 'ختام المرافعة' })).toBeNull();
    });
});
