import SecureStoreService from '@/app/services/SecureStoreService';
import {
    EXECUTION_FILES_STORAGE_KEY,
    EXECUTION_FILES_STORAGE_KEYS_LEGACY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
} from './dossierStorageKeys';
import { readLatestDossierBackup, writeDossierBackup } from './dossierBackupStore';
import { shouldRejectDossierWipe } from './dossierWipeGuard';
import { debug } from '@/app/utils/debug';
import type { DossierCloudSyncOp, DossierDomain } from './dossierPersistenceTypes';
import { DOSSIER_SYNC_QUEUE_KEY } from './dossierPersistenceTypes';

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

function mergeUniqueById(primary: unknown[], incoming: unknown[]): unknown[] {
    const out: unknown[] = [];
    const seen = new Set<string>();
    const add = (v: unknown) => {
        if (!v || typeof v !== 'object' || Array.isArray(v)) return;
        const id = String((v as { id?: unknown }).id ?? '').trim();
        if (!id || seen.has(id)) return;
        seen.add(id);
        out.push(v);
    };
    primary.forEach(add);
    incoming.forEach(add);
    return out;
}

function readRevision(config: DomainConfig): number {
    try {
        const raw = SecureStoreService.getItemSync(config.revisionKey);
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
    } catch {
        /* ignore */
    }
    return next;
}

function readRawSync(key: string): string | null {
    return SecureStoreService.getItemSync(key);
}

async function readRawAsync(key: string): Promise<string | null> {
    return SecureStoreService.getItem(key);
}

function writeRawGuarded(key: string, payload: unknown[]): void {
    const serialized = JSON.stringify(payload);
    const existing = readRawSync(key);
    if (existing && shouldRejectDossierWipe(key, serialized, existing)) {
        debug.warn(`[DossierPersistence] رفض مسح "${key}" — البيانات الحالية محفوظة.`);
        return;
    }
    SecureStoreService.setItemSync(key, serialized);
}

async function writeRawGuardedAsync(key: string, payload: unknown[]): Promise<void> {
    const serialized = JSON.stringify(payload);
    const existing = await readRawAsync(key);
    if (existing && shouldRejectDossierWipe(key, serialized, existing)) {
        debug.warn(`[DossierPersistence] رفض مسح "${key}" — البيانات الحالية محفوظة.`);
        return;
    }
    await SecureStoreService.setItem(key, serialized);
}

async function restoreFromBackupIfNeeded(
    config: DomainConfig,
    loaded: unknown[],
): Promise<unknown[]> {
    if (loaded.length > 0) return loaded;
    const backup = await readLatestDossierBackup(config.domain);
    if (!backup || backup.payload.length === 0) return loaded;
        debug.warn(
            `[DossierPersistence] استعادة ${backup.payload.length} إضبارة من النسخة الاحتياطية (${config.domain})`,
        );
    await persistDossierCollection(config.domain, backup.payload, { skipBackup: true, skipCloudQueue: true });
    return backup.payload;
}

function loadFromAllKeysSync(config: DomainConfig): unknown[] {
    const primary = parseArray(readRawSync(config.primaryKey));
    if (primary !== null && primary.length > 0) return primary;

    let merged: unknown[] = primary ?? [];
    for (const legacyKey of config.legacyKeys) {
        const legacy = parseArray(readRawSync(legacyKey));
        if (legacy !== null && legacy.length > 0) {
            merged = mergeUniqueById(merged, legacy);
        }
    }
    return merged;
}

async function loadFromAllKeysAsync(config: DomainConfig): Promise<unknown[]> {
    const primary = parseArray(await readRawAsync(config.primaryKey));
    if (primary !== null && primary.length > 0) return primary;

    let merged: unknown[] = primary ?? [];
    for (const legacyKey of config.legacyKeys) {
        const legacy = parseArray(await readRawAsync(legacyKey));
        if (legacy !== null && legacy.length > 0) {
            merged = mergeUniqueById(merged, legacy);
        }
    }
    return merged;
}

/** تحميل متزامn — بعد ensurePersistedReady فقط */
export function loadDossierCollectionSync(domain: DossierDomain): unknown[] {
    return loadFromAllKeysSync(DOMAIN_CONFIG[domain]);
}

/** تحميل كامل مع استعادة من النسخة الاحتياطية عند الفراغ غير المتوقع */
export async function loadDossierCollectionAsync(domain: DossierDomain): Promise<unknown[]> {
    await SecureStoreService.ensurePersistedReady();
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
    const payload = Array.isArray(next) ? next : [];
    const config = DOMAIN_CONFIG[domain];

    if (!options?.skipBackup && payload.length > 0) {
        const rev = bumpRevision(config);
        void writeDossierBackup(config.domain, payload, rev);
    }

    await writeRawGuardedAsync(config.primaryKey, payload);
    const serialized = JSON.stringify(payload);
    for (const legacyKey of config.legacyKeys) {
        try {
            const existing = await readRawAsync(legacyKey);
            if (existing && shouldRejectDossierWipe(legacyKey, serialized, existing)) continue;
            await SecureStoreService.setItem(legacyKey, serialized);
        } catch {
            /* ignore legacy mirror errors */
        }
    }

    if (!options?.skipCloudQueue && payload.length > 0) {
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
    const payload = Array.isArray(next) ? next : [];
    const config = DOMAIN_CONFIG[domain];

    if (!options?.skipBackup && payload.length > 0) {
        const rev = bumpRevision(config);
        void writeDossierBackup(config.domain, payload, rev);
    }

    writeRawGuarded(config.primaryKey, payload);
    const serialized = JSON.stringify(payload);
    config.legacyKeys.forEach((legacyKey) => {
        try {
            const existing = readRawSync(legacyKey);
            if (existing && shouldRejectDossierWipe(legacyKey, serialized, existing)) return;
            SecureStoreService.setItemSync(legacyKey, serialized);
        } catch {
            /* ignore */
        }
    });

    if (!options?.skipCloudQueue && payload.length > 0) {
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
        const raw = SecureStoreService.getItemSync(DOSSIER_SYNC_QUEUE_KEY);
        const queue: DossierCloudSyncOp[] = raw ? (JSON.parse(raw) as DossierCloudSyncOp[]) : [];
        if (!Array.isArray(queue)) return;
        queue.push(op);
        const trimmed = queue.slice(-200);
        SecureStoreService.setItemSync(DOSSIER_SYNC_QUEUE_KEY, JSON.stringify(trimmed));
    } catch {
        /* ignore queue errors — لا يؤثر على الحفظ المحلي */
    }
}

export function listPendingCloudSyncOps(): DossierCloudSyncOp[] {
    try {
        const raw = SecureStoreService.getItemSync(DOSSIER_SYNC_QUEUE_KEY);
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
