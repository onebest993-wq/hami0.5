/**
 * Shared cloud sync engine — single auth/network path for all buckets.
 */
import { SupabaseService } from '@/app/services/SupabaseService';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { debug } from '@/app/utils/debug';
import SecureStoreService from '@/app/services/SecureStoreService';
import { isLocalOnlyModeEnabled } from '@/app/services/settings/localOnlyGuard';
import { isLawyerWorkCloudLive } from '@/app/services/settings/lawyerWorkCloudGate';
import { isLiveCloudSyncBucketEnabled } from '@/app/services/settings/cloudSyncBucket';
import { EXECUTION_FILES_STORAGE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { isCloudPollingPausedByRealtime } from '@/app/services/realtimeSyncGate';
import { filterTombstonedExecutionSyncRows } from '@/app/services/executionCloudSyncFilter';
import { filterTombstonedLawsuitSyncRows, ensureLawsuitDossierTombstonesReadable } from '@/app/utils/lawsuitDossierTombstones';
import { ensureExecutionDossierTombstonesReadable } from '@/app/utils/executionDossierTombstones';
import {
    ensureNotesDeletedIdsReadable,
    filterTombstonedNotesSyncRows,
} from '@/app/services/notes/globalNotesTombstones';

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
    if (typeof v === 'number' && Number.isFinite(v)) return v;
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
            if (cloudItem.decryptIncomplete === true && localItem.decryptIncomplete !== true) {
                map.set(id, localItem);
                conflictsResolved++;
                return;
            }
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

function localRowsNeedingUpload(localRows: SyncItem[], cloudRows: SyncItem[]): SyncItem[] {
    const cloudById = new Map<string, SyncItem>();
    for (const row of cloudRows) {
        const id = idOf(row);
        if (id) cloudById.set(id, row);
    }
    return localRows.filter((local) => {
        const id = idOf(local);
        if (!id) return false;
        const cloud = cloudById.get(id);
        return (
            !cloud ||
            (cloud.decryptIncomplete === true && local.decryptIncomplete !== true) ||
            updatedAtMsOf(local) > updatedAtMsOf(cloud)
        );
    });
}

async function uploadRowsWithBoundedConcurrency(
    bucket: Exclude<CloudSyncBucket, 'unsupported'>,
    rows: SyncItem[],
): Promise<void> {
    const queue = [...rows];
    const worker = async () => {
        while (queue.length > 0) {
            const row = queue.shift();
            if (!row) return;
            if (bucket === 'execution') {
                await SupabaseService.saveExecutionFile(
                    row as Parameters<typeof SupabaseService.saveExecutionFile>[0],
                );
            } else if (bucket === 'lawsuit') {
                await SupabaseService.saveLawsuitFile(
                    row as Parameters<typeof SupabaseService.saveLawsuitFile>[0],
                );
            } else {
                const id = idOf(row);
                if (!id) continue;
                const note = { ...row };
                delete note.id;
                delete note.createdAt;
                delete note.updatedAt;
                await SupabaseService.saveGlobalNote(
                    note as Parameters<typeof SupabaseService.saveGlobalNote>[0],
                    { id },
                );
            }
        }
    };
    await Promise.all(
        Array.from({ length: Math.min(3, queue.length) }, () => worker()),
    );
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

/** سلة المحرّك حيّة: الدعاوى تتبع `syncFiles` كما في لوحة المزامنة */
function isLiveEngineBucketEnabled(bucket: CloudSyncBucket): boolean {
    if (bucket === 'execution') return isLiveCloudSyncBucketEnabled('execution');
    if (bucket === 'notes') return isLiveCloudSyncBucketEnabled('notes');
    if (bucket === 'lawsuit') return isLiveCloudSyncBucketEnabled('files');
    return false;
}

let cloudSyncDisabledLogged = false;

type CloudSyncRunOptions = {
    /** Explicit user/realtime-triggered reconciliation, not periodic polling. */
    allowWhenRealtimeActive?: boolean;
};

export async function canRunCloudSync(options: CloudSyncRunOptions = {}): Promise<boolean> {
    if (!options.allowWhenRealtimeActive && isCloudPollingPausedByRealtime()) return false;
    if (isLocalOnlyModeEnabled()) return false;
    if (import.meta.env.VITE_ENABLE_CLOUD_SYNC !== 'true') {
        if (import.meta.env.DEV && !cloudSyncDisabledLogged) {
            cloudSyncDisabledLogged = true;
            debug.log('[CloudSync] مزامنة السحابة غير مفعلة في هذا الإصدار');
        }
        return false;
    }
    if (!isLawyerWorkCloudLive()) return false;
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
    options: CloudSyncRunOptions = {},
): Promise<Map<string, PerformCloudSyncResult>> {
    const results = new Map<string, PerformCloudSyncResult>();
    if (!(await canRunCloudSync(options))) {
        for (const key of localKeys) {
            results.set(key, { ok: true, skipped: true });
        }
        return results;
    }

    await SecureStoreService.ensurePersistedReady();

    for (const localKey of localKeys) {
        results.set(localKey, await performCloudSyncBucketInternal(localKey));
    }
    const savedAny = [...results.values()].some((r) => r.ok && !r.skipped);
    if (savedAny) {
        const { scheduleWorkCloudCheckpoint } = await import('@/app/services/cloud/workCloudCheckpoint');
        scheduleWorkCloudCheckpoint();
    }
    return results;
}

async function performCloudSyncBucketInternal(localKey: string): Promise<PerformCloudSyncResult> {
    try {
        const bucket = resolveSyncBucket(localKey);
        if (!isLiveEngineBucketEnabled(bucket)) {
            return { ok: true, skipped: true };
        }
        debug.log(`[CloudSync] بدء المزامنة لـ ${localKey}...`);

        let cloudDataRaw: unknown = [];
        let localDataRaw: unknown = [];

        if (bucket === 'execution') {
            if (!(await ensureExecutionDossierTombstonesReadable())) {
                debug.warn('[CloudSync] تخطي دمج التنفيذ — شواهد الحذف لم تُفكّ');
                return { ok: true, skipped: true };
            }
            // الدمج «الأحدث يفوز» لا يعرف الحذف: بلا هذا الترشيح تعود كل إضبارة
            // حُذفت نهائياً عند أول مزامنة، لأن نسخة السحابة تبقى موجودة.
            cloudDataRaw = filterTombstonedExecutionSyncRows(await SupabaseService.getExecutionFiles());
            localDataRaw = filterTombstonedExecutionSyncRows(
                (await persistenceRepository.loadAsync(localKey)) ?? [],
            );
        } else if (bucket === 'lawsuit') {
            if (!(await ensureLawsuitDossierTombstonesReadable())) {
                debug.warn('[CloudSync] تخطي دمج الدعاوى — شواهد الحذف لم تُفكّ');
                return { ok: true, skipped: true };
            }
            cloudDataRaw = filterTombstonedLawsuitSyncRows(await SupabaseService.getLawsuitFiles());
            const fromRepo = (await persistenceRepository.loadAsync(localKey)) ?? [];
            let fromSegments: unknown[] = [];
            try {
                const { collectLawsuitLocalRowsForSync } = await import(
                    '@/app/domain/lawsuit/lawsuitSegmentStorage'
                );
                fromSegments = collectLawsuitLocalRowsForSync();
            } catch {
                fromSegments = [];
            }
            localDataRaw = filterTombstonedLawsuitSyncRows(
                mergeWithConflictResolution(fromRepo, fromSegments).merged,
            );
        } else if (bucket === 'notes') {
            if (!(await ensureNotesDeletedIdsReadable())) {
                debug.warn('[CloudSync] تخطي دمج الملاحظات — شواهد الحذف لم تُفكّ');
                return { ok: true, skipped: true };
            }
            // الدمج «الأحدث يفوز» لا يعرف الحذف — بلا الترشيح تعود الملاحظة المحذوفة من السحابة.
            cloudDataRaw = filterTombstonedNotesSyncRows(await SupabaseService.getGlobalNotes());
            localDataRaw = filterTombstonedNotesSyncRows(
                (await persistenceRepository.loadAsync(localKey)) ?? [],
            );
        } else {
            debug.warn(`[CloudSync] نوع غير مدعوم: ${localKey}`);
            return { ok: true, skipped: true };
        }

        const { merged } = mergeWithConflictResolution(cloudDataRaw, localDataRaw);
        const mergedItems = normalizeArray(merged);
        const localItems = normalizeArray(localDataRaw);
        const cloudItems = normalizeArray(cloudDataRaw);
        const localUploads = localRowsNeedingUpload(localItems, cloudItems);

        if (mergedItems.length === 0 && localItems.length === 0 && cloudItems.length === 0) {
            debug.log(`[CloudSync] تخطي الحفظ — لا بيانات في ${localKey}`);
        } else {
            persistenceRepository.save(localKey, merged);
            if (bucket === 'execution') {
                persistenceRepository.flushPending(localKey);
                const { saveExecutionFilesRawImmediate } = await import(
                    '@/app/utils/executionFilesStorage'
                );
                saveExecutionFilesRawImmediate(mergedItems);
                persistenceRepository.synchronizeExternalWrite(
                    localKey,
                    JSON.stringify(mergedItems),
                );
                const { reconcileExecutionDossierStorageAsync } = await import(
                    '@/app/utils/executionDossierStorageReconcile'
                );
                await reconcileExecutionDossierStorageAsync();
            } else if (bucket === 'lawsuit') {
                /*
                 * لا تمرّر دمجاً فارغاً إلى المقاطع إن وُجدت بيانات محلية في المرآة
                 * أو المقاطع — الحارس داخل apply يرفض أيضاً؛ هذا يمنع ضوضاء/مسارات قديمة.
                 */
                if (mergedItems.length === 0 && localItems.length === 0) {
                    /* لا شيء للكتابة */
                } else {
                    const { applyLawsuitMonolithicMergeToSegments } = await import(
                        '@/app/domain/lawsuit/lawsuitSegmentStorage'
                    );
                    applyLawsuitMonolithicMergeToSegments(mergedItems as never[]);
                    const { awaitLawsuitWorkspaceCommit } = await import(
                        '@/app/domain/lawsuit/lawsuitPersistFlush'
                    );
                    await awaitLawsuitWorkspaceCommit({ timeoutMs: 8_000 });
                }
            }
        }
        if (localUploads.length > 0) {
            await uploadRowsWithBoundedConcurrency(bucket, localUploads);
        }

        debug.log(`[CloudSync] ✅ ${localKey}:`, {
            cloudItems: cloudItems.length,
            localItems: localItems.length,
            mergedItems: mergedItems.length,
            uploadedItems: localUploads.length,
        });
        const { scheduleWorkCloudCheckpoint } = await import('@/app/services/cloud/workCloudCheckpoint');
        scheduleWorkCloudCheckpoint();
        return { ok: true };
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        debug.error('[CloudSync] فشلت المزامنة:', err);
        return { ok: false, error: err };
    }
}

export async function performCloudSyncBucket(
    localKey: string,
    options: CloudSyncRunOptions = {},
): Promise<PerformCloudSyncResult> {
    if (!isLiveEngineBucketEnabled(resolveSyncBucket(localKey))) {
        return { ok: true, skipped: true };
    }
    if (!(await canRunCloudSync(options))) {
        return { ok: true, skipped: true };
    }
    await SecureStoreService.ensurePersistedReady();
    return performCloudSyncBucketInternal(localKey);
}
