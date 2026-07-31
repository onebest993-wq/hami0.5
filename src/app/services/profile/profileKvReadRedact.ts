import { redactProfileForVisitorView } from '@/app/services/profile/profileVisitorView';
import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';

/** يستخرج معرّف صاحب الملف من مفتاح KV: profile:{userId} */
export function parseProfileKvOwnerId(key: string): string | null {
    if (!key.startsWith('profile:')) return null;
    const ownerId = key.slice('profile:'.length).trim();
    return ownerId || null;
}

function looksLikeLawyerProfile(value: unknown): value is LawyerProfileData {
    if (!value || typeof value !== 'object') return false;
    const rec = value as Record<string, unknown>;
    return Boolean(rec.header) && typeof rec.header === 'object' && Array.isArray(rec.sections);
}

/**
 * عند قراءة ملف مهني لغير المالك عبر kv-proxy:
 * يُطبَّق الـ redact على الخادم قبل إرسال الحمولة — لا يعتمد على العميل.
 */
export function redactProfileKvValueForViewer(
    key: string,
    viewerId: string,
    value: unknown,
): unknown {
    if (value == null) return value;
    const ownerId = parseProfileKvOwnerId(key);
    if (!ownerId) return value;
    if (ownerId === viewerId.trim()) return value;
    if (!looksLikeLawyerProfile(value)) return value;
    return redactProfileForVisitorView(value);
}
