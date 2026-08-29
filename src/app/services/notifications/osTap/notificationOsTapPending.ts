import {
    isNotificationNavTarget,
    sanitizeNotificationActionPayload,
    sanitizeNotificationFocusId,
} from '@/app/services/notifications/notificationNavigateSecurity';
import { HAMI_OS_NOTIFY_PENDING_KEY } from '@/app/services/notifications/notificationOsTapEvents';
import {
    asOsTapRecord,
    type OsNotificationTapIntent,
    type OsNotificationTapResolution,
} from '@/app/services/notifications/osTap/notificationOsTapExtract';
import { resolveOsNotificationTap } from '@/app/services/notifications/osTap/notificationOsTapIntent';

export function stashPendingOsNotifyIntent(detail: unknown): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
        const resolution = resolveOsNotificationTap(detail);
        if (!resolution.navigate && !resolution.openPanel) return;
        sessionStorage.setItem(
            HAMI_OS_NOTIFY_PENDING_KEY,
            JSON.stringify({
                v: 2,
                navigate: resolution.navigate,
                openPanel: resolution.openPanel,
                focusNotificationId: resolution.focusNotificationId,
            }),
        );
    } catch {
        /* ignore quota / private mode */
    }
}

export function consumePendingOsNotifyResolution(): OsNotificationTapResolution | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(HAMI_OS_NOTIFY_PENDING_KEY);
        if (!raw) return null;
        sessionStorage.removeItem(HAMI_OS_NOTIFY_PENDING_KEY);
        const parsed = JSON.parse(raw) as Record<string, unknown>;

        if (parsed?.v === 2) {
            const navigateRecord = asOsTapRecord(parsed.navigate);
            const path = typeof navigateRecord?.path === 'string' ? navigateRecord.path : '';
            const navigate =
                path && isNotificationNavTarget(path)
                    ? {
                          path,
                          payload: sanitizeNotificationActionPayload(
                              asOsTapRecord(navigateRecord?.payload) ?? {},
                          ),
                      }
                    : null;
            const focus = sanitizeNotificationFocusId(parsed.focusNotificationId);
            return {
                navigate,
                openPanel: parsed.openPanel === true,
                focusNotificationId: focus,
            };
        }

        const legacy = parsed as Partial<OsNotificationTapIntent>;
        if (!legacy?.path || !isNotificationNavTarget(legacy.path)) return null;
        return {
            navigate: {
                path: legacy.path,
                payload: sanitizeNotificationActionPayload(asOsTapRecord(legacy.payload) ?? {}),
            },
            openPanel: false,
            focusNotificationId: null,
        };
    } catch {
        return null;
    }
}

/** توافق الاختبارات القديمة */
export function consumePendingOsNotifyIntent(): OsNotificationTapIntent | null {
    const resolution = consumePendingOsNotifyResolution();
    return resolution?.navigate ?? null;
}
