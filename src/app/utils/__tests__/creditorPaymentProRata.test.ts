import { describe, expect, it } from 'vitest';
import {
    buildCreditorDebtRows,
    buildGhuramaaCreditorRows,
    distributePaymentProRata,
} from '../creditorPaymentProRata';

describe('creditorPaymentProRata', () => {
    it('splits payment 30/70 by debt shares', () => {
        const rows = buildCreditorDebtRows({
            totalAmount: 1_000_000,
            creditors: [
                {
                    id: 1,
                    name: 'علي',
                    isClient: false,
                    allocated_debt: 300_000,
                    paid_amount: 0,
                },
            ],
            party_multiplicity: {
                additionalCreditors: [
                    {
                        id: 'ac-2',
                        name: 'محمد',
                        isClient: true,
                        allocated_debt: 700_000,
                        paid_amount: 0,
                    },
                ],
                additionalDebtors: [],
                isSolidaryLiability: false,
            },
        });

        const dist = distributePaymentProRata(1_000_000, rows);
        expect(dist.ok).toBe(true);
        expect(dist.allocations).toHaveLength(2);
        const ali = dist.allocations.find((a) => a.creditorName === 'علي');
        const mohammad = dist.allocations.find((a) => a.creditorName === 'محمد');
        expect(ali?.amount).toBe(300_000);
        expect(mohammad?.amount).toBe(700_000);
        expect(dist.clientCreditorTotal).toBe(700_000);
        expect(dist.nonClientTotal).toBe(300_000);
    });

    it('assigns equal debt when allocations missing', () => {
        const rows = buildCreditorDebtRows({
            totalAmount: 600_000,
            creditors: [{ id: 1, name: 'أ', isClient: true }],
            party_multiplicity: {
                additionalCreditors: [{ id: 'b', name: 'ب', isClient: false }],
                additionalDebtors: [],
                isSolidaryLiability: false,
            },
        });
        expect(rows[0].allocatedDebt).toBe(300_000);
        expect(rows[1].allocatedDebt).toBe(300_000);
    });

    it('buildGhuramaaCreditorRows uses claim fallback when allocations missing', () => {
        const rows = buildGhuramaaCreditorRows(
            {
                creditors: [{ id: 1, name: 'أ', isClient: true }],
                party_multiplicity: {
                    additionalCreditors: [{ id: 'b', name: 'ب', isClient: false }],
                    additionalDebtors: [],
                    isSolidaryLiability: false,
                },
            },
            800_000
        );
        expect(rows).toHaveLength(2);
        expect(rows[0].remainingDebt).toBe(400_000);
        expect(rows[1].remainingDebt).toBe(400_000);
    });
});
