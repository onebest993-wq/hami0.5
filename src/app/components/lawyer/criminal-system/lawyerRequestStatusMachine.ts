import type { LawyerRequest } from './criminalStore';
import { formatLawyerRequestStatusLabel } from './criminalStageUtils';

export type LawyerRequestStatus = LawyerRequest['status'];

export function isLawyerRequestExecuted(status: LawyerRequestStatus): boolean {
    return status === 'executed';
}

export function isLawyerRequestLocked(
    request: Pick<LawyerRequest, 'isLocked' | 'decisionArchived' | 'status'>,
): boolean {
    if (request.status === 'executed') return true;
    if (request.isLocked === true || request.decisionArchived === true) return true;
    return false;
}

export function isLawyerRequestPending(
    request: Pick<LawyerRequest, 'status' | 'isLocked' | 'decisionArchived'>,
): boolean {
    return request.status === 'pending' && !isLawyerRequestLocked(request);
}

export function isLawyerRequestFinalStatus(status: LawyerRequestStatus): status is 'approved' | 'rejected' {
    return status === 'approved' || status === 'rejected';
}

export function isLawyerRequestMotionWorkflow(status: LawyerRequestStatus): boolean {
    return status === 'pending' || isLawyerRequestFinalStatus(status);
}

export function buildRequestFatalLockMessage(status: 'approved' | 'rejected'): string {
    const label = formatLawyerRequestStatusLabel(status);
    return `تنبيه قانوني: اعتماد حالة «${label}» يُقفل الطلب نهائياً ويمنع تعديل هامش القاضي أو تفاصيله لاحقاً. هل تؤكد الحفظ النهائي؟`;
}

export function lawyerRequestOutcomeBadgeClass(status: 'approved' | 'rejected'): string {
    return status === 'approved'
        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
        : 'border-red-500/40 bg-red-500/15 text-red-100';
}

export type LawyerRequestModalMode = 'create' | 'edit' | 'view';

/** خيارات حالة الطلب في مودال السجل الزمني القضائي — دائماً الثلاثة معاً. */
export const LAWYER_REQUEST_STATUS_OPTIONS: ReadonlyArray<{ value: LawyerRequestStatus; label: string }> = [
    { value: 'pending', label: formatLawyerRequestStatusLabel('pending') },
    { value: 'approved', label: formatLawyerRequestStatusLabel('approved') },
    { value: 'rejected', label: formatLawyerRequestStatusLabel('rejected') },
];

export function resolveLawyerRequestIsLocked(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') return false;
    const o = raw as Record<string, unknown>;
    return o.isLocked === true || o.decisionArchived === true;
}
