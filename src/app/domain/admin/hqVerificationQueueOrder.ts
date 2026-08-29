export type HqVerificationOrderRow = {
    status: string;
    submittedAt: string;
};

export function compareHqVerificationQueueRows(
    a: HqVerificationOrderRow,
    b: HqVerificationOrderRow,
): number {
    const pendingRank = (status: string) => (status === 'pending' ? 0 : 1);
    const rank = pendingRank(a.status) - pendingRank(b.status);
    if (rank !== 0) return rank;
    const ta = Date.parse(a.submittedAt);
    const tb = Date.parse(b.submittedAt);
    const na = Number.isFinite(ta) ? ta : 0;
    const nb = Number.isFinite(tb) ? tb : 0;
    if (a.status === 'pending') return na - nb;
    return nb - na;
}

export function sortHqVerificationQueueRows<T extends HqVerificationOrderRow>(rows: readonly T[]): T[] {
    return [...rows].sort(compareHqVerificationQueueRows);
}
