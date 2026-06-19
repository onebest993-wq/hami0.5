import { describe, expect, it } from 'vitest';
import {
    findMissingRequiredMonetaryClaimAmount,
    isDirectorateSectionComplete,
    isInstrumentSectionReadyForParties,
    showCivilDebtorSolidarySplit,
} from '../executionFormUtils';

describe('parties section gate', () => {
    it('requires directorate name and file number', () => {
        expect(isDirectorateSectionComplete('', '')).toBe(false);
        expect(isDirectorateSectionComplete('تنفيذ الكرخ', '')).toBe(false);
        expect(isDirectorateSectionComplete('تنفيذ الكرخ', '1540/2026')).toBe(true);
    });

    it('requires doc type, classification when needed, and claim type', () => {
        expect(
            isInstrumentSectionReadyForParties({
                docType: '',
                classification: '',
                claimType: '',
                effectiveClaimTypes: [],
                requiresClassification: true,
            }),
        ).toBe(false);

        expect(
            isInstrumentSectionReadyForParties({
                docType: 'قرارات وأحكام المحاكم',
                classification: 'مدني',
                claimType: 'استحصال دين مالي',
                effectiveClaimTypes: [],
                requiresClassification: true,
            }),
        ).toBe(true);
    });
});

describe('showCivilDebtorSolidarySplit', () => {
    it('blocks personal status and non-financial civil claims', () => {
        expect(
            showCivilDebtorSolidarySplit('شرعي', ['استحصال دين مالي'], 'استحصال دين مالي'),
        ).toBe(false);
        expect(
            showCivilDebtorSolidarySplit('مدني', ['تسليم ولد'], 'تسليم ولد'),
        ).toBe(false);
    });

    it('allows civil financial debt collection split', () => {
        expect(
            showCivilDebtorSolidarySplit('مدني', ['استحصال دين مالي'], 'استحصال دين مالي'),
        ).toBe(true);
    });
});

describe('findMissingRequiredMonetaryClaimAmount', () => {
    it('returns claim type when amount missing', () => {
        expect(
            findMissingRequiredMonetaryClaimAmount(
                ['استحصال دين مالي'],
                'استحصال دين مالي',
                {},
                '',
            ),
        ).toBe('استحصال دين مالي');
    });

    it('returns null when amount provided', () => {
        expect(
            findMissingRequiredMonetaryClaimAmount(
                ['استحصال دين مالي'],
                'استحصال دين مالي',
                {},
                '5000000',
            ),
        ).toBeNull();
    });
});
