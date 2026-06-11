import { describe, expect, it } from 'vitest';
import type { ExecutionFile } from '@/app/types/execution';
import {
    hasActiveFinancialGuarantorFollowup,
    shouldShowGuarantorExternalHub,
    isGuarantorSummonsEligible,
} from '../guarantorExternalUtils';

describe('guarantorExternalUtils', () => {
    it('does not show hub without approved financial guarantor followup', () => {
        const file = { guarantor_followup: { executor_approved: false } } as ExecutionFile;
        expect(hasActiveFinancialGuarantorFollowup(file)).toBe(false);
        expect(shouldShowGuarantorExternalHub(file)).toBe(false);
    });

    it('shows hub after financial guarantor followup is approved', () => {
        const file = {
            guarantor_followup: {
                executor_approved: true,
                guarantor_name: 'أحمد',
                guarantor_workplace: 'شركة',
                details_saved: true,
            },
        } as ExecutionFile;
        expect(hasActiveFinancialGuarantorFollowup(file)).toBe(true);
        expect(shouldShowGuarantorExternalHub(file)).toBe(true);
        expect(isGuarantorSummonsEligible(file)).toBe(true);
    });

    it('ignores procedural channel followup rows', () => {
        const file = {
            guarantor_followup: {
                executor_approved: true,
                channel: 'procedural',
                guarantor_name: 'أحمد',
            },
        } as ExecutionFile;
        expect(hasActiveFinancialGuarantorFollowup(file)).toBe(false);
        expect(shouldShowGuarantorExternalHub(file)).toBe(false);
    });
});
