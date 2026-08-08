import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';
import { loadLawsuitFilesRaw, saveLawsuitFilesRawImmediate } from '@/app/utils/lawsuitFilesStorage';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_TRASH_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import {
    buildLawsuitLifecycleIndex,
    emptyLawsuitLifecycleIndex,
    type LawsuitLifecycleIndex,
} from './lawsuitLifecycleIndex';
import { isLawsuitArchived, isLawsuitInTrash } from '@/app/utils/lawsuitTrash';

function readJsonArray(key: string): unknown[] | null {
    try {
        const raw = SecureStoreService.getItemSync(key);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function writeJsonArray(key: string, payload: unknown[]): void {
    const serialized = JSON.stringify(payload);
    SecureStoreService.setItemSync(key, serialized);
    try {
        persistenceRepository.save(key, payload);
        persistenceRepository.flushPending(key);
    } catch {
        /* tests may mock persistence */
    }
}

export function readLawsuitActiveSegment(): FileData[] {
    const fromKey = readJsonArray(LAWSUIT_FILES_ACTIVE_KEY);
    if (fromKey !== null) return fromKey as FileData[];
    return [];
}

export function readLawsuitArchivedSegment(): FileData[] {
    const fromKey = readJsonArray(LAWSUIT_FILES_ARCHIVED_KEY);
    if (fromKey !== null) return fromKey as FileData[];
    return [];
}

export function readLawsuitTrashSegment(): FileData[] {
    const fromKey = readJsonArray(LAWSUIT_FILES_TRASH_KEY);
    if (fromKey !== null) return fromKey as FileData[];
    return [];
}

export function readLawsuitLifecycleIndex(): LawsuitLifecycleIndex | null {
    try {
        const raw = SecureStoreService.getItemSync(LAWSUIT_FILES_INDEX_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        const obj = parsed as LawsuitLifecycleIndex;
        if (obj.v !== 1 || !obj.entries || !obj.counts) return null;
        return obj;
    } catch {
        return null;
    }
}

export function persistLawsuitActiveSegment(files: FileData[]): void {
    writeJsonArray(LAWSUIT_FILES_ACTIVE_KEY, files);
}

export function persistLawsuitArchivedSegment(files: FileData[]): void {
    writeJsonArray(LAWSUIT_FILES_ARCHIVED_KEY, files);
}

export function persistLawsuitTrashSegment(files: FileData[]): void {
    writeJsonArray(LAWSUIT_FILES_TRASH_KEY, files);
}

export function persistLawsuitLifecycleIndex(index: LawsuitLifecycleIndex): void {
    const serialized = JSON.stringify(index);
    SecureStoreService.setItemSync(LAWSUIT_FILES_INDEX_KEY, serialized);
    try {
        persistenceRepository.save(LAWSUIT_FILES_INDEX_KEY, index);
        persistenceRepository.flushPending(LAWSUIT_FILES_INDEX_KEY);
    } catch {
        /* tests may mock persistence */
    }
}

/** مرآة monolithic لتوافق cloud sync والمسارات القديمة */
export function syncLawsuitMonolithicMirror(
    active: FileData[],
    archived: FileData[],
    trash: FileData[],
): void {
    const merged = [...active, ...archived, ...trash];
    saveLawsuitFilesRawImmediate(merged as unknown[]);
}

function splitMonolithic(files: FileData[]): {
    active: FileData[];
    archived: FileData[];
    trash: FileData[];
} {
    const active: FileData[] = [];
    const archived: FileData[] = [];
    const trash: FileData[] = [];
    for (const file of files) {
        if (isLawsuitInTrash(file)) trash.push(file);
        else if (isLawsuitArchived(file)) archived.push(file);
        else active.push(file);
    }
    return { active, archived, trash };
}

export type LawsuitBootState = {
    active: FileData[];
    archived: FileData[] | null;
    trash: FileData[] | null;
    index: LawsuitLifecycleIndex;
    migrated: boolean;
};

export function segmentsAlreadyPresent(): boolean {
    const active = readJsonArray(LAWSUIT_FILES_ACTIVE_KEY);
    const index = readLawsuitLifecycleIndex();
    return active !== null || index !== null;
}

export function migrateLawsuitMonolithicToSegmentsIfNeeded(): LawsuitBootState {
    if (segmentsAlreadyPresent()) {
        const active = readLawsuitActiveSegment();
        const index = readLawsuitLifecycleIndex() ?? buildLawsuitLifecycleIndex(active, [], []);
        return { active, archived: null, trash: null, index, migrated: false };
    }

    const monolithic = loadLawsuitFilesRaw() as FileData[];
    const { active, archived, trash } = splitMonolithic(monolithic);
    const index = buildLawsuitLifecycleIndex(active, archived, trash);

    persistLawsuitActiveSegment(active);
    persistLawsuitArchivedSegment(archived);
    persistLawsuitTrashSegment(trash);
    persistLawsuitLifecycleIndex(index);
    syncLawsuitMonolithicMirror(active, archived, trash);

    return { active, archived: null, trash: null, index, migrated: monolithic.length > 0 };
}

export function loadLawsuitBootState(): LawsuitBootState {
    return migrateLawsuitMonolithicToSegmentsIfNeeded();
}

export function loadLawsuitFullSegmentsFromStorage(): {
    active: FileData[];
    archived: FileData[];
    trash: FileData[];
    index: LawsuitLifecycleIndex;
} {
    migrateLawsuitMonolithicToSegmentsIfNeeded();
    const active = readLawsuitActiveSegment();
    const archived = readLawsuitArchivedSegment();
    const trash = readLawsuitTrashSegment();
    const index =
        readLawsuitLifecycleIndex() ??
        buildLawsuitLifecycleIndex(active, archived, trash);
    return { active, archived, trash, index };
}

export function persistLawsuitSegmentRecord(
    segmentKey: typeof LAWSUIT_FILES_ACTIVE_KEY | typeof LAWSUIT_FILES_ARCHIVED_KEY | typeof LAWSUIT_FILES_TRASH_KEY,
    record: FileData,
    current: FileData[],
): FileData[] {
    const idStr = String(record.id);
    const exists = current.some((f) => String(f.id) === idStr);
    const next = exists
        ? current.map((f) => (String(f.id) === idStr ? record : f))
        : [record, ...current];
    if (segmentKey === LAWSUIT_FILES_ACTIVE_KEY) persistLawsuitActiveSegment(next);
    else if (segmentKey === LAWSUIT_FILES_ARCHIVED_KEY) persistLawsuitArchivedSegment(next);
    else persistLawsuitTrashSegment(next);
    return next;
}

export function removeLawsuitSegmentRecords(
    segmentKey: typeof LAWSUIT_FILES_ACTIVE_KEY | typeof LAWSUIT_FILES_ARCHIVED_KEY | typeof LAWSUIT_FILES_TRASH_KEY,
    ids: Array<string | number>,
    current: FileData[],
): FileData[] {
    const idSet = new Set(ids.map(String));
    const next = current.filter((f) => !idSet.has(String(f.id)));
    if (segmentKey === LAWSUIT_FILES_ACTIVE_KEY) persistLawsuitActiveSegment(next);
    else if (segmentKey === LAWSUIT_FILES_ARCHIVED_KEY) persistLawsuitArchivedSegment(next);
    else persistLawsuitTrashSegment(next);
    return next;
}

export const LAWSUIT_SEGMENT_KEYS = {
    active: LAWSUIT_FILES_ACTIVE_KEY,
    archived: LAWSUIT_FILES_ARCHIVED_KEY,
    trash: LAWSUIT_FILES_TRASH_KEY,
    index: LAWSUIT_FILES_INDEX_KEY,
    mirror: LAWSUIT_FILES_STORAGE_KEY,
} as const;
