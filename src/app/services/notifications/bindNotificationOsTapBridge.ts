/**
 * يربط نقر إشعار نظام التشغيل (أصلي / ويب / SW) بمنطق تنقّل اللوحة + فتح الصندوق.
 */
import {
    HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT,
    HAMI_OS_NOTIFICATION_OPEN_MESSAGE,
    HAMI_OS_NOTIFY_QUERY,
    consumePendingOsNotifyResolution,
    decodeOsNotifyQueryPayload,
    dispatchOsNotificationOpenPanel,
    resolveOsNotificationTap,
    stashPendingOsNotifyIntent,
    type OsNotificationTapResolution,
} from '@/app/services/notifications/notificationOsTapRouting';
import { stashPendingCalendarAlarmEventId } from '@/app/services/notifications/osTap/calendarAlarmPending';

type NotificationOsTapNavigate = (
    path: string,
    payload: Record<string, unknown>,
) => void;

function applyResolution(
    resolution: OsNotificationTapResolution,
    onNavigate: NotificationOsTapNavigate,
): void {
    if (resolution.openPanel) {
        dispatchOsNotificationOpenPanel(resolution.focusNotificationId);
    }
    if (resolution.navigate) {
        onNavigate(resolution.navigate.path, resolution.navigate.payload);
        const eventId = resolution.navigate.payload.eventId;
        if (resolution.navigate.path === 'schedule' && typeof eventId === 'string' && eventId.trim()) {
            stashPendingCalendarAlarmEventId(eventId);
        }
    }
}

function consumeUrlOsNotifyParam(): unknown | null {
    if (typeof window === 'undefined') return null;
    try {
        const url = new URL(window.location.href);
        const raw = url.searchParams.get(HAMI_OS_NOTIFY_QUERY);
        if (!raw) return null;
        url.searchParams.delete(HAMI_OS_NOTIFY_QUERY);
        const next = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState({}, '', next);
        return decodeOsNotifyQueryPayload(raw);
    } catch {
        return null;
    }
}

/**
 * يُركَّب مرة من شلّ لوحة المحامي. يعيد دالة تنظيف.
 */
export function bindNotificationOsTapBridge(onNavigate: NotificationOsTapNavigate): () => void {
    if (typeof window === 'undefined') return () => undefined;

    const runDetail = (detail: unknown) => {
        applyResolution(resolveOsNotificationTap(detail), onNavigate);
    };

    const onNative = (event: Event) => {
        runDetail((event as CustomEvent).detail);
    };

    const onSwMessage = (event: MessageEvent) => {
        if (event.origin && event.origin !== window.location.origin) return;
        const data = event.data;
        if (!data || typeof data !== 'object') return;
        const msg = data as { type?: string; detail?: unknown };
        if (msg.type !== HAMI_OS_NOTIFICATION_OPEN_MESSAGE) return;
        runDetail(msg.detail);
    };

    window.addEventListener(HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT, onNative);
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', onSwMessage);
    }

    /* cold start من SW query / stash */
    const fromUrl = consumeUrlOsNotifyParam();
    if (fromUrl) {
        stashPendingOsNotifyIntent(fromUrl);
    }
    const pending = consumePendingOsNotifyResolution();
    if (pending) {
        /* تأجيل إطار واحد حتى يكتمل تركيب لوحة التحكم */
        requestAnimationFrame(() => {
            applyResolution(pending, onNavigate);
        });
    }

    return () => {
        window.removeEventListener(HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT, onNative);
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.removeEventListener('message', onSwMessage);
        }
    };
}
