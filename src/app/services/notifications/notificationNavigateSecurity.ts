/** مسارات التنقّل المسموحة من إشعار */
export const NOTIFICATION_NAV_TARGETS = [
    'community',
    'vault',
    'scan_document',
    'schedule',
    'case_details',
    'execution_home',
    'lawsuit_home',
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
    'caseNo',
    'notificationId',
    'type',
    'forumType',
    /** تذكير تقويم أصلي — يفتح الموعد مباشرة بعد نقر إشعار النظام */
    'eventId',
    'date',
]);

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const SERVER_PAYLOAD_META_KEYS = new Set(['dedupeKey', 'appendedBy', 'readSyncedBy', 'readSyncedAt']);

export const MAX_PAYLOAD_STRING_LEN = 128;

/** أحرف تكسر مُحدِّد CSS / HTML أو تُدخل مخططاً خطيراً */
const UNSAFE_ID_CHARS = /[<>'"[\]\u0000-\u001F\u007F]/;
const SCHEME_ID = /^(javascript|data|vbscript):/i;

export function isNotificationNavTarget(path: string): path is NotificationNavTarget {
    return (NOTIFICATION_NAV_TARGETS as readonly string[]).includes(path);
}

/**
 * معرّف تنقّل/تركيز آمن — يرفض javascript: وعلامات HTML وأقواس المُحدِّد.
 * يسمح بالعربية والشرطة المائلة (رقم إضبارة مثل 1/ك/2024).
 */
export function sanitizeNotificationEntityId(raw: unknown): string | null {
    if (raw == null) return null;
    const id = String(raw).trim();
    if (!id || id.length > MAX_PAYLOAD_STRING_LEN) return null;
    if (UNSAFE_ID_CHARS.test(id) || SCHEME_ID.test(id)) return null;
    return id;
}

export function sanitizeNotificationFocusId(raw: unknown): string | null {
    return sanitizeNotificationEntityId(raw);
}

export function sanitizeNotificationCalendarDate(raw: unknown): string | null {
    const s = String(raw ?? '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
        return null;
    }
    return s;
}

function sanitizePayloadValue(key: string, value: unknown): string | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return sanitizeNotificationEntityId(String(value));
    }
    if (typeof value !== 'string') return null;
    if (key === 'date') return sanitizeNotificationCalendarDate(value);
    return sanitizeNotificationEntityId(value);
}

export function sanitizeNotificationActionPayload(
    payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
        if (DANGEROUS_KEYS.has(key) || !ALLOWED_PAYLOAD_KEYS.has(key)) continue;
        const next = sanitizePayloadValue(key, value);
        if (next) out[key] = next;
    }
    return out;
}

/**
 * يُبقي مفاتيح الخادم (dedupeKey / appendedBy) ويصفّر مفاتيح التنقّل فقط.
 */
export function mergeSanitizedNotificationActionPayload(
    payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
    const src =
        payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    const out: Record<string, unknown> = { ...sanitizeNotificationActionPayload(src) };
    const dedupe = sanitizeNotificationEntityId(src.dedupeKey);
    if (dedupe) out.dedupeKey = dedupe;
    if (src.appendedBy === 'server') out.appendedBy = 'server';
    if (src.readSyncedBy === 'server') out.readSyncedBy = 'server';
    if (typeof src.readSyncedAt === 'string') {
        const t = Date.parse(src.readSyncedAt.trim().slice(0, 40));
        if (Number.isFinite(t)) out.readSyncedAt = new Date(t).toISOString();
    }
    for (const key of Object.keys(out)) {
        if (DANGEROUS_KEYS.has(key)) delete out[key];
    }
    void SERVER_PAYLOAD_META_KEYS;
    return out;
}
