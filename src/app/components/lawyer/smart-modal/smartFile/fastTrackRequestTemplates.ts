import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { readSecureJsonRawSync, writeSecureJsonValue } from '@/app/services/storage/syncSecureJson';

const LEGACY_STORAGE_KEY = 'hami:fast-track-request-type-templates';
const MAX_TEMPLATES = 20;
const MAX_TEMPLATE_LENGTH = 80;

export function normalizeRequestTypeTemplate(text: string): string {
    return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function resolveTemplatesUserId(userId?: string | null): string {
    const preferred = String(userId ?? '').trim();
    if (preferred) return preferred;
    try {
        return String(resolveCalendarUserId() ?? '').trim();
    } catch {
        return '';
    }
}

/** مفتاح التخزين حسب المستخدم — بدون userId يبقى المفتاح التراثي غير المقيّد */
export function requestTypeTemplatesStorageKey(userId?: string | null): string {
    const uid = resolveTemplatesUserId(userId);
    return uid ? `${LEGACY_STORAGE_KEY}:${uid}` : LEGACY_STORAGE_KEY;
}

function parseTemplatesRaw(raw: string | null): string[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const seen = new Set<string>();
        const out: string[] = [];
        for (const item of parsed) {
            const normalized = normalizeRequestTypeTemplate(String(item));
            if (!normalized || seen.has(normalized)) continue;
            seen.add(normalized);
            out.push(normalized);
            if (out.length >= MAX_TEMPLATES) break;
        }
        return out;
    } catch {
        return [];
    }
}

export function loadRequestTypeTemplates(userId?: string | null): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const uid = resolveTemplatesUserId(userId);
        const scopedKey = requestTypeTemplatesStorageKey(uid || null);
        const scoped = parseTemplatesRaw(readSecureJsonRawSync(scopedKey));
        if (scoped.length > 0) return scoped;
        // ترحيل لمرة واحدة من المفتاح غير المقيّد إن وُجدت قوالب تراثية
        if (uid && scopedKey !== LEGACY_STORAGE_KEY) {
            const legacy = parseTemplatesRaw(readSecureJsonRawSync(LEGACY_STORAGE_KEY));
            if (legacy.length > 0) {
                persistRequestTypeTemplates(legacy, uid);
                return legacy;
            }
        }
        return [];
    } catch {
        return [];
    }
}

export function persistRequestTypeTemplates(templates: string[], userId?: string | null): void {
    if (typeof window === 'undefined') return;
    writeSecureJsonValue(requestTypeTemplatesStorageKey(userId), templates.slice(0, MAX_TEMPLATES));
}

export function addRequestTypeTemplate(templates: string[], text: string): string[] {
    const normalized = normalizeRequestTypeTemplate(text);
    if (!normalized || normalized.length > MAX_TEMPLATE_LENGTH) return templates;
    const withoutDup = templates.filter((t) => t !== normalized);
    return [normalized, ...withoutDup].slice(0, MAX_TEMPLATES);
}

export function removeRequestTypeTemplate(templates: string[], text: string): string[] {
    const normalized = normalizeRequestTypeTemplate(text);
    return templates.filter((t) => t !== normalized);
}
