/**
 * فحص قطع التعاون بلا لقطة إعدادات ولا SecureStore —
 * لواجهة الاستشارة المؤجّلة. الحارس المُلزِم يبقى `canReachCollaborationNetwork`.
 */
import { readLocalOnlyBootFlag } from './localOnlyUrlPolicy';

export const COLLABORATION_NETWORK_OFF = 'COLLABORATION_NETWORK_OFF';

export function isCollaborationNetworkCut(): boolean {
    try {
        if (typeof document !== 'undefined' && document.documentElement.dataset.hamiLocalOnly === '1') {
            return true;
        }
    } catch {
        /* ignore */
    }
    return readLocalOnlyBootFlag();
}
