import { useMemo } from 'react';
import { parseLooseAmountFromText } from '@/app/utils/looseAmountParse';

export function useFinancialTotals(
    executionData: unknown,
    evictionCaseExpensesSum: number,
    isEvictionExecutionModule: boolean,
    parsedLawyerFees: number,
    principalDebtAmount: number,
    total_execution_expenses: number,
) {
    const ed = executionData as Record<string, unknown> | null | undefined;

    const judicialCustodiansResolved = useMemo(() => {
        const d = executionData as Record<string, unknown> | null | undefined;
        if (!d) return [];
        const arr = d.eviction_judicial_custodians;
        if (Array.isArray(arr) && arr.length > 0) {
            return arr.filter((c: unknown) => {
                const item = c as { fullName?: string; savedAt?: string };
                return item && String(item.fullName || '').trim() && String(item.savedAt || '').trim();
            });
        }
        const leg = d.eviction_judicial_custodian as { fullName?: string; salary?: string; decisionId?: string; savedAt?: string } | undefined;
        if (leg?.fullName?.trim() && leg.savedAt) {
            return [
                {
                    id: 'legacy_custodian',
                    fullName: leg.fullName,
                    salary: leg.salary,
                    decisionId: leg.decisionId,
                    savedAt: leg.savedAt,
                },
            ];
        }
        return [];
    }, [ed?.eviction_judicial_custodians, ed?.eviction_judicial_custodian]);

    const judicialCustodianSalariesExpenseIqd = useMemo(
        () => judicialCustodiansResolved.reduce((t: number, c: { salary?: string }) => t + parseLooseAmountFromText(c.salary), 0),
        [judicialCustodiansResolved]
    );

    const evictionCaseExpensesTotalForFinancial = useMemo(
        () => evictionCaseExpensesSum + (isEvictionExecutionModule ? judicialCustodianSalariesExpenseIqd : 0),
        [evictionCaseExpensesSum, isEvictionExecutionModule, judicialCustodianSalariesExpenseIqd]
    );

    const evictionLawyerFeesInTotals =
        isEvictionExecutionModule && (ed?.eviction_lawyer_fee_waived_at_intake as boolean)
            ? 0
            : parsedLawyerFees;

    const totalOwed =
        principalDebtAmount +
        total_execution_expenses +
        evictionLawyerFeesInTotals +
        (isEvictionExecutionModule ? evictionCaseExpensesTotalForFinancial : 0);

    return {
        judicialCustodiansResolved,
        judicialCustodianSalariesExpenseIqd,
        evictionCaseExpensesTotalForFinancial,
        evictionLawyerFeesInTotals,
        totalOwed,
    };
}
