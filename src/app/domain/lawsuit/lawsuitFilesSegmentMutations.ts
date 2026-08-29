import type { FileData } from './lawsuitFileTypes';
import { assertLawsuitFileMutable } from './lawsuitFileMutationGuard';
import {
    applyLawsuitIndexStatusChange,
    buildLawsuitIndexEntryFromFile,
    buildLawsuitLifecycleIndex,
    removeLawsuitFromIndex,
    upsertLawsuitIndexEntry,
} from './lawsuitLifecycleIndex';
import { LAWSUIT_FILES_TRASH_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';
import {
    persistLawsuitArchivedSegment,
    persistLawsuitTrashSegment,
    readLawsuitArchivedSegment,
    readLawsuitTrashSegment,
    removeLawsuitSegmentRecords,
    resolveLazyLawsuitSegmentForMirror,
} from './lawsuitSegmentStorage';
import {
    persistLawsuitActiveBundle,
    persistLawsuitLifecycleMirrorBundle,
} from './lawsuitDurabilityGate';
import { pruneLawsuitDurabilityOverlaysForFileIds } from './lawsuitDurabilityOverlay';
import type { LawsuitFileSegments } from './lawsuitFileSegments';

export type { LawsuitFileSegments } from './lawsuitFileSegments';

/** مقاطع كسولة (`null`) تُقرأ من القرص قبل أي طفرة تُpersist — لا `?? []`. */
function resolveTrashForMutation(segments: LawsuitFileSegments): FileData[] {
    return resolveLazyLawsuitSegmentForMirror(segments.trash, readLawsuitTrashSegment);
}

function resolveArchivedForMutation(segments: LawsuitFileSegments): FileData[] {
    return resolveLazyLawsuitSegmentForMirror(segments.archived, readLawsuitArchivedSegment);
}

export function persistLawsuitActiveRecord(
    record: FileData,
    segments: LawsuitFileSegments,
): LawsuitFileSegments {
    assertLawsuitFileMutable(record);
    const idStr = String(record.id);
    const nextActive = segments.active.some((f) => String(f.id) === idStr)
        ? segments.active.map((f) => (String(f.id) === idStr ? record : f))
        : [record, ...segments.active];
    const nextIndex = upsertLawsuitIndexEntry(segments.index, record);
    const next: LawsuitFileSegments = { ...segments, active: nextActive, index: nextIndex };
    persistLawsuitActiveBundle({
        active: nextActive,
        index: nextIndex,
        archived: segments.archived,
        trash: segments.trash,
    });
    return next;
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
    const existingTrash = resolveTrashForMutation(segments).filter((f) => String(f.id) !== idStr);
    const nextTrash = [...existingTrash, trashed];
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
    pruneLawsuitDurabilityOverlaysForFileIds([idStr]);
    persistLawsuitActiveBundle({
        active: nextActive,
        index: nextIndex,
        archived: segments.archived,
        trash: nextTrash,
        options: {
            allowVerifiedEmpty: nextActive.length === 0,
            allowShrink: true,
        },
    });
    persistLawsuitTrashSegment(nextTrash);
    return next;
}

export function applyLawsuitRestoreFromTrashSegments(
    segments: LawsuitFileSegments,
    fileId: string | number,
): LawsuitFileSegments {
    const idStr = String(fileId);
    const trash = resolveTrashForMutation(segments);
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
    persistLawsuitActiveBundle({
        active: nextActive,
        index: nextIndex,
        archived: segments.archived,
        trash: nextTrash,
    });
    persistLawsuitTrashSegment(nextTrash, {
        allowVerifiedEmpty: nextTrash.length === 0,
        allowShrink: true,
    });
    return next;
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
    const existingArchived = resolveArchivedForMutation(segments).filter(
        (f) => String(f.id) !== idStr,
    );
    const nextArchived = [...existingArchived, archived];
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
    pruneLawsuitDurabilityOverlaysForFileIds([idStr]);
    persistLawsuitActiveBundle({
        active: nextActive,
        index: nextIndex,
        archived: nextArchived,
        trash: segments.trash,
        options: {
            allowVerifiedEmpty: nextActive.length === 0,
            allowShrink: true,
        },
    });
    persistLawsuitArchivedSegment(nextArchived);
    return next;
}

export function applyLawsuitRestoreFromArchiveSegments(
    segments: LawsuitFileSegments,
    fileId: string | number,
): LawsuitFileSegments {
    const idStr = String(fileId);
    const archived = resolveArchivedForMutation(segments);
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
    persistLawsuitActiveBundle({
        active: nextActive,
        index: nextIndex,
        archived: nextArchived,
        trash: segments.trash,
    });
    persistLawsuitArchivedSegment(nextArchived, { allowVerifiedEmpty: nextArchived.length === 0, allowShrink: true });
    return next;
}

export function applyLawsuitPermanentDeleteSegments(
    segments: LawsuitFileSegments,
    ids: Array<string | number>,
): LawsuitFileSegments {
    const trash = resolveTrashForMutation(segments);
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
    persistLawsuitTrashSegment(nextTrash, {
        allowVerifiedEmpty: nextTrash.length === 0,
        allowShrink: true,
    });
    pruneLawsuitDurabilityOverlaysForFileIds(ids);
    persistLawsuitLifecycleMirrorBundle({
        active: segments.active,
        index: nextIndex,
        archived: segments.archived,
        trash: nextTrash,
    });
    return next;
}

/**
 * توحيد دعويين: المحدّثة تبقى في active، والثانوية تُpersist في مقطع archived
 * (لا تُحقَن عبر persistLawsuitFiles في المقطع النشط).
 */
export function applyLawsuitConsolidationSegments(
    segments: LawsuitFileSegments,
    mergedPrimary: FileData,
    archivedSecondary: FileData,
): LawsuitFileSegments {
    const primaryId = String(mergedPrimary.id);
    const secondaryId = String(archivedSecondary.id);
    const archivedFile: FileData = { ...archivedSecondary, status: 'archived' };

    let nextActive = segments.active
        .filter((f) => String(f.id) !== secondaryId)
        .map((f) => (String(f.id) === primaryId ? mergedPrimary : f));
    if (!nextActive.some((f) => String(f.id) === primaryId)) {
        nextActive = [mergedPrimary, ...nextActive];
    }

    const nextArchived = [
        archivedFile,
        ...resolveArchivedForMutation(segments).filter(
            (f) => String(f.id) !== secondaryId && String(f.id) !== primaryId,
        ),
    ];
    const nextTrash = resolveTrashForMutation(segments).filter(
        (f) => String(f.id) !== secondaryId,
    );
    const nextIndex = buildLawsuitLifecycleIndex(nextActive, nextArchived, nextTrash);
    const next: LawsuitFileSegments = {
        active: nextActive,
        archived: nextArchived,
        trash: nextTrash,
        index: nextIndex,
    };
    persistLawsuitActiveBundle({
        active: nextActive,
        index: nextIndex,
        archived: nextArchived,
        trash: nextTrash,
        options: { allowShrink: true },
    });
    persistLawsuitArchivedSegment(nextArchived);
    persistLawsuitTrashSegment(nextTrash);
    pruneLawsuitDurabilityOverlaysForFileIds([secondaryId]);
    return next;
}

export function findLawsuitFileInSegments(
    segments: LawsuitFileSegments,
    fileId: string | number,
): FileData | undefined {
    const idStr = String(fileId);
    return (
        segments.active.find((f) => String(f.id) === idStr) ??
        resolveArchivedForMutation(segments).find((f) => String(f.id) === idStr) ??
        resolveTrashForMutation(segments).find((f) => String(f.id) === idStr)
    );
}
