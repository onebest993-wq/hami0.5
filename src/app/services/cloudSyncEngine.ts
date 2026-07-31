/**
 * Shared cloud sync engine — single auth/network path for all buckets.
 */
import { SupabaseService } from '@/app/services/SupabaseService';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { debug } from '@/app/utils/debug';
import SecureStoreService from '@/app/services/SecureStoreService';
import { isLocalOnlyModeEnabled } from '@/app/services/settings/localOnlyGuard';
import { EXECUTION_FILES_STORAGE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { isCloudPollingPausedByRealtime } from '@/app/services/realtimeSyncGate';
import { filterTombstonedExecutionSyncRows } from '@/app/services/executionCloudSyncFilter';

export type CloudSyncBucket = 'execution' | 'lawsuit' | 'notes' | 'unsupported';

export type PerformCloudSyncResult = {
    ok: boolean;
    skipped?: boolean;
    error?: Error;
};

type SyncItem = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

function idOf(item: unknown): string | null {
    if (!isRecord(item)) return null;
    const id = item.id;
    if (typeof id === 'string') return id;
    if (typeof id === 'number' && Number.isFinite(id)) return String(id);
    return null;
}

function updatedAtMsOf(item: unknown): number {
    if (!isRecord(item)) return 0;
    const v = item.updatedAt;
    if (typeof v !== 'string') return 0;
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
}

function normalizeArray(input: unknown): SyncItem[] {
    if (!Array.isArray(input)) return [];
    return input.filter((x): x is SyncItem => isRecord(x) && idOf(x) !== null);
}

function mergeWithConflictResolution(
    cloudDataRaw: unknown,
    localDataRaw: unknown,
): { merged: SyncItem[]; conflictsResolved: number } {
    const cloudData = normalizeArray(cloudDataRaw);
    const localData = normalizeArray(localDataRaw);
    const map = new Map<string, SyncItem>();
    let conflictsResolved = 0;

    cloudData.forEach((item) => {
        const id = idOf(item);
        if (!id) return;
        map.set(id, item);
    });

    localData.forEach((localItem) => {
        const id = idOf(localItem);
        if (!id) return;
        const cloudItem = map.get(id);
        if (!cloudItem) {
            map.set(id, localItem);
        } else {
            const localTime = updatedAtMsOf(localItem);
            const cloudTime = updatedAtMsOf(cloudItem);
            if (localTime > cloudTime) {
                map.set(id, localItem);
                conflictsResolved++;
            }
        }
    });

    return { merged: Array.from(map.values()), conflictsResolved };
}

function checkOnlineStatus(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function resolveSyncBucket(localKey: string): CloudSyncBucket {
    const key = localKey.trim();
    const executionKeys = new Set([
        EXECUTION_FILES_STORAGE_KEY,
        'lawyer_execution_files',
        'hami-execution-files',
        'execution_files',
    ]);
    if (executionKeys.has(key)) return 'execution';
    if (key === STORAGE_KEYS.LAWYER_FILES || key.includes('lawyer_files')) return 'lawsuit';
    if (key.includes('lawsuit')) return 'lawsuit';
    if (key.includes('notes')) return 'notes';
    if (key.includes('execution')) return 'execution';
    return 'unsupported';
}

let cloudSyncDisabledLogged = false;

export async function canRunCloudSync(): Promise<boolean> {
    if (isCloudPollingPausedByRealtime()) return false;
    if (isLocalOnlyModeEnabled()) return false;
    if (import.meta.env.VITE_ENABLE_CLOUD_SYNC !== 'true') {
        if (import.meta.env.DEV && !cloudSyncDisabledLogged) {
            cloudSyncDisabledLogged = true;
            debug.log('[CloudSync] مزامنة السحابة غير مفعلة في هذا الإصدار');
        }
        return false;
    }
    if (!checkOnlineStatus()) return false;
    try {
        const authTimeoutMs = 8_000;
        return await Promise.race([
            SupabaseService.checkUserAuth(),
            new Promise<boolean>((_, reject) => {
                setTimeout(() => reject(new Error('auth timeout')), authTimeoutMs);
            }),
        ]);
    } catch {
        return false;
    }
}

/** دورة متعددة buckets — فحص auth/شبكة مرة واحدة */
export async function performCloudSyncBuckets(
    localKeys: string[],
): Promise<Map<string, PerformCloudSyncResult>> {
    const results = new Map<string, PerformCloudSyncResult>();
    if (!(await canRunCloudSync())) {
        for (const key of localKeys) {
            results.set(key, { ok: true, skipped: true });
        }
        return results;
    }

    await SecureStoreService.ensurePersistedReady();

    for (const localKey of localKeys) {
        results.set(localKey, await performCloudSyncBucketInternal(localKey));
    }
    return results;
}

async function performCloudSyncBucketInternal(localKey: string): Promise<PerformCloudSyncResult> {
    try {
        debug.log(`[CloudSync] بدء المزامنة لـ ${localKey}...`);

        let cloudDataRaw: unknown = [];
        let localDataRaw: unknown = [];
        const bucket = resolveSyncBucket(localKey);

        if (bucket === 'execution') {
            // الدمج «الأحدث يفوز» لا يعرف الحذف: بلا هذا الترشيح تعود كل إضبارة
            // حُذفت نهائياً عند أول مزامنة، لأن نسخة السحابة تبقى موجودة.
            cloudDataRaw = filterTombstonedExecutionSyncRows(await SupabaseService.getExecutionFiles());
            localDataRaw = filterTombstonedExecutionSyncRows(
                (await persistenceRepository.loadAsync(localKey)) ?? [],
            );
        } else if (bucket === 'lawsuit') {
            cloudDataRaw = await SupabaseService.getLawsuitFiles();
            localDataRaw = (await persistenceRepository.loadAsync(localKey)) ?? [];
        } else if (bucket === 'notes') {
            cloudDataRaw = await SupabaseService.getGlobalNotes();
            localDataRaw = (await persistenceRepository.loadAsync(localKey)) ?? [];
        } else {
            debug.warn(`[CloudSync] نوع غير مدعوم: ${localKey}`);
            return { ok: true, skipped: true };
        }

        const { merged } = mergeWithConflictResolution(cloudDataRaw, localDataRaw);
        const mergedItems = normalizeArray(merged);
        const localItems = normalizeArray(localDataRaw);
        const cloudItems = normalizeArray(cloudDataRaw);

        if (mergedItems.length === 0 && localItems.length === 0 && cloudItems.length === 0) {
            debug.log(`[CloudSync] تخطي الحفظ — لا بيانات في ${localKey}`);
        } else {
            persistenceRepository.save(localKey, merged);
            if (bucket === 'execution') {
                const { reconcileExecutionDossierStorageAsync } = await import(
                    '@/app/utils/executionDossierStorageReconcile'
                );
                await reconcileExecutionDossierStorageAsync();
            }
        }

        debug.log(`[CloudSync] ✅ ${localKey}:`, {
            cloudItems: cloudItems.length,
            localItems: localItems.length,
            mergedItems: mergedItems.length,
        });
        return { ok: true };
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        debug.error('[CloudSync] فشلت المزامنة:', err);
        return { ok: false, error: err };
    }
}

export async function performCloudSyncBucket(localKey: string): Promise<PerformCloudSyncResult> {
    if (!(await canRunCloudSync())) {
        return { ok: true, skipped: true };
    }
    await SecureStoreService.ensurePersistedReady();
    return performCloudSyncBucketInternal(localKey);
}
