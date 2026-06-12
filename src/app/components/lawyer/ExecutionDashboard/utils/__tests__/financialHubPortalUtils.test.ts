import { describe, expect, it } from 'vitest';
import {
    buildGhuramaaDistributionMergePatch,
    computeMonthlySettlementDelayCount,
    resolveFinancialHubExecutionId,
    trashMonthlySettlementDefaultTasks,
    MONTHLY_SETTLEMENT_DEFAULT_TASK_TITLE,
} from '@/app/components/lawyer/ExecutionDashboard/utils/financialHubPortalUtils';

describe('financialHubPortalUtils', () => {
    it('resolves execution id safely', () => {
        expect(resolveFinancialHubExecutionId({ id: 'ex-9' }, undefined)).toBe('ex-9');
        expect(resolveFinancialHubExecutionId(null, 'undefined')).toBeUndefined();
    });

    it('increments delay only for the same due date', () => {
        expect(
            computeMonthlySettlementDelayCount({
                dueDate: '2026-06-01',
                prevDueDate: '2026-06-01',
                prevDelayCount: 2,
            })
        ).toBe(3);
        expect(
            computeMonthlySettlementDelayCount({
                dueDate: '2026-07-01',
                prevDueDate: '2026-06-01',
                prevDelayCount: 4,
            })
        ).toBe(1);
    });

    it('builds ghuramaa merge patch with paid shares', () => {
        const patch = buildGhuramaaDistributionMergePatch({
            executionData: { party_multiplicity: { additionalCreditors: [] } },
            creditors: [{ id: 'c1', paid_amount: 1000 }],
            args: {
                totalAmountDistributed: 500,
                distributionDetails: [
                    {
                        creditorId: 'c1',
                        creditorName: 'دائن 1',
                        debtBeforeDistribution: 2000,
                        amountDistributed: 500,
                    },
                ],
            },
        });
        expect((patch.creditors as Array<{ paid_amount: number }>)[0].paid_amount).toBe(1500);
        expect((patch.ghuramaDistributionLogs as unknown[]).length).toBe(1);
    });

    it('trashes monthly settlement default tasks by due date', () => {
        const next = trashMonthlySettlementDefaultTasks(
            [
                { title: MONTHLY_SETTLEMENT_DEFAULT_TASK_TITLE, dueDate: '2026-06-01' },
                { title: 'مهمة أخرى', dueDate: '2026-06-01' },
            ],
            '2026-06-01'
        );
        expect(next[0].trashedAt).toBeTruthy();
        expect(next[1].trashedAt).toBeUndefined();
    });
});
