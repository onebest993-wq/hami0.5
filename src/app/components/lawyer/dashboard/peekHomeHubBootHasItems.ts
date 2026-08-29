import { peekDashboardFrame1Snapshot } from '@/app/bootstrap/dashboardFrame1Snapshot';
import { peekBootSessionPeekSync } from '@/boot/peekBootSessionUserId';

/**
 * لقطة قرص فقط — هل المركز سيحتوي عناصر بعد التسوية.
 * لا يُستخدم لحجز 240px على الهيكل: البطاقة الحية أثناء التسوية تبقى على أرضية الفارغة.
 */
export function peekHomeHubBootHasItems(): boolean {
    const uid = peekBootSessionPeekSync()?.userId?.trim();
    if (!uid) return false;
    const snap = peekDashboardFrame1Snapshot(uid);
    if (!snap) return false;
    return snap.secretaryAlertCount > 0 || snap.pinnedCount > 0 || snap.urgentAlertsCount > 0;
}
