import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import {
    applyLawsuitIndexStatusChange,
    buildLawsuitLifecycleIndex,
    buildLawsuitIndexEntryFromFile,
    emptyLawsuitLifecycleIndex,
    rebuildActiveSegmentInIndex,
    removeLawsuitFromIndex,
    upsertLawsuitIndexEntry,
    type LawsuitLifecycleCounts,
    type LawsuitLifecycleIndex,
} from './lawsuitLifecycleIndex';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_TRASH_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import {
    loadLawsuitBootState,
    loadLawsuitFullSegmentsFromStorage,
    migrateLawsuitMonolithicToSegmentsIfNeeded,
    persistLawsuitActiveSegment,
    persistLawsuitArchivedSegment,
    persistLawsuitLifecycleIndex,
    persistLawsuitTrashSegment,
    readLawsuitArchivedSegment,
    readLawsuitTrashSegment,
    removeLawsuitSegmentRecords,
    segmentsAlreadyPresent,
    syncLawsuitMonolithicMirror,
} from './lawsuitSegmentStorage';

const STALE_MOCK_CASE_NO = '2025/ب/522';

export type LawsuitFileSegments = {
    active: FileData[];
    archived: FileData[] | null;
    trash: FileData[] | null;
    index: LawsuitLifecycleIndex;
};

export function emptyLawsuitFileSegments(): LawsuitFileSegments {
    return { active: [], archived: null, trash: null, index: emptyLawsuitLifecycleIndex() };
}

/** إزالة mock قديم من الجلسات السابقة */
export function stripStaleMockLawsuitFile(files: FileData[]): FileData[] {
    if (files.length === 1 && files[0]?.id === 1 && files[0]?.caseNo === STALE_MOCK_CASE_NO) {
        return [];
    }
    return files;
}

export function loadInitialLawsuitFiles(): FileData[] {
    const boot = loadLawsuitBootState();
    const stripped = stripStaleMockLawsuitFile(boot.active);
    if (stripped.length !== boot.active.length) {
        const index = buildLawsuitLifecycleIndex(stripped, [], []);
        persistLawsuitActiveSegment(stripped);
        persistLawsuitLifecycleIndex(index);
        syncLawsuitMonolithicMirror(stripped, [], []);
    }
    return stripped;
}

/** تحميل غير متزامن بعد جاهزية IndexedDB — يستعيد من النسخة الاحتياطية عند الحاجة */
export async function loadInitialLawsuitFilesAsync(): Promise<FileData[]> {
    if (segmentsAlreadyPresent()) {
        return loadInitialLawsuitFiles();
    }

    const { loadDossierCollectionAsync } = await import(
        '@/app/services/dossierPersistence/dossierPersistenceService'
    );
    const asyncLoaded = (await loadDossierCollectionAsync('lawsuit')) as FileData[];
    const syncLoaded = loadLawsuitFilesRaw() as FileData[];
    const primary =
        asyncLoaded.length > 0
            ? asyncLoaded
            : syncLoaded.length > 0
              ? syncLoaded
              : asyncLoaded;
    if (primary.length > 0 && !segmentsAlreadyPresent()) {
        const { active, archived, trash } = splitFilesByLifecycle(primary);
        const index = buildLawsuitLifecycleIndex(active, archived, trash);
        persistLawsuitActiveSegment(active);
        persistLawsuitArchivedSegment(archived);
        persistLawsuitTrashSegment(trash);
        persistLawsuitLifecycleIndex(index);
        syncLawsuitMonolithicMirror(active, archived, trash);
    }
    const stripped = stripStaleMockLawsuitFile(loadInitialLawsuitFiles());
    return stripped;
}

export function loadLawsuitBootSegments(): LawsuitFileSegments {
    const boot = loadLawsuitBootState();
    return {
        active: stripStaleMockLawsuitFile(boot.active),
        archived: boot.archived,
        trash: boot.trash,
        index: boot.index,
    };
}

export function loadLawsuitArchivedSegmentFiles(): FileData[] {
    migrateLawsuitMonolithicToSegmentsIfNeeded();
    return readLawsuitArchivedSegment();
}

export function loadLawsuitTrashSegmentFiles(): FileData[] {
    migrateLawsuitMonolithicToSegmentsIfNeeded();
    return readLawsuitTrashSegment();
}

export function reloadLawsuitFilesFromStorage(): LawsuitFileSegments {
    const full = loadLawsuitFullSegmentsFromStorage();
    return {
        active: stripStaleMockLawsuitFile(full.active),
        archived: full.archived,
        trash: full.trash,
        index: full.index,
    };
}

function splitFilesByLifecycle(files: FileData[]): {
    active: FileData[];
    archived: FileData[];
    trash: FileData[];
} {
    const active: FileData[] = [];
    const archived: FileData[] = [];
    const trash: FileData[] = [];
    for (const file of files) {
        if (file.status === 'deleted') trash.push(file);
        else if (file.status === 'archived') archived.push(file);
        else active.push(file);
    }
    return { active, archived, trash };
}

function persistAllSegments(segments: LawsuitFileSegments): void {
    persistLawsuitActiveSegment(segments.active);
    if (segments.archived !== null) persistLawsuitArchivedSegment(segments.archived);
    if (segments.trash !== null) persistLawsuitTrashSegment(segments.trash);
    persistLawsuitLifecycleIndex(segments.index);
    syncLawsuitMonolithicMirror(
        segments.active,
        segments.archived ?? [],
        segments.trash ?? [],
    );
}

/** حفظ موحّد — النشطة فقط (توافق المسارات القديمة) */
export function persistLawsuitFiles(next: FileData[]): FileData[] {
    const payload = Array.isArray(next) ? next : [];
    const boot = loadLawsuitBootSegments();
    const nextIndex = rebuildActiveSegmentInIndex(boot.index, payload);
    persistLawsuitActiveSegment(payload);
    persistLawsuitLifecycleIndex(nextIndex);
    syncLawsuitMonolithicMirror(payload, boot.archived ?? [], boot.trash ?? []);
    return payload;
}

export function persistLawsuitSegments(segments: LawsuitFileSegments): LawsuitFileSegments {
    persistAllSegments(segments);
    return segments;
}

export function persistLawsuitActiveRecord(record: FileData, segments: LawsuitFileSegments): LawsuitFileSegments {
    const idStr = String(record.id);
    const nextActive = segments.active.some((f) => String(f.id) === idStr)
        ? segments.active.map((f) => (String(f.id) === idStr ? record : f))
        : [record, ...segments.active];
    const nextIndex = upsertLawsuitIndexEntry(segments.index, record);
    const next: LawsuitFileSegments = { ...segments, active: nextActive, index: nextIndex };
    persistLawsuitActiveSegment(nextActive);
    persistLawsuitLifecycleIndex(nextIndex);
    syncLawsuitMonolithicMirror(nextActive, segments.archived ?? [], segments.trash ?? []);
    return next;
}

export function applyLawsuitTrash(files: FileData[], fileId: string | number): FileData[] {
    const idStr = String(fileId);
    return files.map((f) =>
        String(f.id) === idStr ? { ...f, status: 'deleted' as const, deletedAt: Date.now() } : f,
    );
}

export function applyLawsuitTrashSegments(
    segments: LawsuitFileSegments,
    fileId: string | number,
): LawsuitFileSegments {
    const idStr = String(fileId);
    const file = segments.active.find((f) => String(f.id) === idStr);
    if (!file) return segments;
    const trashed = { ...file, status: 'deleted' as const, deletedAt: Date.now() };
    const nextActive = segments.active.filter((f) => String(f.id) !== idStr);
    const nextTrash = [...(segments.trash ?? []), trashed];
    const nextIndex = applyLawsuitIndexStatusChange(
        segments.index,
        idStr,
        'active',
        'deleted',
        buildLawsuitIndexEntryFromFile(trashed),
    );
    const next: LawsuitFileSegments = {
        active: nextActive,
        archived: segments.archived,
        trash: nextTrash,
        index: nextIndex,
    };
    persistLawsuitActiveSegment(nextActive);
    persistLawsuitTrashSegment(nextTrash);
    persistLawsuitLifecycleIndex(nextIndex);
    syncLawsuitMonolithicMirror(nextActive, segments.archived ?? [], nextTrash);
    return next;
}

export function applyLawsuitRestoreFromTrash(files: FileData[], fileId: string | number): FileData[] {
    const idStr = String(fileId);
    return files.map((f) =>
        String(f.id) === idStr ? { ...f, status: 'active' as const, deletedAt: undefined } : f,
    );
}

export function applyLawsuitRestoreFromTrashSegments(
    segments: LawsuitFileSegments,
    fileId: string | number,
): LawsuitFileSegments {
    const idStr = String(fileId);
    const trash = segments.trash ?? [];
    const file = trash.find((f) => String(f.id) === idStr);
    if (!file) return segments;
    const restored = { ...file, status: 'active' as const, deletedAt: undefined };
    const nextTrash = trash.filter((f) => String(f.id) !== idStr);
    const nextActive = [restored, ...segments.active];
    const nextIndex = applyLawsuitIndexStatusChange(
        segments.index,
        idStr,
        'deleted',
        'active',
        buildLawsuitIndexEntryFromFile(restored),
    );
    const next: LawsuitFileSegments = {
        active: nextActive,
        archived: segments.archived,
        trash: nextTrash,
        index: nextIndex,
    };
    persistLawsuitActiveSegment(nextActive);
    persistLawsuitTrashSegment(nextTrash);
    persistLawsuitLifecycleIndex(nextIndex);
    syncLawsuitMonolithicMirror(nextActive, segments.archived ?? [], nextTrash);
    return next;
}

export function applyLawsuitArchive(files: FileData[], fileId: string | number): FileData[] {
    const idStr = String(fileId);
    return files.map((f) => (String(f.id) === idStr ? { ...f, status: 'archived' as const } : f));
}

export function applyLawsuitArchiveSegments(
    segments: LawsuitFileSegments,
    fileId: string | number,
): LawsuitFileSegments {
    const idStr = String(fileId);
    const file = segments.active.find((f) => String(f.id) === idStr);
    if (!file) return segments;
    const archived = { ...file, status: 'archived' as const };
    const nextActive = segments.active.filter((f) => String(f.id) !== idStr);
    const nextArchived = [...(segments.archived ?? []), archived];
    const nextIndex = applyLawsuitIndexStatusChange(
        segments.index,
        idStr,
        'active',
        'archived',
        buildLawsuitIndexEntryFromFile(archived),
    );
    const next: LawsuitFileSegments = {
        active: nextActive,
        archived: nextArchived,
        trash: segments.trash,
        index: nextIndex,
    };
    persistLawsuitActiveSegment(nextActive);
    persistLawsuitArchivedSegment(nextArchived);
    persistLawsuitLifecycleIndex(nextIndex);
    syncLawsuitMonolithicMirror(nextActive, nextArchived, segments.trash ?? []);
    return next;
}

export function applyLawsuitRestoreFromArchive(files: FileData[], fileId: string | number): FileData[] {
    const idStr = String(fileId);
    return files.map((f) => (String(f.id) === idStr ? { ...f, status: 'active' as const } : f));
}

export function applyLawsuitRestoreFromArchiveSegments(
    segments: LawsuitFileSegments,
    fileId: string | number,
): LawsuitFileSegments {
    const idStr = String(fileId);
    const archived = segments.archived ?? [];
    const file = archived.find((f) => String(f.id) === idStr);
    if (!file) return segments;
    const restored = { ...file, status: 'active' as const };
    const nextArchived = archived.filter((f) => String(f.id) !== idStr);
    const nextActive = [restored, ...segments.active];
    const nextIndex = applyLawsuitIndexStatusChange(
        segments.index,
        idStr,
        'archived',
        'active',
        buildLawsuitIndexEntryFromFile(restored),
    );
    const next: LawsuitFileSegments = {
        active: nextActive,
        archived: nextArchived,
        trash: segments.trash,
        index: nextIndex,
    };
    persistLawsuitActiveSegment(nextActive);
    persistLawsuitArchivedSegment(nextArchived);
    persistLawsuitLifecycleIndex(nextIndex);
    syncLawsuitMonolithicMirror(nextActive, nextArchived, segments.trash ?? []);
    return next;
}

export function applyLawsuitPermanentDelete(
    files: FileData[],
    ids: Array<string | number>,
): FileData[] {
    const idSet = new Set(ids.map(String));
    return files.filter((f) => !idSet.has(String(f.id)));
}

export function applyLawsuitPermanentDeleteSegments(
    segments: LawsuitFileSegments,
    ids: Array<string | number>,
): LawsuitFileSegments {
    const trash = segments.trash ?? [];
    const nextTrash = removeLawsuitSegmentRecords(LAWSUIT_FILES_TRASH_KEY, ids, trash);
    let nextIndex = segments.index;
    for (const id of ids) {
        nextIndex = removeLawsuitFromIndex(nextIndex, id);
    }
    const next: LawsuitFileSegments = {
        active: segments.active,
        archived: segments.archived,
        trash: nextTrash,
        index: nextIndex,
    };
    persistLawsuitTrashSegment(nextTrash);
    persistLawsuitLifecycleIndex(nextIndex);
    syncLawsuitMonolithicMirror(segments.active, segments.archived ?? [], nextTrash);
    return next;
}

export function applyLawsuitSoftDelete(file: FileData): FileData {
    return { ...file, status: 'deleted', deletedAt: Date.now() };
}

export function applyLawsuitHardDeleteFilter(files: FileData[], fileId: string | number): FileData[] {
    return files.filter((f) => f.id !== fileId);
}

export function applyLawsuitHardDeleteSegments(
    segments: LawsuitFileSegments,
    fileId: string | number,
): LawsuitFileSegments {
    const trash = segments.trash ?? [];
    const nextTrash = removeLawsuitSegmentRecords(LAWSUIT_FILES_TRASH_KEY, [fileId], trash);
    const nextIndex = removeLawsuitFromIndex(segments.index, fileId);
    const next: LawsuitFileSegments = {
        active: segments.active,
        archived: segments.archived,
        trash: nextTrash,
        index: nextIndex,
    };
    persistLawsuitTrashSegment(nextTrash);
    persistLawsuitLifecycleIndex(nextIndex);
    syncLawsuitMonolithicMirror(segments.active, segments.archived ?? [], nextTrash);
    return next;
}

export function findLawsuitFile(files: FileData[], fileId: string | number): FileData | undefined {
    const idStr = String(fileId);
    return files.find((f) => String(f.id) === idStr);
}

export function findLawsuitFileInSegments(
    segments: LawsuitFileSegments,
    fileId: string | number,
): FileData | undefined {
    const idStr = String(fileId);
    const hit =
        segments.active.find((f) => String(f.id) === idStr) ??
        (segments.archived ?? []).find((f) => String(f.id) === idStr) ??
        (segments.trash ?? []).find((f) => String(f.id) === idStr);
    return hit;
}

export function getLawsuitLifecycleCounts(index: LawsuitLifecycleIndex): LawsuitLifecycleCounts {
    return index.counts;
}
