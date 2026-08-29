import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useExecutionCreationClaimCascade } from '../useExecutionCreationClaimCascade';

function baseParams(overrides: Record<string, unknown> = {}) {
    return {
        directorate: 'الكرخ',
        fileNumber: '123/2026',
        docType: 'قرارات وأحكام المحاكم',
        setDocType: vi.fn(),
        classification: 'مدني',
        setClassification: vi.fn(),
        claimType: 'تسليم شيء معين',
        setClaimType: vi.fn(),
        activeClaimTypes: ['تسليم شيء معين'],
        setActiveClaimTypes: vi.fn((updater: (prev: string[]) => string[]) =>
            typeof updater === 'function' ? updater(['تسليم شيء معين']) : updater,
        ),
        claimAmountsByType: { 'تسليم شيء معين': '1000' },
        setClaimAmountsByType: vi.fn(),
        debtors: [
            {
                id: 1,
                name: '',
                phone: '',
                address: '',
                occupation: 'كاسب' as const,
                isClient: false,
                isSolidaryLiability: true,
            },
        ],
        setDebtors: vi.fn(),
        additionalDebtorsForm: [],
        setAdditionalDebtorsForm: vi.fn(),
        classificationOptionsList: [{ value: 'مدني', label: 'مدني' }],
        claimTypeOptionsList: [{ value: 'تسليم شيء معين', label: 'تسليم شيء معين' }],
        claimTypeSheetOpen: false,
        setClaimTypeSheetOpen: vi.fn(),
        linkedClaimDraft: [],
        setLinkedClaimDraft: vi.fn(),
        setVisitationChildrenNames: vi.fn(),
        setVisitationScheduleDraft: vi.fn(),
        setCustodyWardNames: vi.fn(),
        calculatedAlimonyNew: null,
        alimonyLawsuitDate: '',
        alimonyPastStartDate: '',
        setShowChequeValidatorModal: vi.fn(),
        setShowAbsenteeModal: vi.fn(),
        setSpecificDeliveryItems: vi.fn(),
        ...overrides,
    };
}

describe('useExecutionCreationClaimCascade', () => {
    it('clears specific delivery items when removing تسليم شيء معين claim', () => {
        const setSpecificDeliveryItems = vi.fn();
        const { result } = renderHook(() =>
            useExecutionCreationClaimCascade(
                baseParams({ setSpecificDeliveryItems }) as never,
            ),
        );

        act(() => {
            result.current.removeActiveClaimType('تسليم شيء معين');
        });

        expect(setSpecificDeliveryItems).toHaveBeenCalledWith([]);
    });
});
