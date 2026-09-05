import { splitAmountEqually } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormDebtorShares';
import type { GhuramaaEligibleCreditor } from './focGhuramaaDistribution';
import { formatIqdDisplay } from './utils';

export function buildGhuramaaEqualSplitInputs(
    eligible: GhuramaaEligibleCreditor[],
    available: number,
): Record<string, string> {
    if (available <= 0 || eligible.length === 0) return {};
    const shares = splitAmountEqually(available, eligible.length);
    const next: Record<string, string> = {};
    eligible.forEach((c, i) => {
        const amt = shares[i] ?? 0;
        next[c.creditorId] = amt > 0 ? formatIqdDisplay(amt) : '';
    });
    return next;
}
