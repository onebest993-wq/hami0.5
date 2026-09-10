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
} from '@/app/domain/dossier/dossierStorageKeys';
import { readSecureOrDrainLegacySync, clearLegacyPlaintextMirror } from '@/app/services/storage/readSecureOrDrainLegacySync';
import { isCanonicalEmptyDossierPrimary } from '@/app/services/dossierPersistence/dossierPrimaryEmpty';
import {
    excludeTombstonedLawsuitFiles,
    readLawsuitDossierTombstoneIds,
} from '@/app/utils/lawsuitDossierTombstones';

export {
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
} from '@/app/domain/dossier/dossierStorageKeys';

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
    const primaryUnread = SecureStoreService.isUnreadSync(LAWSUIT_FILES_STORAGE_KEY);
    const primaryOccupied = SecureStoreService.hasItemSync(LAWSUIT_FILES_STORAGE_KEY);
    if (primaryOccupied && primaryUnread) {
        return [];
    }
    const fromDossier = loadDossierCollectionSync('lawsuit');
    const primaryOnly = readJsonArray(LAWSUIT_FILES_STORAGE_KEY);
    if (isCanonicalEmptyDossierPrimary(primaryOnly, primaryUnread)) {
        return [];
    }
    if (fromDossier.length > 0) {
        if ((primaryOnly === null || primaryOnly.length === 0) && !primaryUnread) {
            saveLawsuitFilesRaw(fromDossier);
        }
        return fromDossier;
    }

    try {
        const fromRepo = persistenceRepository.load<unknown[]>(LAWSUIT_FILES_STORAGE_KEY);
        if (Array.isArray(fromRepo) && fromRepo.length > 0) {
            return excludeTombstonedLawsuitFiles(fromRepo as { id?: string | number }[]);
        }
    } catch {
        /* persistence may be mocked in tests */
    }

    for (const legacyKey of LAWSUIT_FILES_STORAGE_KEYS_LEGACY) {
        const legacy = readJsonArray(legacyKey);
        if (legacy !== null && legacy.length > 0) {
            const stripped = excludeTombstonedLawsuitFiles(
                legacy as { id?: string | number }[],
            );
            if (stripped.length === 0) return [];
            saveLawsuitFilesRaw(stripped);
            return stripped;
        }
    }

    return fromDossier;
}

/** حفظ ملفات الدعاوى — مصدر واحد + مرآة للمفاتيح القديمة لتوافق الإصدارات السابقة. */
export function saveLawsuitFilesRaw(next: unknown[]): void {
    const incoming = Array.isArray(next) ? next : [];
    const tombstones = readLawsuitDossierTombstoneIds();
    const payload = excludeTombstonedLawsuitFiles(
        incoming as { id?: string | number }[],
    ) as unknown[];
    const serialized = JSON.stringify(payload);
    if (payload.length === 0 && SecureStoreService.isUnreadSync(LAWSUIT_FILES_STORAGE_KEY)) {
        return;
    }
    if (payload.length === 0 && incoming.length > 0 && tombstones.size > 0) {
        for (const key of [LAWSUIT_FILES_STORAGE_KEY, ...LAWSUIT_FILES_STORAGE_KEYS_LEGACY]) {
            SecureStoreService.setItemSync(key, '[]', {
                allowVerifiedEmptyOverwrite: true,
                allowShrink: true,
            });
            clearLegacyPlaintextMirror(key);
        }
        try {
            persistenceRepository.save(LAWSUIT_FILES_STORAGE_KEY, []);
            persistenceRepository.flushPending(LAWSUIT_FILES_STORAGE_KEY);
        } catch {
            /* tests may mock persistence */
        }
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
