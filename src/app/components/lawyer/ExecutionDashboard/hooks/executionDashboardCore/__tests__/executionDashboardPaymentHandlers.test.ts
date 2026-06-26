import { describe, expect, it } from 'vitest';
import { normalizePaymentAmountInput } from '../useExecutionDashboardPaymentHandlers';

describe('normalizePaymentAmountInput', () => {
    it('parses western digits', () => {
        expect(normalizePaymentAmountInput('125000')).toBe(125000);
    });

    it('parses Arabic-Indic digits', () => {
        expect(normalizePaymentAmountInput('١٢٥٠٠٠')).toBe(125000);
    });

    it('strips currency text and rounds', () => {
        expect(normalizePaymentAmountInput('  12,500.9 د.ع ')).toBe(12501);
    });

    it('returns zero for empty input', () => {
        expect(normalizePaymentAmountInput('')).toBe(0);
    });
});
