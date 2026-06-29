/** مسارات التنقّل المسموحة من إشعار */
export const NOTIFICATION_NAV_TARGETS = [
    'community',
    'vault',
    'scan_document',
] as const;

export type NotificationNavTarget = (typeof NOTIFICATION_NAV_TARGETS)[number];

const ALLOWED_PAYLOAD_KEYS = new Set([
    'postId',
    'questionId',
    'fileId',
    'tab',
    'commentId',
    'threadId',
    'caseId',
]);

const MAX_PAYLOAD_STRING_LEN = 128;

export function isNotificationNavTarget(path: string): path is NotificationNavTarget {
    return (NOTIFICATION_NAV_TARGETS as readonly string[]).includes(path);
}

export function sanitizeNotificationActionPayload(
    payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
    if (!payload || typeof payload !== 'object') return {};
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
        if (!ALLOWED_PAYLOAD_KEYS.has(key)) continue;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed && trimmed.length <= MAX_PAYLOAD_STRING_LEN) out[key] = trimmed;
        } else if (typeof value === 'number' && Number.isFinite(value)) {
            out[key] = value;
        }
    }
    return out;
}
