import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';
import { STORAGE_KEYS } from '@/app/utils/constants';

/** المفتاح الموحّد — نفس مصدر LawyerDashboard (`lawyer_files`). */
export const LAWSUIT_FILES_STORAGE_KEY = STORAGE_KEYS.LAWYER_FILES;

/** مفاتيح قديمة تُدمَج تلقائياً عند القراءة. */
export const LAWSUIT_FILES_STORAGE_KEYS_LEGACY = [
    'lawsuitFiles',
    'hami-lawsuit-files',
    'lawsuit_files',
] as const;

function readJsonArray(key: string): unknown[] | null {
    try {
        const raw = SecureStoreService.getItemSync(key);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function persistPrimary(next: unknown[]): void {
    const serialized = JSON.stringify(next);
    try {
        persistenceRepository.save(LAWSUIT_FILES_STORAGE_KEY, next);
    } catch {
        /* persistence may be mocked in tests */
    }
    try {
        SecureStoreService.setItemSync(LAWSUIT_FILES_STORAGE_KEY, serialized);
    } catch {
        /* ignore */
    }
}

function loadFromPrimary(): unknown[] | null {
    try {
        const fromRepo = persistenceRepository.load<unknown[]>(LAWSUIT_FILES_STORAGE_KEY);
        if (Array.isArray(fromRepo)) {
            return fromRepo;
        }
    } catch {
        /* persistence may be mocked in tests */
    }
    return readJsonArray(LAWSUIT_FILES_STORAGE_KEY);
}

/** تحميل ملفات الدعاوى — يفضّل `lawyer_files` ثم يدمج المفاتيح القديمة. */
export function loadLawsuitFilesRaw(): unknown[] {
    const primary = loadFromPrimary();
    if (primary !== null) {
        return primary;
    }

    for (const legacyKey of LAWSUIT_FILES_STORAGE_KEYS_LEGACY) {
        const legacy = readJsonArray(legacyKey);
        if (legacy !== null) {
            persistPrimary(legacy);
            return legacy;
        }
    }

    return [];
}

/** حفظ ملفات الدعاوى — مصدر واحد + مرآة للمفاتيح القديمة لتوافق الإصدارات السابقة. */
export function saveLawsuitFilesRaw(next: unknown[]): void {
    const payload = Array.isArray(next) ? next : [];
    persistPrimary(payload);

    const serialized = JSON.stringify(payload);
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY.forEach((k) => {
        try {
            SecureStoreService.setItemSync(k, serialized);
        } catch {
            /* ignore */
        }
    });
}
