import type { AdminVerificationStatus } from '@/app/domain/admin/AdminUser';
import { parseAdminVerificationStatus } from '@/app/domain/admin/hqUserPresence';

/** حدث خفيف — بعد طفرة في المقر يُحدَّث نبض الشريط دون انتظار الاستطلاع. */
export const HQ_STATUS_REFRESH_EVENT = 'hami-hq-status-refresh';

/** اعتماد/رفض في التوثيق — يرقّع دليل المستخدمين فوراً ثم ينبض التحديث. */
export const HQ_VERIFICATION_CHANGED_EVENT = 'hami-hq-verification-changed';

export type HqVerificationChangedDetail = {
    userId: string;
    status: Exclude<AdminVerificationStatus, 'none'>;
};

export function dispatchHqStatusRefresh(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(HQ_STATUS_REFRESH_EVENT));
}

export function dispatchHqVerificationChanged(userId: string, status: unknown): void {
    if (typeof window === 'undefined') return;
    const id = String(userId ?? '').trim();
    const parsed = parseAdminVerificationStatus(status);
    if (!id || parsed === 'none') return;
    window.dispatchEvent(
        new CustomEvent<HqVerificationChangedDetail>(HQ_VERIFICATION_CHANGED_EVENT, {
            detail: { userId: id, status: parsed },
        }),
    );
    dispatchHqStatusRefresh();
}
