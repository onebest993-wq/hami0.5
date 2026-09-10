/**
 * نواة مزامنة إضبارات خفيفة — SecureStore فقط بلا backup/cloud/executionFilesStorage.
 * تُستخدم من مسار الدعاوى على اللوحة حتى لا يُسحب app-execution-storage-deferred إلى LD stem.
 */
import { debug } from '@/app/utils/debug';
import {
    EXECUTION_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEYS_LEGACY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
} from '@/app/domain/dossier/dossierStorageKeys';
import { shouldRejectDossierWipe } from './dossierWipeGuard';
import type { DossierDomain } from './dossierPersistenceTypes';
import SecureStoreService from '@/app/services/SecureStoreService';
import { mergeDossierRowsById, resolveLoadedDossierPrimary } from './dossierKeyLoad';
import {
    readSecureOrDrainLegacySync,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

type DomainConfig = {
    domain: DossierDomain;
    primaryKey: string;
    legacyKeys: readonly string[];
};

const DOMAIN_CONFIG: Record<DossierDomain, DomainConfig> = {
    lawsuit: {
        domain: 'lawsuit',
        primaryKey: LAWSUIT_FILES_STORAGE_KEY,
        legacyKeys: LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
    },
    execution: {
        domain: 'execution',
        primaryKey: EXECUTION_FILES_STORAGE_KEY,
        legacyKeys: EXECUTION_FILES_STORAGE_KEYS_LEGACY,
    },
};

function parseArray(raw: string | null): unknown[] | null {
    if (raw === null) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function decidePrimaryLoad(config: DomainConfig, primary: unknown[] | null) {
    try {
        return resolveLoadedDossierPrimary({
            primary,
            unread: SecureStoreService.isUnreadSync(config.primaryKey),
            occupied: SecureStoreService.hasItemSync(config.primaryKey),
        });
    } catch {
        return resolveLoadedDossierPrimary({
            primary,
            unread: false,
            occupied: false,
        });
    }
}

function loadFromAllKeysSync(config: DomainConfig): unknown[] {
    const primary = parseArray(readSecureOrDrainLegacySync(config.primaryKey));
    const decision = decidePrimaryLoad(config, primary);
    if (decision === 'unread' || decision === 'canonical-empty') return [];
    if (decision === 'use-primary') return primary ?? [];

    let merged: unknown[] = primary ?? [];
    for (const legacyKey of config.legacyKeys) {
        const legacy = parseArray(readSecureOrDrainLegacySync(legacyKey));
        if (legacy !== null && legacy.length > 0) {
            merged = mergeDossierRowsById(merged, legacy);
        }
    }
    return merged;
}

/** تحميل متزامن خفيف — بدون استعادة backup */
export function loadDossierCollectionSync(domain: DossierDomain): unknown[] {
    return loadFromAllKeysSync(DOMAIN_CONFIG[domain]);
}

/**
 * حفظ متزامن خفيف — مفاتيح SecureStore فقط (بلا backup/طابور سحابة).
 * المسارات الكاملة تستخدم dossierPersistenceService.persistDossierCollectionSync.
 */
export function persistDossierCollectionSyncLite(
    domain: DossierDomain,
    next: unknown[],
): unknown[] {
    const payload = Array.isArray(next) ? next : [];
    const serialized = JSON.stringify(payload);
    const config = DOMAIN_CONFIG[domain];

    const existing = readSecureOrDrainLegacySync(config.primaryKey);
    if (existing && shouldRejectDossierWipe(config.primaryKey, serialized, existing)) {
        debug.warn(`[DossierSyncLite] رفض مسح "${config.primaryKey}" — البيانات الحالية محفوظة.`);
        return parseArray(existing) ?? payload;
    }
    /*
     * getItemSync على أصل مشفَّر بارد تُرجع null فيتخطّى الحارس أعلاه.
     * setItemSync يؤجّل الكتابة ويفكّ الأصل قبل حارس المسح — لا نكتب هنا يدوياً.
     */
    writeSecureAndClearLegacySync(config.primaryKey, serialized);

    config.legacyKeys.forEach((legacyKey) => {
        try {
            const legacyExisting = readSecureOrDrainLegacySync(legacyKey);
            if (legacyExisting && shouldRejectDossierWipe(legacyKey, serialized, legacyExisting)) {
                return;
            }
            writeSecureAndClearLegacySync(legacyKey, serialized);
        } catch {
            /* ignore */
        }
    });

    return payload;
}
