import type { FileData } from './lawsuitFileTypes';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    mergeRicherLawsuitActive,
    isPoorerLawsuitActiveList,
    excludeLawsuitIdsBySet,
} from './lawsuitActiveDurability';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import {
    rebuildActiveSegmentInIndex,
} from './lawsuitLifecycleIndex';
import {
    applyLawsuitMonolithicMergeToSegments,
    loadLawsuitBootState,
    loadLawsuitFullSegmentsFromStorage,
    lawsuitSegmentsNeedWarm,
    migrateLawsuitMonolithicToSegmentsIfNeeded,
    persistLawsuitArchivedSegment,
    persistLawsuitTrashSegment,
    readLawsuitArchivedSegment,
    readLawsuitTrashSegment,
    shouldRefuseEmptyActiveMonolithRecovery,
} from './lawsuitSegmentStorage';
import { persistLawsuitActiveBundle } from './lawsuitDurabilityGate';
import { mergeLawsuitDurabilityOverlaysInto } from './lawsuitDurabilityOverlay';
import type { LawsuitFileSegments } from './lawsuitFileSegments';
import {
    collectHeldOutOfActiveIds,
    healLawsuitArchivedAgainstActive,
    healLawsuitTrashAgainstActive,
} from './lawsuitFilesStatePolicy';
import {
    areLawsuitDossierTombstonesUnreadSync,
    excludeTombstonedLawsuitFiles,
} from '@/app/utils/lawsuitDossierTombstones';

export type { LawsuitFileSegments } from './lawsuitFileSegments';
export { emptyLawsuitFileSegments } from './lawsuitFileSegments';
export {
    applyLawsuitArchiveSegments,
    applyLawsuitConsolidationSegments,
    applyLawsuitPermanentDeleteSegments,
    applyLawsuitRestoreFromArchiveSegments,
    applyLawsuitRestoreFromTrashSegments,
    applyLawsuitTrashSegments,
    findLawsuitFileInSegments,
    persistLawsuitActiveRecord,
} from './lawsuitFilesSegmentMutations';

const STALE_MOCK_CASE_NO = '2025/ب/522';

/** إزالة mock قديم من الجلسات السابقة */
export function stripStaleMockLawsuitFile(files: FileData[]): FileData[] {
    if (files.length === 1 && files[0]?.id === 1 && files[0]?.caseNo === STALE_MOCK_CASE_NO) {
        return [];
    }
    return files;
}

export function loadInitialLawsuitFiles(): FileData[] {
    const boot = loadLawsuitBootSegments();
    const stripped = stripStaleMockLawsuitFile(boot.active);
    if (stripped.length !== boot.active.length && stripped.length > 0) {
        const index = rebuildActiveSegmentInIndex(boot.index, stripped);
        persistLawsuitActiveBundle({
            active: stripped,
            index,
            archived: boot.archived,
            trash: boot.trash,
            options: { allowShrink: true },
        });
    }
    return mergeLawsuitDurabilityOverlaysInto(stripped);
}

/**
 * تحميل غير متزامن — مقاطع الدعوى فقط (لا تنتظر PROTECTED_WARM_KEYS كلها).
 * ترحيل المخطط الشامل يبقى في الخلفية عبر ensurePersistedReady.
 */
export async function loadInitialLawsuitFilesAsync(): Promise<FileData[]> {
    await SecureStoreService.ensureLawsuitKeysReady();
    void SecureStoreService.ensurePersistedReady().catch(() => undefined);

    const syncFirst = stripStaleMockLawsuitFile(loadInitialLawsuitFiles());
    if (syncFirst.length > 0) {
        return syncFirst;
    }

    const needsWarm =
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_ACTIVE_KEY) ||
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_INDEX_KEY) ||
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_STORAGE_KEY);

    if (needsWarm) {
        await SecureStoreService.warmKeys([
            LAWSUIT_FILES_ACTIVE_KEY,
            LAWSUIT_FILES_INDEX_KEY,
            LAWSUIT_FILES_STORAGE_KEY,
        ]);
    }

    const warmed = loadInitialLawsuitFiles();
    if (warmed.length > 0) {
        return warmed;
    }

    const bootAfterWarm = loadLawsuitBootSegments();
    if (shouldRefuseEmptyActiveMonolithRecovery(bootAfterWarm.index)) {
        return mergeLawsuitDurabilityOverlaysInto(
            stripStaleMockLawsuitFile(bootAfterWarm.active),
        );
    }

    const { loadDossierCollectionAsync } = await import(
        '@/app/services/dossierPersistence/dossierPersistenceService'
    );
    const asyncLoaded = (await loadDossierCollectionAsync('lawsuit')) as FileData[];
    const syncLoaded = loadLawsuitFilesRaw() as FileData[];
    const primary = asyncLoaded.length > 0 ? asyncLoaded : syncLoaded;
    if (primary.length > 0) {
        applyLawsuitMonolithicMergeToSegments(primary);
        return mergeLawsuitDurabilityOverlaysInto(
            stripStaleMockLawsuitFile(loadLawsuitBootSegments().active),
        );
    }
    return mergeLawsuitDurabilityOverlaysInto(
        stripStaleMockLawsuitFile(loadLawsuitBootSegments().active),
    );
}

export function loadLawsuitBootSegments(): LawsuitFileSegments {
    const boot = loadLawsuitBootState();
    const stripped = stripStaleMockLawsuitFile(boot.active);
    let diskTrash = boot.trash ?? readLawsuitTrashSegment();
    let diskArchived = boot.archived ?? readLawsuitArchivedSegment();
    const held = collectHeldOutOfActiveIds({
        trash: diskTrash,
        archived: diskArchived,
        index: boot.index,
        preferActiveIds: stripped,
    });
    const withoutHeld = excludeLawsuitIdsBySet(stripped, held);
    const healedTrash = healLawsuitTrashAgainstActive(withoutHeld, diskTrash);
    if (healedTrash && healedTrash.length !== diskTrash.length) {
        diskTrash = healedTrash;
        if (!shouldSkipBootSegmentPersistSafe()) {
            persistLawsuitTrashSegment(diskTrash, {
                allowShrink: true,
                allowVerifiedEmpty: diskTrash.length === 0,
            });
        }
    }
    const healedArchived = healLawsuitArchivedAgainstActive(withoutHeld, diskArchived);
    if (healedArchived && healedArchived.length !== diskArchived.length) {
        diskArchived = healedArchived;
        if (!shouldSkipBootSegmentPersistSafe()) {
            persistLawsuitArchivedSegment(diskArchived, {
                allowShrink: true,
                allowVerifiedEmpty: diskArchived.length === 0,
            });
        }
    }

    /*
     * لا تكتب تفريغاً/تقلّصاً للنشط من مسار الإقلاع أبداً.
     * شفاء السلة/الأرشيف المكرر مسموح؛ تثبيت withoutHeld على القرص كان wipe جزئياً.
     */
    let active = excludeLawsuitIdsBySet(
        mergeLawsuitDurabilityOverlaysInto(withoutHeld),
        collectHeldOutOfActiveIds({
            trash: diskTrash,
            archived: diskArchived,
            preferActiveIds: withoutHeld,
        }),
    );

    if (active.length === 0) {
        if (
            areLawsuitDossierTombstonesUnreadSync() ||
            shouldRefuseEmptyActiveMonolithRecovery(boot.index)
        ) {
            return {
                active,
                archived: boot.archived === null ? null : diskArchived,
                trash: boot.trash === null ? null : diskTrash,
                index: boot.index,
            };
        }
        const mono = stripStaleMockLawsuitFile(loadLawsuitFilesRaw() as FileData[]);
        if (mono.length > 0) {
            const monoActive = mono.filter((f) => {
                const status = String((f as { status?: string }).status ?? '').toLowerCase();
                return status !== 'archived' && status !== 'trash' && status !== 'deleted';
            });
            const recoverHeld = collectHeldOutOfActiveIds({
                trash: diskTrash,
                archived: diskArchived,
                preferActiveIds: stripped,
            });
            const recovered = excludeTombstonedLawsuitFiles(
                excludeLawsuitIdsBySet(monoActive, recoverHeld),
            );
            if (recovered.length > 0) {
                active = mergeLawsuitDurabilityOverlaysInto(recovered);
                diskTrash = healLawsuitTrashAgainstActive(active, diskTrash) ?? diskTrash;
                diskArchived =
                    healLawsuitArchivedAgainstActive(active, diskArchived) ?? diskArchived;
                const index = rebuildActiveSegmentInIndex(boot.index, active);
                if (!shouldSkipBootSegmentPersistSafe()) {
                    persistLawsuitActiveBundle({
                        active,
                        index,
                        archived: diskArchived,
                        trash: diskTrash,
                    });
                }
                return {
                    active,
                    archived: boot.archived === null ? null : diskArchived,
                    trash: boot.trash === null ? null : diskTrash,
                    index,
                };
            }
        }
    }

    return {
        active,
        archived: boot.archived === null ? null : diskArchived,
        trash: boot.trash === null ? null : diskTrash,
        index:
            active.length !== stripped.length
                ? rebuildActiveSegmentInIndex(boot.index, active)
                : boot.index,
    };
}

function shouldSkipBootSegmentPersistSafe(): boolean {
    try {
        if (!SecureStoreService.isDiskHydrationSettledSync()) return true;
        return (
            SecureStoreService.isUnreadSync(LAWSUIT_FILES_ACTIVE_KEY) ||
            SecureStoreService.isUnreadSync(LAWSUIT_FILES_INDEX_KEY) ||
            SecureStoreService.isUnreadSync(LAWSUIT_FILES_STORAGE_KEY)
        );
    } catch {
        return true;
    }
}

export function loadLawsuitArchivedSegmentFiles(): FileData[] {
    migrateLawsuitMonolithicToSegmentsIfNeeded();
    return excludeTombstonedLawsuitFiles(readLawsuitArchivedSegment());
}

export function loadLawsuitTrashSegmentFiles(): FileData[] {
    migrateLawsuitMonolithicToSegmentsIfNeeded();
    return excludeTombstonedLawsuitFiles(readLawsuitTrashSegment());
}

export function reloadLawsuitFilesFromStorage(): LawsuitFileSegments {
    const full = loadLawsuitFullSegmentsFromStorage();
    const stripped = stripStaleMockLawsuitFile(full.active);
    const held = collectHeldOutOfActiveIds({
        trash: full.trash,
        archived: full.archived,
        index: full.index,
        preferActiveIds: stripped,
    });
    const withoutHeld = excludeLawsuitIdsBySet(stripped, held);
    const healedTrash = healLawsuitTrashAgainstActive(withoutHeld, full.trash) ?? full.trash;
    const healedArchived =
        healLawsuitArchivedAgainstActive(withoutHeld, full.archived) ?? full.archived;
    const active = excludeLawsuitIdsBySet(
        mergeLawsuitDurabilityOverlaysInto(withoutHeld),
        collectHeldOutOfActiveIds({
            trash: healedTrash,
            archived: healedArchived,
            preferActiveIds: withoutHeld,
        }),
    );
    return {
        active,
        archived: healedArchived,
        trash: healedTrash,
        index:
            active.length !== full.active.length
                ? rebuildActiveSegmentInIndex(full.index, active)
                : full.index,
    };
}

/** حفظ موحّد — النشطة فقط (توافق المسارات القديمة) */
export function persistLawsuitFiles(next: FileData[]): FileData[] {
    let payload = mergeLawsuitDurabilityOverlaysInto(Array.isArray(next) ? next : []);
    const boot = loadLawsuitBootSegments();

    if (payload.length === 0) {
        if (
            boot.active.length > 0 ||
            boot.index.counts.active > 0 ||
            boot.index.counts.archived > 0 ||
            boot.index.counts.trash > 0 ||
            lawsuitSegmentsNeedWarm()
        ) {
            return boot.active;
        }
    }

    if (isPoorerLawsuitActiveList(payload, boot.active)) {
        payload = mergeRicherLawsuitActive(payload, boot.active);
    }

    if (payload.length > 0 && boot.active.length === 0) {
        const mono = stripStaleMockLawsuitFile(loadLawsuitFilesRaw() as FileData[]);
        if (mono.length > 0) {
            const activeFromMono = mono.filter((f) => {
                const status = String((f as { status?: string }).status ?? '').toLowerCase();
                return status !== 'archived' && status !== 'trash' && status !== 'deleted';
            });
            if (activeFromMono.length > 0) {
                payload = mergeRicherLawsuitActive(payload, activeFromMono);
            }
        }
    }

    const nextIndex = rebuildActiveSegmentInIndex(boot.index, payload);
    persistLawsuitActiveBundle({
        active: payload,
        index: nextIndex,
        archived: boot.archived,
        trash: boot.trash,
    });
    return payload;
}
