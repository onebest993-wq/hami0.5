import { useMemo } from 'react';

function parseMoneyLike(v: unknown): number {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'string') {
        const normalizeDigits = (s: string) =>
            s
                .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
                .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
        const normalized = normalizeDigits(v).replace(/\u066B/g, '.');
        const cleaned = normalized.replace(/[^0-9.]/g, '');
        const n = parseFloat(cleaned);
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

export function useFinancialComputed(
    executionData: unknown,
    totalAmount: number,
    debtAmount: number,
    lawyerFeesAmount: number,
    executionFee: number,
    clientFeesAmount: number,
    courtFees: number,
    directorateFees: number,
    dynamicExpenses: number,
) {
    const parsedDebtAmount = useMemo(() => {
        const allocatedSum = (() => {
            const d = executionData as Record<string, unknown>;
            const primary = Array.isArray(d?.debtors) ? (d.debtors as Array<Record<string, unknown>>) : [];
            const additional = Array.isArray((d?.party_multiplicity as Record<string, unknown>)?.additionalDebtors)
                ? ((d?.party_multiplicity as Record<string, unknown>).additionalDebtors as Array<Record<string, unknown>>)
                : [];
            const sum = [...primary, ...additional].reduce((t: number, row: Record<string, unknown>) => {
                const n = parseMoneyLike(row?.allocated_debt);
                return t + (Number.isFinite(n) ? Math.max(0, n) : 0);
            }, 0);
            return Number.isFinite(sum) ? Math.max(0, sum) : 0;
        })();
        const candidates: unknown[] = [
            (executionData as Record<string, unknown>)?.totalAmount,
            (executionData as Record<string, unknown>)?.debtAmount,
            allocatedSum,
            (executionData as Record<string, unknown>)?.total_remaining_balance,
            (executionData as Record<string, unknown>)?.remainingDebt,
            totalAmount,
            debtAmount,
        ];
        for (const c of candidates) {
            const n = parseMoneyLike(c);
            if (Number.isFinite(n) && n > 0) return n;
        }
        return 0;
    }, [executionData, totalAmount, debtAmount]);

    const parsedLawyerFees = Math.max(parseMoneyLike(lawyerFeesAmount), parseMoneyLike(executionFee));
    const parsedExecutionFee = parsedLawyerFees;

    const parsedClientFees = parseMoneyLike(clientFeesAmount);

    const parsedCourtFees = parseMoneyLike(courtFees);
    const parsedDirectorateFees = parseMoneyLike(directorateFees);

    const total_execution_expenses = parsedCourtFees + parsedDirectorateFees + dynamicExpenses;

    return {
        parsedDebtAmount,
        parsedLawyerFees,
        parsedExecutionFee,
        parsedClientFees,
        parsedCourtFees,
        parsedDirectorateFees,
        total_execution_expenses,
    };
}
