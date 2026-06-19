/**
 * تحقق مما إذا كان صف المدين قد تم تسويته مالياً.
 */
export function executionDebtorRowCleared(
    allocated: number,
    paid: number,
    additionalStatus?: 'Active' | 'Cleared'
): boolean {
    if (additionalStatus === 'Cleared') return true;
    return allocated > 0 && paid >= allocated;
}
