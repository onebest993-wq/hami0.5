import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { PushNotificationService } from '@/app/services/PushNotificationService';
import { savePushSubscription } from '@/app/services/pushSubscriptionStore';
import {
    canSendPushNotifications,
    filterAlertsByNotificationSettings,
    getLawyerSettingsSnapshot,
    pushNotificationOptionsFromSettings,
} from '@/app/services/settings/settingsRuntime';
import { debug } from '@/app/utils/debug';

const SEEN_KEY = 'hami:alert-push-seen:v1';
const MAX_SEEN = 400;
// مدة احتفاظ الـ seen في localStorage — 7 أيام تمنع إعادة-push للتنبيه نفسه عبر تحديثات الصفحة
const SEEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type SeenEntry = { id: string; ts: number };

function loadSeen(): Map<string, number> {
    try {
        // مهاجرة من sessionStorage السابق (إن وُجدت): نقرأ القائمة القديمة ونحوّلها مرة واحدة
        const legacyRaw =
            typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SEEN_KEY) : null;
        const raw =
            typeof localStorage !== 'undefined' ? localStorage.getItem(SEEN_KEY) : null;
        const now = Date.now();
        const out = new Map<string, number>();
        if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    if (item && typeof item === 'object') {
                        const e = item as Partial<SeenEntry>;
                        if (typeof e.id === 'string' && typeof e.ts === 'number') {
                            if (now - e.ts <= SEEN_TTL_MS) out.set(e.id, e.ts);
                        }
                    } else if (typeof item === 'string') {
                        // legacy shape داخل localStorage أيضاً
                        out.set(item, now);
                    }
                }
            }
        }
        if (legacyRaw && typeof localStorage !== 'undefined') {
            try {
                const parsed: unknown = JSON.parse(legacyRaw);
                if (Array.isArray(parsed)) {
                    for (const item of parsed) {
                        if (typeof item === 'string' && !out.has(item)) out.set(item, now);
                    }
                }
                sessionStorage.removeItem(SEEN_KEY);
            } catch { /* ignore */ }
        }
        return out;
    } catch {
        return new Map();
    }
}

function saveSeen(seen: Map<string, number>): void {
    try {
        if (typeof localStorage === 'undefined') return;
        const now = Date.now();
        const arr: SeenEntry[] = Array.from(seen.entries())
            .filter(([, ts]) => now - ts <= SEEN_TTL_MS)
            .slice(-MAX_SEEN)
            .map(([id, ts]) => ({ id, ts }));
        localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
    } catch {
        /* ignore */
    }
}

/** طلب صلاحية الإشعارات مرة واحدة عند وجود تنبيهات حرجة */
export async function ensurePushPermissionForCriticalAlerts(alerts: SecretaryAlert[]): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const hasCritical = alerts.some((a) => a.priority <= 1);
    if (!hasCritical) return;
    if (PushNotificationService.getPermission() !== 'default') return;
    try {
        await PushNotificationService.requestPermission();
    } catch {
        /* user dismissed */
    }
}

/** إشعار محلي للتنبيهات الحرجة الجديدة فقط (بدون تكرار في الجلسة) */
const PUSH_SUB_ATTEMPTED = 'hami:push-sub-attempted';

async function persistPushSubscription(lawyerId: string | null): Promise<void> {
    if (!lawyerId) return;
    try {
        if (sessionStorage.getItem(PUSH_SUB_ATTEMPTED) === lawyerId) return;
        const sub = await PushNotificationService.subscribeToPush();
        // سجّل المحاولة حتى عند الفشل — يمنع مئات التحذيرات عند كل refresh للتنبيهات
        sessionStorage.setItem(PUSH_SUB_ATTEMPTED, lawyerId);
        if (sub) {
            await savePushSubscription(lawyerId, sub.toJSON());
        }
    } catch {
        try {
            sessionStorage.setItem(PUSH_SUB_ATTEMPTED, lawyerId);
        } catch {
            /* ignore */
        }
    }
}

export async function syncPushForNewCriticalAlerts(
    alerts: SecretaryAlert[],
    lawyerId?: string | null,
): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const settings = getLawyerSettingsSnapshot();
    if (!canSendPushNotifications(settings)) return;

    const channelFiltered = filterAlertsByNotificationSettings(alerts, settings);
    await ensurePushPermissionForCriticalAlerts(channelFiltered);
    if (PushNotificationService.getPermission() === 'granted' && lawyerId) {
        void persistPushSubscription(lawyerId);
    }
    if (PushNotificationService.getPermission() !== 'granted') return;

    const critical = channelFiltered.filter((a) => a.priority <= 1);
    if (critical.length === 0) return;

    const seen = loadSeen();
    let changed = false;
    const now = Date.now();

    for (const a of critical) {
        if (seen.has(a.id)) continue;
        try {
            await PushNotificationService.showNotification(
                pushNotificationOptionsFromSettings(settings, {
                    title: a.title,
                    body: a.summary,
                    tag: a.id,
                    data: { alertId: a.id, target: a.target, entityId: a.entityId },
                    requireInteraction: a.type === 'HEARING' || a.type === 'URGENT',
                }),
            );
            seen.set(a.id, now);
            changed = true;
        } catch (err) {
            debug.warn('[appAlertPushSync] push failed:', err);
        }
    }

    if (changed) saveSeen(seen);
}

export function markAlertSeenForPush(alertId: string): void {
    const seen = loadSeen();
    seen.set(alertId, Date.now());
    saveSeen(seen);
}
