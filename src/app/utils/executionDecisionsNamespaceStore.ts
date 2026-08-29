/**
 * Decisions namespace — scoped SecureStore read/write helpers.
 */
import {
    deleteScopedSecureAndClearLegacySync,
    readScopedSecureOrDrainLegacySync,
    writeScopedSecureAndClearLegacySync,
} from '@/app/utils/readScopedSecureOrDrainLegacySync';

export function parseStoredDecisionsArray(raw: string | null): Record<string, unknown>[] {
    if (!raw) return [];
    try {
        const v = JSON.parse(raw) as unknown;
        return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
    } catch {
        return [];
    }
}

/** قراءة قرارات: المفتاح المقيّد بالمالك أولاً ثم ترحيل leftover / غير المقيّد إن وُجد */
export function readDecisionsStoreRaw(logicalKey: string): string | null {
    return readScopedSecureOrDrainLegacySync(logicalKey);
}

/** كتابة قرارات على المفتاح المقيّد عند وجود جلسة — يُزال التوأم غير المقيّد لتقليل تسرّب عبر الحسابات */
export function writeDecisionsStoreRaw(logicalKey: string, value: string): void {
    writeScopedSecureAndClearLegacySync(logicalKey, value);
}

export function deleteDecisionsStoreRaw(logicalKey: string): void {
    deleteScopedSecureAndClearLegacySync(logicalKey);
}
