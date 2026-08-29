import type {
    AdditionalDebtorDraft,
    DebtorDraft,
} from '../types';
import {
    isFinancialClaimForPartySplit,
    parseMoneyInput,
    resolveDebtorAllocatedShares,
    resolveManualDebtorAllocatedShares,
} from './executionFormUtils';

export type DebtorAllocationResult =
    | {
          ok: true;
          debtorAllocatedShares: number[];
          solidaryRemainderDebt: number;
          anySolidaryDebtor: boolean;
          debtorSolidaryFlags: boolean[];
          applyPartySplit: boolean;
          globalClaimTotal: number;
      }
    | { ok: false; error: string };

export function resolveDebtorPartyAllocation(input: {
    claimType: string;
    debtors: DebtorDraft[];
    additionalDebtorsForm: AdditionalDebtorDraft[];
    debtorManualDebtClaims: Record<string, string>;
    resolveGlobalClaimTotalNumber: () => number;
}): DebtorAllocationResult {
    const {
        claimType,
        debtors,
        additionalDebtorsForm,
        debtorManualDebtClaims,
        resolveGlobalClaimTotalNumber,
    } = input;

    const totalDebtorSlots = 1 + additionalDebtorsForm.length;
    const globalClaimTotal = resolveGlobalClaimTotalNumber();
    const applyPartySplit = isFinancialClaimForPartySplit(claimType) && totalDebtorSlots > 0;
    const debtorSolidaryFlags = [
        Boolean(debtors[0]?.isSolidaryLiability),
        ...additionalDebtorsForm.map((d) => Boolean(d.isSolidaryLiability)),
    ];
    const anySolidaryDebtor = debtorSolidaryFlags.some(Boolean);
    const hasIndependentDebtor = debtorSolidaryFlags.some((f) => !f);
    const manualBySlot = [
        parseMoneyInput(debtorManualDebtClaims[String(debtors[0]?.id ?? '')] ?? ''),
        ...additionalDebtorsForm.map((d) =>
            parseMoneyInput(debtorManualDebtClaims[String(d.id)] ?? ''),
        ),
    ];
    let debtorAllocatedShares: number[] = Array(totalDebtorSlots).fill(0);
    let solidaryRemainderDebt = 0;
    if (applyPartySplit && globalClaimTotal > 0) {
        if (hasIndependentDebtor || anySolidaryDebtor) {
            const resolved = resolveManualDebtorAllocatedShares(
                globalClaimTotal,
                debtorSolidaryFlags,
                manualBySlot,
            );
            debtorAllocatedShares = resolved.shares;
            solidaryRemainderDebt = resolved.solidaryRemainder;
            if (resolved.independentSum > globalClaimTotal) {
                return {
                    ok: false,
                    error: '⚠️ مجموع ديون المدينين المستقلين يتجاوز إجمالي المطالبة المالية',
                };
            }
        } else {
            debtorAllocatedShares = resolveDebtorAllocatedShares(
                globalClaimTotal,
                debtorSolidaryFlags,
            );
        }
    }

    return {
        ok: true,
        debtorAllocatedShares,
        solidaryRemainderDebt,
        anySolidaryDebtor,
        debtorSolidaryFlags,
        applyPartySplit,
        globalClaimTotal,
    };
}
