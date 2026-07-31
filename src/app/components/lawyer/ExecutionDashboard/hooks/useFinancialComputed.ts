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

/** مجموع الدين الأصلي دون مضاعفة الحصص */
function resolvePrincipalFromAllocatedRows(
    rows: Array<Record<string, unknown>>,
    partyMultiplicity?: Record<string, unknown>,
): number {
    if (rows.length === 0) return 0;
    const hasSolidary = rows.some((r) => Boolean(r.isSolidaryLiability));
    const hasIndependent = rows.some((r) => !r.isSolidaryLiability);
    const independentRemainder = parseMoneyLike(partyMultiplicity?.independentRemainderDebt);
    const legacySolidaryRemainder = parseMoneyLike(partyMultiplicity?.solidaryRemainderDebt);

    if (hasSolidary && hasIndependent) {
        const solidarySum = rows
            .filter((r) => Boolean(r.isSolidaryLiability))
            .reduce((t, row) => t + Math.max(0, parseMoneyLike(row?.allocated_debt)), 0);
        if (independentRemainder > 0) return solidarySum + independentRemainder;
        const independentSum = rows
            .filter((r) => !r.isSolidaryLiability)
            .reduce((t, row) => t + Math.max(0, parseMoneyLike(row?.allocated_debt)), 0);
        return solidarySum + independentSum;
    }

    if (hasSolidary && !hasIndependent) {
        return rows.reduce(
            (t, row) => t + Math.max(0, parseMoneyLike(row?.allocated_debt)),
            0,
        );
    }

    if (!hasSolidary && legacySolidaryRemainder > 0) {
        const independentSum = rows
            .filter((r) => !r.isSolidaryLiability)
            .reduce((t, row) => t + Math.max(0, parseMoneyLike(row?.allocated_debt)), 0);
        return independentSum + legacySolidaryRemainder;
    }

    return rows.reduce(
        (t, row) => t + Math.max(0, parseMoneyLike(row?.allocated_debt)),
        0,
    );
}

export function useFinancialComputed(
    executionData: unknown,
    totalAmount: number | unknown,
    debtAmount: number | unknown,
    lawyerFeesAmount: number | unknown,
    executionFee: number | unknown,
    clientFeesAmount: number | unknown,
    courtFees: number | unknown,
    directorateFees: number | unknown,
    dynamicExpenses: number | unknown,
) {
    const parsedDebtAmount = useMemo(() => {
        const allocatedSum = (() => {
            const d = executionData as Record<string, unknown>;
            const primary = Array.isArray(d?.debtors) ? (d.debtors as Array<Record<string, unknown>>) : [];
            const pm = d?.party_multiplicity as Record<string, unknown> | undefined;
            const additional = Array.isArray(pm?.additionalDebtors)
                ? (pm.additionalDebtors as Array<Record<string, unknown>>)
                : [];
            return resolvePrincipalFromAllocatedRows(
                [...primary, ...additional],
                pm,
            );
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

    const parsedLawyerFees = useMemo(() => {
        const d = executionData as Record<string, unknown>;
        const primary = Array.isArray(d?.debtors) ? (d.debtors as Array<Record<string, unknown>>) : [];
        const pm = d?.party_multiplicity as Record<string, unknown> | undefined;
        const additional = Array.isArray(pm?.additionalDebtors)
            ? (pm.additionalDebtors as Array<Record<string, unknown>>)
            : [];
        const perDebtorLawyerSum = [...primary, ...additional].reduce(
            (t, row) => t + parseMoneyLike(row?.lawyerFeesClaimAmount),
            0,
        );
        return Math.max(
            parseMoneyLike(lawyerFeesAmount),
            parseMoneyLike(executionFee),
            perDebtorLawyerSum,
        );
    }, [executionData, lawyerFeesAmount, executionFee]);
    const parsedExecutionFee = parsedLawyerFees;

    const parsedClientFees = parseMoneyLike(clientFeesAmount);

    const parsedCourtFees = parseMoneyLike(courtFees);
    const parsedDirectorateFees = parseMoneyLike(directorateFees);

    const total_execution_expenses =
        parsedCourtFees + parsedDirectorateFees + parseMoneyLike(dynamicExpenses);

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
