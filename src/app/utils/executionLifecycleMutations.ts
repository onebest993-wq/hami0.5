import type { ExecutionFile } from '@/app/types/execution';
import {
    persistExecutionDossierBlob,
    readExecutionDossierBlob,
} from '@/app/utils/executionDossierBlobPersistence';
import { stripExecutionArchiveFields } from '@/app/utils/executionTrash';
import { normalizeExecutionStorageId } from '@/app/utils/executionStorageKeys';

/** الإضبارة الأم + الإضابير الموحّدة التابعة لها */
export function collectExecutionCascadeIds(
    files: ExecutionFile[],
    rootId: string | number,
): string[] {
    const root = normalizeExecutionStorageId(String(rootId));
    if (!root || root === 'default') return [];

    const ids = new Set<string>([root]);
    for (const file of files) {
        const id = normalizeExecutionStorageId(String(file.id ?? ''));
        const parentId = normalizeExecutionStorageId(
            String((file as { parentId?: unknown }).parentId ?? ''),
        );
        if (id && parentId === root) ids.add(id);
    }
    return [...ids];
}

export function applyExecutionTrashLifecyclePatch(
    dossierId: string | number,
    deletedAt: string = new Date().toISOString(),
): void {
    const id = normalizeExecutionStorageId(String(dossierId));
    if (!id || id === 'default') return;

    const existing = readExecutionDossierBlob(id) ?? { id };
    const next = stripExecutionArchiveFields({
        ...existing,
        id,
        executionTrashDeletedAt: deletedAt,
        updatedAt: deletedAt,
    });
    persistExecutionDossierBlob(id, next);
}

/** يمنع reload/reconcile من إلغاء حذف ناعم/أرشفة حديثة في الذاكرة */
export function mergeExecutionFilesPreservingLifecycle(
    inMemory: ExecutionFile[],
    fromStorage: ExecutionFile[],
): ExecutionFile[] {
    const memoryById = new Map(
        inMemory
            .filter((f) => String(f.id ?? '').trim())
            .map((f) => [String(f.id), f] as const),
    );
    const merged: ExecutionFile[] = [];
    const seen = new Set<string>();

    for (const stored of fromStorage) {
        const id = String(stored.id ?? '').trim();
        if (!id) continue;
        seen.add(id);
        const mem = memoryById.get(id);
        merged.push(mem ? mergeExecutionFileLifecycle(mem, stored) : stored);
    }

    for (const mem of inMemory) {
        const id = String(mem.id ?? '').trim();
        if (!id || seen.has(id)) continue;
        merged.push(mem);
    }

    return merged;
}

function mergeExecutionFileLifecycle(a: ExecutionFile, b: ExecutionFile): ExecutionFile {
    const trashAt = a.executionTrashDeletedAt || b.executionTrashDeletedAt;
    if (trashAt) {
        return stripExecutionArchiveFields({
            ...b,
            ...a,
            executionTrashDeletedAt: trashAt,
        }) as ExecutionFile;
    }

    const archivedAt = a.executionArchivedAt || b.executionArchivedAt;
    if (archivedAt) {
        return { ...b, ...a, executionArchivedAt: archivedAt };
    }

    return { ...b, ...a };
}
