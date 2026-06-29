import type { ExecutionFile } from '@/app/types/execution';

/** كفيل ضامن مالي نشط — بدون سحب ExecutionDashboard */
export function hasActiveFinancialGuarantorFollowup(
    executionData: ExecutionFile | null | undefined,
): boolean {
    const gf = executionData?.guarantor_followup;
    if (!gf?.executor_approved) return false;
    if (gf.channel === 'procedural') return false;
    return true;
}
