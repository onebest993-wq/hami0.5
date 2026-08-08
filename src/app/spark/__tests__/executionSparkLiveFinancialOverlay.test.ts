import { describe, expect, it } from 'vitest';
import { buildExecutionSparkFinancialOverlay } from '@/app/spark/engine/executionSparkLiveFinancialOverlay';

describe('executionSparkLiveFinancialOverlay', () => {
    it('يبني overlay من متبقي المركز المالي وتسوية معلّقة', () => {
        const overlay = buildExecutionSparkFinancialOverlay({
            remainingBalanceForSeizure: 850_000,
            settlementGuarantorGate: {
                pendingSettlement: {
                    id: 'p1',
                    amount: 200_000,
                    dueDate: '2026-09-01',
                    createdAt: '2026-08-01',
                },
                settlementBreachTriggeredAt: null,
            },
        });

        expect(overlay?.ledgerRemainingIqd).toBe(850_000);
        expect(overlay?.pendingSettlement?.amount).toBe(200_000);
    });

    it('يعيد undefined عند غياب بيانات مالية', () => {
        expect(buildExecutionSparkFinancialOverlay({})).toBeUndefined();
    });
});
