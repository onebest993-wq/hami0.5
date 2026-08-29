export function resolveTotalRemainingBalance(file: any): number {
    const debt = Number(file.debtAmount) || 0;
    const paid = Number(file.paidDebt) || 0;
    return Math.max(0, debt - paid);
}
