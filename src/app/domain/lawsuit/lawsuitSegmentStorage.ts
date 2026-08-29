import type { FileData } from './lawsuitFileTypes';
import SecureStoreService from '@/app/services/SecureStoreService';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_TRASH_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import { persistLawsuitActiveBundle } from '@/app/domain/lawsuit/lawsuitDurabilityGate';
import {
    persistLawsuitActiveSegment,
    persistLawsuitArchivedSegment,
    persistLawsuitTrashSegment,
    readLawsuitActiveSegment,
    readLawsuitArchivedSegment,
    readLawsuitJsonArray,
    readLawsuitLifecycleIndex,
    readLawsuitTrashSegment,
} from '@/app/domain/lawsuit/lawsuitSegmentPersist';
import {
    buildLawsuitLifecycleIndex,
    emptyLawsuitLifecycleIndex,
    type LawsuitLifecycleIndex,
} from './lawsuitLifecycleIndex';
import { isLawsuitArchived, isLawsuitInTrash } from '@/app/utils/lawsuitTrash';

export {
    mirrorLawsuitSegmentsSafe,
    persistLawsuitActiveSegment,
    persistLawsuitArchivedSegment,
    persistLawsuitLifecycleIndex,
    persistLawsuitTrashSegment,
    readLawsuitActiveSegment,
    readLawsuitArchivedSegment,
    readLawsuitTrashSegment,
    resolveLazyLawsuitSegmentForMirror,
    syncLawsuitMonolithicMirror,
    warnIfLawsuitSegmentExceedsEncryptLimit,
} from '@/app/domain/lawsuit/lawsuitSegmentPersist';

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

type LawsuitBootState = {
    active: FileData[];
    archived: FileData[] | null;
    trash: FileData[] | null;
    index: LawsuitLifecycleIndex;
    migrated: boolean;
};

export function lawsuitSegmentsNeedWarm(): boolean {
    return (
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_ACTIVE_KEY) ||
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_INDEX_KEY) ||
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_ARCHIVED_KEY) ||
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_TRASH_KEY) ||
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_STORAGE_KEY)
    );
}

export function lawsuitStorageMayHaveUnreadData(index: LawsuitLifecycleIndex): boolean {
    if (lawsuitSegmentsNeedWarm()) return true;
    return index.counts.active > 0 || index.counts.archived > 0 || index.counts.trash > 0;
}

export function segmentsAlreadyPresent(): boolean {
    const activeReadable = readLawsuitJsonArray(LAWSUIT_FILES_ACTIVE_KEY);
    const indexReadable = readLawsuitLifecycleIndex();
    if (activeReadable !== null || indexReadable !== null) return true;
    return (
        SecureStoreService.hasItemSync(LAWSUIT_FILES_ACTIVE_KEY) ||
        SecureStoreService.hasItemSync(LAWSUIT_FILES_INDEX_KEY)
    );
}

function persistLawsuitSegmentBundle(
    active: FileData[],
    archived: FileData[],
    trash: FileData[],
    index: LawsuitLifecycleIndex,
    options?: { allowLifecycleRedistribute?: boolean },
): void {
    const redistribute = Boolean(options?.allowLifecycleRedistribute);
    persistLawsuitArchivedSegment(archived, {
        allowVerifiedEmpty: redistribute && archived.length === 0,
        allowShrink: redistribute,
    });
    persistLawsuitTrashSegment(trash, {
        allowVerifiedEmpty: redistribute && trash.length === 0,
        allowShrink: redistribute,
    });
    persistLawsuitActiveBundle({
        active,
        index,
        archived,
        trash,
        options: redistribute
            ? {
                  allowVerifiedEmpty: active.length === 0,
                  allowShrink: true,
              }
            : undefined,
    });
}

/** لا تكتب مقاطع من مرآة قديمة قبل أن تُملأ مرآة IndexedDB — هذا كان مسار اختفاء الأحوال. */
function shouldSkipBootSegmentPersist(): boolean {
    if (!SecureStoreService.isDiskHydrationSettledSync()) return true;
    return (
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_ACTIVE_KEY) ||
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_INDEX_KEY) ||
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_STORAGE_KEY)
    );
}

export function migrateLawsuitMonolithicToSegmentsIfNeeded(): LawsuitBootState {
    if (segmentsAlreadyPresent()) {
        let active = readLawsuitActiveSegment();
        const index = readLawsuitLifecycleIndex() ?? buildLawsuitLifecycleIndex(active, [], []);

        if (active.length === 0) {
            const monolithic = loadLawsuitFilesRaw() as FileData[];
            if (monolithic.length > 0) {
                const split = splitMonolithic(monolithic);
                active = split.active;
                const healedIndex = buildLawsuitLifecycleIndex(
                    split.active,
                    split.archived,
                    split.trash,
                );
                /*
                 * عرض فقط حتى يستقر القرص. الكتابة هنا فوق ciphertext غير مقروء
                 * كانت تُثبّت المدنية القديمة وتمسح الأحوال المنشأة.
                 */
                if (
                    !shouldSkipBootSegmentPersist() &&
                    (active.length > 0 || split.archived.length > 0 || split.trash.length > 0)
                ) {
                    persistLawsuitSegmentBundle(
                        split.active,
                        split.archived,
                        split.trash,
                        healedIndex,
                    );
                }
                return {
                    active,
                    archived: null,
                    trash: null,
                    index: healedIndex,
                    migrated: false,
                };
            }
        }

        return { active, archived: null, trash: null, index, migrated: false };
    }

    const monolithic = loadLawsuitFilesRaw() as FileData[];
    const { active, archived, trash } = splitMonolithic(monolithic);
    const index = buildLawsuitLifecycleIndex(active, archived, trash);

    if (monolithic.length === 0) {
        return {
            active: [],
            archived: null,
            trash: null,
            index: emptyLawsuitLifecycleIndex(),
            migrated: false,
        };
    }

    if (!shouldSkipBootSegmentPersist()) {
        persistLawsuitSegmentBundle(active, archived, trash, index);
    }

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

/**
 * دمج حمولة (سحابة/تقويم/مرآة) مع المقاطع على القرص دون إسقاط معرّفات محلية.
 * الحمولة مصدر حقيقة لحالتها؛ ما ليس فيها يبقى في مقطعه على القرص.
 */
export function unionLawsuitPayloadWithDiskSegments(payload: FileData[]): {
    active: FileData[];
    archived: FileData[];
    trash: FileData[];
} {
    const rows = Array.isArray(payload) ? payload : [];
    const split = splitMonolithic(rows);
    const payloadIds = new Set(rows.map((f) => String(f?.id ?? '')).filter(Boolean));
    return {
        active: [
            ...split.active,
            ...readLawsuitActiveSegment().filter((f) => !payloadIds.has(String(f.id))),
        ],
        archived: [
            ...split.archived,
            ...readLawsuitArchivedSegment().filter((f) => !payloadIds.has(String(f.id))),
        ],
        trash: [
            ...split.trash,
            ...readLawsuitTrashSegment().filter((f) => !payloadIds.has(String(f.id))),
        ],
    };
}

/** صفوف محلية للمزامنة: مقاطع + مرآة — لا تعتمد على persistenceRepository وحده */
export function collectLawsuitLocalRowsForSync(): FileData[] {
    try {
        migrateLawsuitMonolithicToSegmentsIfNeeded();
        const seen = new Set<string>();
        const out: FileData[] = [];
        const add = (rows: FileData[]) => {
            for (const row of rows) {
                const id = String(row?.id ?? '').trim();
                if (!id || seen.has(id)) continue;
                seen.add(id);
                out.push(row);
            }
        };
        add(readLawsuitActiveSegment());
        add(readLawsuitArchivedSegment());
        add(readLawsuitTrashSegment());
        add((loadLawsuitFilesRaw() as FileData[]) ?? []);
        return out;
    } catch {
        return [];
    }
}

/**
 * بعد دمج السحابة في المرآة: أعد تقسيم المقاطع + الفهرس.
 * بدون هذا تبقى المقاطع قديمة وتُعيد الكتابة فوق الدمج عند أي reload/persist.
 */
export function applyLawsuitMonolithicMergeToSegments(merged: FileData[]): {
    active: FileData[];
    archived: FileData[];
    trash: FileData[];
    index: LawsuitLifecycleIndex;
} {
    const payload = Array.isArray(merged) ? merged : [];
    const current = loadLawsuitFullSegmentsFromStorage();
    const hasDisk =
        current.active.length > 0 ||
        current.archived.length > 0 ||
        current.trash.length > 0 ||
        current.index.counts.active > 0 ||
        current.index.counts.archived > 0 ||
        current.index.counts.trash > 0 ||
        lawsuitSegmentsNeedWarm();
    if (payload.length === 0) {
        if (hasDisk) {
            return current;
        }
        return {
            active: [],
            archived: current.archived,
            trash: current.trash,
            index: current.index,
        };
    }
    const unioned = unionLawsuitPayloadWithDiskSegments(payload);
    const index = buildLawsuitLifecycleIndex(unioned.active, unioned.archived, unioned.trash);
    if (shouldSkipBootSegmentPersist()) {
        return { ...unioned, index };
    }
    persistLawsuitSegmentBundle(unioned.active, unioned.archived, unioned.trash, index, {
        allowLifecycleRedistribute: true,
    });
    return { ...unioned, index };
}

/** بحث مزامَن عبر المقاطع — للبحث العام وفتح المخزن/السلة */
export function findLawsuitFileAcrossSegments(fileId: string | number): FileData | null {
    const idStr = String(fileId);
    migrateLawsuitMonolithicToSegmentsIfNeeded();
    const hit =
        readLawsuitActiveSegment().find((f) => String(f.id) === idStr) ??
        readLawsuitArchivedSegment().find((f) => String(f.id) === idStr) ??
        readLawsuitTrashSegment().find((f) => String(f.id) === idStr);
    return hit ?? null;
}

export function removeLawsuitSegmentRecords(
    segmentKey: typeof LAWSUIT_FILES_ACTIVE_KEY | typeof LAWSUIT_FILES_ARCHIVED_KEY | typeof LAWSUIT_FILES_TRASH_KEY,
    ids: Array<string | number>,
    current: FileData[],
): FileData[] {
    const idSet = new Set(ids.map(String));
    const next = current.filter((f) => !idSet.has(String(f.id)));
    if (segmentKey === LAWSUIT_FILES_ACTIVE_KEY) {
        persistLawsuitActiveSegment(next, {
            allowVerifiedEmpty: next.length === 0,
            allowShrink: true,
        });
    } else if (segmentKey === LAWSUIT_FILES_ARCHIVED_KEY) {
        persistLawsuitArchivedSegment(next, {
            allowVerifiedEmpty: next.length === 0,
            allowShrink: true,
        });
    } else {
        persistLawsuitTrashSegment(next, {
            allowVerifiedEmpty: next.length === 0,
            allowShrink: true,
        });
    }
    return next;
}
