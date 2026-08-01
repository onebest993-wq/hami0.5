/**
 * إصلاح انحراف الفهرس executionFiles عن blobs الإضبارات الحية.
 * يُشغَّل عند تحميل قائمة التنفيذ وبعد مزامنة السحابة.
 */
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    isExecutionParentDossierBlobKey,
    persistExecutionDossierBlob,
    readExecutionDossierBlobScanningScopes,
    syncExecutionFileInIndex,
} from '@/app/utils/executionDossierBlobPersistence';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { isExecutionDossierTombstoned } from '@/app/utils/executionDossierTombstones';
import { executionDossierIdFromStorageKey, executionStorageKey, normalizeExecutionStorageId } from '@/app/utils/executionStorageKeys';
import {
    readScopedDeviceStorageItem,
    scopeExecutionDeviceStorageKey,
    stripExecutionDeviceStorageUserScope,
    isStorageKeyVisibleToCurrentUser,
} from '@/app/utils/executionDeviceStorageScope';

export type ExecutionDossierReconcileResult = {
    indexRowsHealed: number;
    blobsHealed: number;
    skipped: boolean;
};

function listParentDossierIdsInStore(): string[] {
    const ids = new Set<string>();
    const considerKey = (rawKey: string) => {
        const k = String(rawKey || '').trim();
        if (!k || !isStorageKeyVisibleToCurrentUser(k)) return;
        const logical = stripExecutionDeviceStorageUserScope(k);
        if (!isExecutionParentDossierBlobKey(logical)) return;
        const id = executionDossierIdFromStorageKey(k);
        if (id && id !== 'default') ids.add(id);
    };
    try {
        for (const key of SecureStoreService.listKeysSync()) {
            considerKey(key);
        }
    } catch {
        /* ignore */
    }
    try {
        if (typeof globalThis.localStorage !== 'undefined') {
            const ls = globalThis.localStorage;
            for (let i = 0; i < ls.length; i += 1) {
                considerKey(String(ls.key(i) || ''));
            }
        }
    } catch {
        /* ignore */
    }
    return [...ids];
}

function buildIndexById(): Map<string, Record<string, unknown>> {
    const indexById = new Map<string, Record<string, unknown>>();
    const indexRows = loadExecutionFilesRaw().filter(
        (row) => row && typeof row === 'object' && !Array.isArray(row),
    ) as Record<string, unknown>[];
    for (const row of indexRows) {
        const id = normalizeExecutionStorageId(String(row.id ?? ''));
        if (id && id !== 'default') indexById.set(id, row);
    }
    return indexById;
}

function updatedAtMs(record: Record<string, unknown> | null | undefined): number {
    if (!record) return 0;
    const t = Date.parse(String(record.updatedAt || ''));
    return Number.isNaN(t) ? 0 : t;
}

function timelineCount(record: Record<string, unknown> | null | undefined): number {
    if (!record) return 0;
    const tl = record.timelineEvents;
    return Array.isArray(tl) ? tl.length : 0;
}

function indexRowHasSeedablePayload(row: Record<string, unknown>): boolean {
    if (String(row.fileNumber || row.docNumber || row.directorate || '').trim()) return true;
    if (timelineCount(row) > 0) return true;
    if (Array.isArray(row.debtors) && row.debtors.length > 0) return true;
    if (Array.isArray(row.creditors) && row.creditors.length > 0) return true;
    return false;
}

function shouldPreferBlobOverIndex(
    indexRow: Record<string, unknown>,
    blob: Record<string, unknown>,
): boolean {
    const blobTs = updatedAtMs(blob);
    const idxTs = updatedAtMs(indexRow);
    if (blobTs > idxTs) return true;
    if (timelineCount(blob) > timelineCount(indexRow)) return true;
    const blobDir = String(blob.directorate || '').trim();
    const idxDir = String(indexRow.directorate || '').trim();
    if (blobDir && blobDir !== idxDir && blobTs >= idxTs) return true;
    return false;
}

function parseReconcileBlobRaw(raw: string | null | undefined): Record<string, unknown> | null {
    if (!raw?.trim()) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return parsed as Record<string, unknown>;
    } catch {
        return null;
    }
}

async function readExecutionDossierBlobForReconcile(
    dossierId: string,
): Promise<Record<string, unknown> | null> {
    const fromScan = readExecutionDossierBlobScanningScopes(dossierId);
    if (fromScan) return fromScan;
    const id = normalizeExecutionStorageId(dossierId);
    if (!id || id === 'default') return null;
    const key = executionStorageKey(id);
    try {
        const scoped = scopeExecutionDeviceStorageKey(key);
        for (const candidate of scoped !== key ? [scoped, key] : [key]) {
            const raw = await SecureStoreService.getItem(candidate);
            const parsed = parseReconcileBlobRaw(raw);
            if (parsed) return parsed;
        }
    } catch {
        /* ignore */
    }
    try {
        if (typeof globalThis.localStorage !== 'undefined') {
            const raw = readScopedDeviceStorageItem(
                (k) => globalThis.localStorage.getItem(k),
                key,
            );
            return parseReconcileBlobRaw(raw);
        }
    } catch {
        return null;
    }
    return null;
}

function applyBlobReconcile(
    indexById: Map<string, Record<string, unknown>>,
    blobIds: Iterable<string>,
    readBlob: (id: string) => Record<string, unknown> | null,
): number {
    let indexRowsHealed = 0;
    for (const id of blobIds) {
        if (isExecutionDossierTombstoned(id)) continue;
        const blob = readBlob(id);
        if (!blob) continue;
        const indexRow = indexById.get(id);
        if (!indexRow) {
            if (syncExecutionFileInIndex(blob)) indexRowsHealed += 1;
            continue;
        }
        if (shouldPreferBlobOverIndex(indexRow, blob)) {
            if (syncExecutionFileInIndex(blob)) indexRowsHealed += 1;
        }
    }
    return indexRowsHealed;
}

function seedMissingBlobs(
    indexById: Map<string, Record<string, unknown>>,
    blobIds: Set<string>,
): number {
    let blobsHealed = 0;
    for (const [id, row] of indexById) {
        if (blobIds.has(id)) continue;
        if (readExecutionDossierBlobScanningScopes(id)) continue;
        if (!indexRowHasSeedablePayload(row)) continue;
        if (persistExecutionDossierBlob(id, { ...row, id }, { syncIndex: false })) {
            blobsHealed += 1;
        }
    }
    return blobsHealed;
}

/** يزامن الفهرس مع الـ blobs ويُنشئ blobs ناقصة من صفوف الفهرس */
export function reconcileExecutionDossierStorage(): ExecutionDossierReconcileResult {
    const indexById = buildIndexById();
    const blobIds = new Set(listParentDossierIdsInStore());
    const indexRowsHealed = applyBlobReconcile(indexById, blobIds, (id) =>
        readExecutionDossierBlobScanningScopes(id),
    );
    const blobsHealed = seedMissingBlobs(indexById, blobIds);
    return {
        indexRowsHealed,
        blobsHealed,
        skipped: indexRowsHealed === 0 && blobsHealed === 0,
    };
}

/** نسخة async — تقرأ blobs بعد ensurePersistedReady (مشفّرة/IDB) */
export async function reconcileExecutionDossierStorageAsync(): Promise<ExecutionDossierReconcileResult> {
    await SecureStoreService.ensurePersistedReady();
    const indexById = buildIndexById();
    const blobIds = new Set(listParentDossierIdsInStore());

    let indexRowsHealed = 0;
    for (const id of blobIds) {
        if (isExecutionDossierTombstoned(id)) continue;
        const blob = await readExecutionDossierBlobForReconcile(id);
        if (!blob) continue;
        const indexRow = indexById.get(id);
        if (!indexRow) {
            if (syncExecutionFileInIndex(blob)) indexRowsHealed += 1;
            continue;
        }
        if (shouldPreferBlobOverIndex(indexRow, blob)) {
            if (syncExecutionFileInIndex(blob)) indexRowsHealed += 1;
        }
    }

    const blobsHealed = seedMissingBlobs(indexById, blobIds);
    return {
        indexRowsHealed,
        blobsHealed,
        skipped: indexRowsHealed === 0 && blobsHealed === 0,
    };
}

/** مسار E2E/تشخيص — يُعرَّض في DEV فقط */
export function exposeExecutionReconcileForDev(): void {
    if (typeof window === 'undefined' || !import.meta.env.DEV) return;
    const w = window as unknown as {
        __hamiReconcileExecutionStorage?: () => Promise<ExecutionDossierReconcileResult>;
        __hamiLoadExecutionFilesIndex?: () => unknown[];
    };
    w.__hamiReconcileExecutionStorage = reconcileExecutionDossierStorageAsync;
    w.__hamiLoadExecutionFilesIndex = () => loadExecutionFilesRaw();
}
