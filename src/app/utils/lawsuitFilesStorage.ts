import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    loadDossierCollectionSync,
    persistDossierCollectionSyncLite,
} from '@/app/services/dossierPersistence/dossierCollectionSyncLite';
import { shouldRejectDossierWipe } from '@/app/services/dossierPersistence/dossierWipeGuard';
import {
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import { readSecureOrDrainLegacySync, clearLegacyPlaintextMirror } from '@/app/services/storage/readSecureOrDrainLegacySync';

export {
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';

function readJsonArray(key: string): unknown[] | null {
    try {
        const raw = readSecureOrDrainLegacySync(key);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/** تحميل ملفات الدعاوى — يفضّل `lawyer_files` ثم يدمج المفاتيح القديمة. */
export function loadLawsuitFilesRaw(): unknown[] {
    const fromDossier = loadDossierCollectionSync('lawsuit');
    if (fromDossier.length > 0) {
        const primaryOnly = readJsonArray(LAWSUIT_FILES_STORAGE_KEY);
        if (
            (primaryOnly === null || primaryOnly.length === 0) &&
            !SecureStoreService.isUnreadSync(LAWSUIT_FILES_STORAGE_KEY)
        ) {
            saveLawsuitFilesRaw(fromDossier);
        }
        return fromDossier;
    }

    try {
        const fromRepo = persistenceRepository.load<unknown[]>(LAWSUIT_FILES_STORAGE_KEY);
        if (Array.isArray(fromRepo) && fromRepo.length > 0) {
            return fromRepo;
        }
    } catch {
        /* persistence may be mocked in tests */
    }

    for (const legacyKey of LAWSUIT_FILES_STORAGE_KEYS_LEGACY) {
        const legacy = readJsonArray(legacyKey);
        if (legacy !== null && legacy.length > 0) {
            saveLawsuitFilesRaw(legacy);
            return legacy;
        }
    }

    return fromDossier;
}

/** حفظ ملفات الدعاوى — مصدر واحد + مرآة للمفاتيح القديمة لتوافق الإصدارات السابقة. */
export function saveLawsuitFilesRaw(next: unknown[]): void {
    const payload = Array.isArray(next) ? next : [];
    const serialized = JSON.stringify(payload);
    if (SecureStoreService.isUnreadSync(LAWSUIT_FILES_STORAGE_KEY)) {
        return;
    }
    const existing = readSecureOrDrainLegacySync(LAWSUIT_FILES_STORAGE_KEY);
    if (existing && shouldRejectDossierWipe(LAWSUIT_FILES_STORAGE_KEY, serialized, existing)) {
        return;
    }
    persistDossierCollectionSyncLite('lawsuit', payload);
    try {
        persistenceRepository.save(LAWSUIT_FILES_STORAGE_KEY, payload);
        persistenceRepository.flushPending(LAWSUIT_FILES_STORAGE_KEY);
    } catch {
        /* persistence may be mocked in tests */
    }
    SecureStoreService.setItemSync(LAWSUIT_FILES_STORAGE_KEY, serialized);
    clearLegacyPlaintextMirror(LAWSUIT_FILES_STORAGE_KEY);
    SecureStoreService.flushHeavyPersistPending();
}
