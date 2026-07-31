import type { ExecutionFile } from '@/app/types/execution';
import { hasActiveFinancialGuarantorFollowup } from '@/app/utils/execution/guarantorFollowup';

/** تظهر بطاقة الضامن بعد إتمام مسار الكفيل — بلا سحب guarantorExternalUtils/amountInput إلى cold path */
export function shouldShowGuarantorExternalHub(
    executionData: ExecutionFile | null | undefined,
): boolean {
    return hasActiveFinancialGuarantorFollowup(executionData);
}
