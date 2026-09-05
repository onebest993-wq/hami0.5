/**
 * شبكة التعاون — منتدى / استشارة زميل / طلب عون.
 *
 * ليست مزامنة إضابير (`isLawyerWorkCloudLive`). إرسال مقتطف موجَّه لا يجب
 * أن يفرض رفع كل الدعاوى والمعاملات. WIFE يوقّع الطلب عند الاستدعاء الفعلي.
 * تُقطع فقط عند «قطع الاتصال» (`localOnlyMode`).
 */
import { isLocalOnlyModeEnabled } from './localOnlyGuard';
import { COLLABORATION_NETWORK_OFF } from './collaborationNetworkLite';
import type { AppSettingsState } from './types';

export { COLLABORATION_NETWORK_OFF } from './collaborationNetworkLite';

export function canReachCollaborationNetwork(settings?: AppSettingsState): boolean {
    return !isLocalOnlyModeEnabled(settings);
}

export function assertCollaborationNetworkReachable(settings?: AppSettingsState): void {
    if (!canReachCollaborationNetwork(settings)) {
        throw new Error(COLLABORATION_NETWORK_OFF);
    }
}
