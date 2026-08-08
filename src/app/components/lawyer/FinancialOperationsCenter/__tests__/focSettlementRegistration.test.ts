import { describe, expect, it } from 'vitest';
import {
    buildPendingSettlementRow,
    validateSettlementRegistration,
} from '../focSettlementRegistration';
import { invalidPositiveAmountMessage, parseAmount } from '../utils';

describe('focSettlementRegistration', () => {
    it('validateSettlementRegistration rejects empty due date', () => {
        const result = validateSettlementRegistration({
            amountRaw: '100,000',
            dueDate: '',
            remainingUnified: 500_000,
            isAlimonyClaim: false,
            ongoingMonthlyAlimonyEffective: 0,
            parseAmount,
            invalidPositiveAmountMessage,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toContain('تاريخ');
    });

    it('validateSettlementRegistration rejects amount above remaining for standard claims', () => {
        const result = validateSettlementRegistration({
            amountRaw: '600,000',
            dueDate: '2026-09-01',
            remainingUnified: 500_000,
            isAlimonyClaim: false,
            ongoingMonthlyAlimonyEffective: 0,
            parseAmount,
            invalidPositiveAmountMessage,
        });
        expect(result.ok).toBe(false);
    });

    it('buildPendingSettlementRow tracks ongoing alimony', () => {
        const row = buildPendingSettlementRow({
            amount: 250_000,
            dueDate: '2026-09-01',
            isAlimonyClaim: true,
            ongoingMonthlyAlimonyEffective: 250_000,
            atIso: '2026-08-01T12:00:00.000Z',
            idPrefix: 'stl-test',
        });
        expect(row.tracksOngoingAlimony).toBe(true);
        expect(row.amount).toBe(250_000);
        expect(row.periodStartYmd).toBeTruthy();
    });
});
