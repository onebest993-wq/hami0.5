import SecureStoreService from '@/app/services/SecureStoreService';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { STORAGE_KEYS } from '@/app/utils/constants';

/** المفتاح الموحّد — lawyer_notes هو مصدر الحقيقة الوحيد */
export const GLOBAL_NOTES_STORAGE_KEY = STORAGE_KEYS.LAWYER_NOTES;

/** مفاتيح قديمة — تُقرأ للترحيل فقط، لا تُكتب إليها بعد الآن */
export const GLOBAL_NOTES_STORAGE_KEYS_LEGACY = ['globalNotes', 'global_notes'] as const;

function parseNotesArray(raw: string | null): unknown[] | null {
    if (!raw?.trim()) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function readSyncKey(key: string): unknown[] | null {
    try {
        const raw = SecureStoreService.getItemSync(key);
        return parseNotesArray(raw);
    } catch {
        return null;
    }
}

/** تحميل الملاحظات — lawyer_notes أولاً ثم ترحيل من المفاتيح القديمة */
export function loadGlobalNotesRaw(): unknown[] {
    const fromPrimary = readSyncKey(STORAGE_KEYS.LAWYER_NOTES);
    if (fromPrimary && fromPrimary.length > 0) return fromPrimary;

    for (const legacyKey of GLOBAL_NOTES_STORAGE_KEYS_LEGACY) {
        const legacy = readSyncKey(legacyKey);
        if (!legacy || legacy.length === 0) continue;
        saveGlobalNotesRaw(legacy);
        return legacy;
    }

    return fromPrimary ?? [];
}

/** حفظ الملاحظات — lawyer_notes فقط (محمي + نسخة احتياطية) */
export function saveGlobalNotesRaw(next: unknown[]): void {
    const payload = Array.isArray(next) ? next : [];
    SecureStoreService.setItemSync(STORAGE_KEYS.LAWYER_NOTES, JSON.stringify(payload));
    try {
        persistenceRepository.save(STORAGE_KEYS.LAWYER_NOTES, payload);
    } catch {
        /* بيئات mock بدون persistenceRepository */
    }
}
