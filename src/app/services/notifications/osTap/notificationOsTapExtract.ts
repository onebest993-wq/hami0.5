import {
    sanitizeNotificationFocusId,
    type NotificationNavTarget,
} from '@/app/services/notifications/notificationNavigateSecurity';
import { MAX_OS_NOTIFY_QUERY_CHARS } from '@/app/services/notifications/notificationInboxSanitize';

export type OsNotificationTapIntent = {
    path: NotificationNavTarget;
    payload: Record<string, unknown>;
};

export type OsNotificationTapResolution = {
    navigate: OsNotificationTapIntent | null;
    openPanel: boolean;
    focusNotificationId: string | null;
};

export function asOsTapRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

/** يستخرج حمولة التوجيه من أشكال Capacitor/Web/SW المختلفة. */
export function extractOsNotificationTapData(detail: unknown): Record<string, unknown> {
    const root = asOsTapRecord(detail);
    if (!root) return {};

    const nestedExtra = asOsTapRecord(root.extra);
    if (nestedExtra && Object.keys(nestedExtra).length > 0) return nestedExtra;

    const nestedData = asOsTapRecord(root.data);
    if (nestedData && Object.keys(nestedData).length > 0) return nestedData;

    return root;
}

/** معرّف إشعار الصندوق — نص فقط (لا id الرقمي الأصلي لـ Capacitor). */
export function extractOsNotificationFocusId(raw: Record<string, unknown>): string | null {
    for (const key of ['notificationId', 'shellNotificationId'] as const) {
        const id = sanitizeNotificationFocusId(raw[key]);
        if (id) return id;
    }
    if (typeof raw.id === 'string') {
        return sanitizeNotificationFocusId(raw.id);
    }
    return null;
}

export function decodeOsNotifyQueryPayload(raw: string | null | undefined): unknown {
    if (!raw?.trim() || raw.length > MAX_OS_NOTIFY_QUERY_CHARS) return null;
    try {
        const decoded = decodeURIComponent(raw);
        if (decoded.length > MAX_OS_NOTIFY_QUERY_CHARS) return null;
        const parsed: unknown = JSON.parse(decoded);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return parsed;
    } catch {
        return null;
    }
}
