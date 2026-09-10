import SecureStoreService from '@/app/services/SecureStoreService';
import {
    EXECUTION_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEYS_LEGACY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
} from '@/app/domain/dossier/dossierStorageKeys';
import { readLatestDossierBackup, writeDossierBackup } from './dossierBackupStore';
import { shouldRejectDossierWipe } from './dossierWipeGuard';
import { isCanonicalEmptyDossierPrimary } from './dossierPrimaryEmpty';
import { mergeDossierRowsById, resolveLoadedDossierPrimary } from './dossierKeyLoad';
import { filterTombstonedLawsuitSyncRows } from '@/app/utils/lawsuitDossierTombstones';
import { debug } from '@/app/utils/debug';
import { isLawyerWorkCloudLive } from '@/app/services/settings/lawyerWorkCloudGate';
import type { DossierCloudSyncOp, DossierDomain } from './dossierPersistenceTypes';
import { DOSSIER_SYNC_QUEUE_KEY } from './dossierPersistenceTypes';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

type DomainConfig = {
    domain: DossierDomain;
    primaryKey: string;
    legacyKeys: readonly string[];
    revisionKey: string;
};

const DOMAIN_CONFIG: Record<DossierDomain, DomainConfig> = {
    lawsuit: {
        domain: 'lawsuit',
        primaryKey: LAWSUIT_FILES_STORAGE_KEY,
        legacyKeys: LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
        revisionKey: 'hami:dossier:rev:lawsuit',
    },
    execution: {
        domain: 'execution',
        primaryKey: EXECUTION_FILES_STORAGE_KEY,
        legacyKeys: EXECUTION_FILES_STORAGE_KEYS_LEGACY,
        revisionKey: 'hami:dossier:rev:execution',
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

function sanitizeDossierPayload(
    domain: DossierDomain,
    next: unknown[],
): { payload: unknown[]; emptiedByTombstone: boolean } {
    const incoming = Array.isArray(next) ? next : [];
    if (domain !== 'lawsuit') return { payload: incoming, emptiedByTombstone: false };
    const payload = filterTombstonedLawsuitSyncRows(incoming);
    return {
        payload,
        emptiedByTombstone: incoming.length > 0 && payload.length === 0,
    };
}

function writeOptionsForPayload(emptiedByTombstone: boolean): {
    allowVerifiedEmptyOverwrite?: boolean;
    allowShrink?: boolean;
} {
    return emptiedByTombstone
        ? { allowVerifiedEmptyOverwrite: true, allowShrink: true }
        : {};
}

function readRevision(config: DomainConfig): number {
    try {
        const raw = readSecureOrDrainLegacySync(config.revisionKey);
        const n = raw ? Number.parseInt(raw, 10) : 0;
        return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
        return 0;
    }
}

function bumpRevision(config: DomainConfig): number {
    const next = readRevision(config) + 1;
    try {
        SecureStoreService.setItemSync(config.revisionKey, String(next));
        clearLegacyPlaintextMirror(config.revisionKey);
    } catch {
        /* ignore */
    }
    return next;
}

function readRawSync(key: string): string | null {
    return readSecureOrDrainLegacySync(key);
}

async function readRawAsync(key: string): Promise<string | null> {
    const drained = readSecureOrDrainLegacySync(key);
    if (drained != null) return drained;
    return SecureStoreService.getItem(key);
}

function writeRawGuarded(
    key: string,
    payload: unknown[],
    options: { allowVerifiedEmptyOverwrite?: boolean; allowShrink?: boolean } = {},
): void {
    const serialized = JSON.stringify(payload);
    const existing = readRawSync(key);
    if (
        existing &&
        !options.allowVerifiedEmptyOverwrite &&
        shouldRejectDossierWipe(key, serialized, existing)
    ) {
        debug.warn(`[DossierPersistence] رفض مسح "${key}" — البيانات الحالية محفوظة.`);
        return;
    }
    SecureStoreService.setItemSync(key, serialized, options);
    clearLegacyPlaintextMirror(key);
}

async function writeRawGuardedAsync(
    key: string,
    payload: unknown[],
    options: { allowVerifiedEmptyOverwrite?: boolean; allowShrink?: boolean } = {},
): Promise<void> {
    const serialized = JSON.stringify(payload);
    const existing = await readRawAsync(key);
    if (
        existing &&
        !options.allowVerifiedEmptyOverwrite &&
        shouldRejectDossierWipe(key, serialized, existing)
    ) {
        debug.warn(`[DossierPersistence] رفض مسح "${key}" — البيانات الحالية محفوظة.`);
        return;
    }
    await SecureStoreService.setItem(key, serialized, options);
    clearLegacyPlaintextMirror(key);
}

async function restoreFromBackupIfNeeded(
    config: DomainConfig,
    loaded: unknown[],
): Promise<unknown[]> {
    if (loaded.length > 0) return loaded;
    try {
        if (
            SecureStoreService.hasItemSync(config.primaryKey) &&
            SecureStoreService.isUnreadSync(config.primaryKey)
        ) {
            return loaded;
        }
        const primary = parseArray(await readRawAsync(config.primaryKey));
        if (
            isCanonicalEmptyDossierPrimary(
                primary,
                SecureStoreService.isUnreadSync(config.primaryKey),
            )
        ) {
            return loaded;
        }
    } catch {
        /* إن تعذّر التمييز نكمل مسار النسخة الاحتياطية القديم */
    }
    const backup = await readLatestDossierBackup(config.domain);
    if (!backup || backup.payload.length === 0) return loaded;
    const { payload } = sanitizeDossierPayload(config.domain, backup.payload);
    if (payload.length === 0) return loaded;
    debug.warn(
        `[DossierPersistence] استعادة ${payload.length} إضبارة من النسخة الاحتياطية (${config.domain})`,
    );
    await persistDossierCollection(config.domain, payload, { skipBackup: true, skipCloudQueue: true });
    return payload;
}

function loadFromAllKeysSync(config: DomainConfig): unknown[] {
    const primary = parseArray(readRawSync(config.primaryKey));
    const decision = decidePrimaryLoad(config, primary);
    if (decision === 'unread' || decision === 'canonical-empty') return [];
    if (decision === 'use-primary') return primary ?? [];

    let merged: unknown[] = primary ?? [];
    for (const legacyKey of config.legacyKeys) {
        const legacy = parseArray(readRawSync(legacyKey));
        if (legacy !== null && legacy.length > 0) {
            merged = mergeDossierRowsById(merged, legacy);
        }
    }
    return merged;
}

async function loadFromAllKeysAsync(config: DomainConfig): Promise<unknown[]> {
    const primary = parseArray(await readRawAsync(config.primaryKey));
    const decision = decidePrimaryLoad(config, primary);
    if (decision === 'unread' || decision === 'canonical-empty') return [];
    if (decision === 'use-primary') return primary ?? [];

    let merged: unknown[] = primary ?? [];
    for (const legacyKey of config.legacyKeys) {
        const legacy = parseArray(await readRawAsync(legacyKey));
        if (legacy !== null && legacy.length > 0) {
            merged = mergeDossierRowsById(merged, legacy);
        }
    }
    return merged;
}

/** تحميل متزامn — بعد ensurePersistedReady فقط */
export function loadDossierCollectionSync(domain: DossierDomain): unknown[] {
    return loadFromAllKeysSync(DOMAIN_CONFIG[domain]);
}

/** تحميل كامل مع استعادة من النسخة الاحتياطية عند الفراغ غير المتوقع.
 * يسخّن مفاتيح هذا النطاق فقط — لا ينتظر فكّ الجزائي/المنتدى. */
export async function loadDossierCollectionAsync(domain: DossierDomain): Promise<unknown[]> {
    if (domain === 'lawsuit') {
        await SecureStoreService.ensureLawsuitKeysReady();
    } else {
        await SecureStoreService.ensureExecutionIndexReady();
    }
    const config = DOMAIN_CONFIG[domain];
    const loaded = await loadFromAllKeysAsync(config);
    return restoreFromBackupIfNeeded(config, loaded);
}

export type PersistDossierOptions = {
    skipBackup?: boolean;
    skipCloudQueue?: boolean;
};

/** حفظ موحّد مع نسخة احتياطية + طابور مزامنة سحابية (مستقبلاً) */
export async function persistDossierCollection(
    domain: DossierDomain,
    next: unknown[],
    options?: PersistDossierOptions,
): Promise<unknown[]> {
    const { payload, emptiedByTombstone } = sanitizeDossierPayload(domain, next);
    const config = DOMAIN_CONFIG[domain];
    const writeOptions = writeOptionsForPayload(emptiedByTombstone);

    if (!options?.skipBackup && payload.length > 0) {
        const rev = bumpRevision(config);
        void writeDossierBackup(config.domain, payload, rev);
    }

    await writeRawGuardedAsync(config.primaryKey, payload, writeOptions);
    const serialized = JSON.stringify(payload);
    for (const legacyKey of config.legacyKeys) {
        try {
            const existing = await readRawAsync(legacyKey);
            if (
                existing &&
                !writeOptions.allowVerifiedEmptyOverwrite &&
                shouldRejectDossierWipe(legacyKey, serialized, existing)
            ) {
                continue;
            }
            await SecureStoreService.setItem(legacyKey, serialized, writeOptions);
        } catch {
            /* ignore legacy mirror errors */
        }
    }

    if (!options?.skipCloudQueue && payload.length > 0 && isLawyerWorkCloudLive()) {
        enqueueCloudSyncOp({
            id: `${domain}-${Date.now()}`,
            domain,
            op: 'upsert_collection',
            createdAt: new Date().toISOString(),
            status: 'pending',
        });
    }

    return payload;
}

/** حفظ متزامn — للمسارات السريعة بعد التحقق */
export function persistDossierCollectionSync(
    domain: DossierDomain,
    next: unknown[],
    options?: PersistDossierOptions,
): unknown[] {
    const { payload, emptiedByTombstone } = sanitizeDossierPayload(domain, next);
    const config = DOMAIN_CONFIG[domain];
    const writeOptions = writeOptionsForPayload(emptiedByTombstone);

    if (!options?.skipBackup && payload.length > 0) {
        const rev = bumpRevision(config);
        void writeDossierBackup(config.domain, payload, rev);
    }

    writeRawGuarded(config.primaryKey, payload, writeOptions);
    const serialized = JSON.stringify(payload);
    config.legacyKeys.forEach((legacyKey) => {
        try {
            const existing = readRawSync(legacyKey);
            if (
                existing &&
                !writeOptions.allowVerifiedEmptyOverwrite &&
                shouldRejectDossierWipe(legacyKey, serialized, existing)
            ) {
                return;
            }
            SecureStoreService.setItemSync(legacyKey, serialized, writeOptions);
        } catch {
            /* ignore */
        }
    });

    if (!options?.skipCloudQueue && payload.length > 0 && isLawyerWorkCloudLive()) {
        enqueueCloudSyncOp({
            id: `${domain}-${Date.now()}`,
            domain,
            op: 'upsert_collection',
            createdAt: new Date().toISOString(),
            status: 'pending',
        });
    }

    return payload;
}

function enqueueCloudSyncOp(op: DossierCloudSyncOp): void {
    try {
        const raw = readSecureOrDrainLegacySync(DOSSIER_SYNC_QUEUE_KEY);
        const queue: DossierCloudSyncOp[] = raw ? (JSON.parse(raw) as DossierCloudSyncOp[]) : [];
        if (!Array.isArray(queue)) return;
        queue.push(op);
        const trimmed = queue.slice(-200);
        SecureStoreService.setItemSync(DOSSIER_SYNC_QUEUE_KEY, JSON.stringify(trimmed));
        clearLegacyPlaintextMirror(DOSSIER_SYNC_QUEUE_KEY);
    } catch {
        /* ignore queue errors — لا يؤثر على الحفظ المحلي */
    }
}

export function listPendingCloudSyncOps(): DossierCloudSyncOp[] {
    try {
        const raw = readSecureOrDrainLegacySync(DOSSIER_SYNC_QUEUE_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed)
            ? (parsed as DossierCloudSyncOp[]).filter((o) => o.status === 'pending')
            : [];
    } catch {
        return [];
    }
}

export { shouldRejectDossierWipe, countDossierArray } from './dossierWipeGuard';
