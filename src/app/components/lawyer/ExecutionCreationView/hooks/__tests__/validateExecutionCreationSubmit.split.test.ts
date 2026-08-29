import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        warning: vi.fn(),
        success: vi.fn(),
    },
}));

import { SmartToast } from '@/app/components/ui/SmartToast';
import { validateExecutionCreationSubmit } from '../validateExecutionCreationSubmit';

function baseInput(overrides: Record<string, unknown> = {}) {
    return {
        directorate: 'مديرية تنفيذ الكرخ',
        fileNumber: '1/2026',
        creditors: [{ id: 1, name: 'دائن', phone: '', address: '', occupation: 'كاسب', isClient: true }],
        debtors: [{ id: 1, name: 'مدين 1', phone: '', address: '', occupation: 'كاسب', isClient: false }],
        additionalCreditors: [],
        additionalDebtorsForm: [
            {
                id: 'd2',
                name: 'مدين 2',
                phone: '',
                address: '',
                occupation: 'كاسب',
                isClient: false,
                isSolidaryLiability: true,
            },
        ],
        debtorManualDebtClaims: {},
        allowMultipleDebtors: true,
        docType: 'قرارات وأحكام المحاكم',
        claimType: 'استحصال دين مالي',
        activeClaimTypes: ['استحصال دين مالي'],
        claimAmountsByType: { 'استحصال دين مالي': '1000000' },
        totalAmount: '1000000',
        foreignData: {},
        visitationScheduleDraft: {},
        custodyWardNames: [],
        evictionPropertyNumber: '',
        evictionDistrict: '',
        evictionPropertyType: '',
        evictionFullAddress: '',
        specificDeliveryItems: [],
        executionTarget: '',
        isDocumentBlocked: false,
        alimonyLawsuitDate: '',
        alimonyWifeMonthly: '',
        alimonyPastStartDate: '',
        pastWifeAlimonyAmount: '',
        calculatedAlimonyNew: null,
        ...overrides,
    };
}

describe('validateExecutionCreationSubmit financial split', () => {
    beforeEach(() => {
        vi.mocked(SmartToast.error).mockClear();
    });

    it('يرفض إن وُجد مدين مستقل بلا مبلغ يدوي', () => {
        const result = validateExecutionCreationSubmit(baseInput() as never);
        expect(result.ok).toBe(false);
        expect(SmartToast.error).toHaveBeenCalled();
        const msg = String(vi.mocked(SmartToast.error).mock.calls[0]?.[0] ?? '');
        expect(msg).toContain('مدين مستقل');
    });

    it('يقبل عند إدخال مبلغ المدين المستقل', () => {
        const result = validateExecutionCreationSubmit(
            baseInput({
                debtorManualDebtClaims: { '1': '400000' },
            }) as never,
        );
        expect(result.ok).toBe(true);
    });
});
