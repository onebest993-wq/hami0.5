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
    collectHeldOutOfActiveIds,
    healLawsuitArchivedAgainstActive,
    healLawsuitTrashAgainstActive,
} from '@/app/domain/lawsuit/lawsuitFilesStatePolicy';
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
import {
    areLawsuitDossierTombstonesUnreadSync,
    excludeTombstonedLawsuitFiles,
    readLawsuitDossierTombstoneIds,
} from '@/app/utils/lawsuitDossierTombstones';

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

function keyOccupiedAndUnread(key: string): boolean {
    return SecureStoreService.hasItemSync(key) && SecureStoreService.isUnreadSync(key);
}

/**
 * النشط الفارغ بعد سلة/أرشيف ليس «خزنة ضائعة» تُستورد من lawyer_files.
 * الاستيراد كان يعيد إضبارة محذوفة من مرآة/localStorage قديمة عند كل reload.
 */
export function shouldRefuseEmptyActiveMonolithRecovery(
    index: LawsuitLifecycleIndex | null,
): boolean {
    if (areLawsuitDossierTombstonesUnreadSync()) return true;
    if (
        keyOccupiedAndUnread(LAWSUIT_FILES_ACTIVE_KEY) ||
        keyOccupiedAndUnread(LAWSUIT_FILES_INDEX_KEY) ||
        keyOccupiedAndUnread(LAWSUIT_FILES_ARCHIVED_KEY) ||
        keyOccupiedAndUnread(LAWSUIT_FILES_TRASH_KEY) ||
        keyOccupiedAndUnread(LAWSUIT_FILES_STORAGE_KEY)
    ) {
        return true;
    }
    if (index && (index.counts.trash > 0 || index.counts.archived > 0)) return true;
    if (index) {
        for (const entry of Object.values(index.entries)) {
            if (entry.status === 'deleted' || entry.status === 'archived') return true;
        }
    }
    if (
        SecureStoreService.hasItemSync(LAWSUIT_FILES_TRASH_KEY) &&
        readLawsuitTrashSegment().length > 0
    ) {
        return true;
    }
    if (
        SecureStoreService.hasItemSync(LAWSUIT_FILES_ARCHIVED_KEY) &&
        readLawsuitArchivedSegment().length > 0
    ) {
        return true;
    }
    return false;
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
    let nextActive = active;
    /*
     * إعادة التوزيع من السحابة/المرآة لا تُفرّغ النشط فوق قرص أغنى.
     * ممنوع allowVerifiedEmpty على النشط هنا — كان يشرعن [] بعد held خاطئ.
     */
    if (redistribute && nextActive.length === 0) {
        const diskActive = readLawsuitActiveSegment();
        if (diskActive.length > 0) {
            nextActive = diskActive;
        }
    }
    persistLawsuitArchivedSegment(archived, {
        allowVerifiedEmpty: redistribute && archived.length === 0,
        allowShrink: redistribute,
    });
    persistLawsuitTrashSegment(trash, {
        allowVerifiedEmpty: redistribute && trash.length === 0,
        allowShrink: redistribute,
    });
    persistLawsuitActiveBundle({
        active: nextActive,
        index:
            nextActive.length === active.length
                ? index
                : buildLawsuitLifecycleIndex(nextActive, archived, trash),
        archived,
        trash,
        /*
         * إعادة التوزيع من السحابة/المرآة: لا allowShrink أعمى —
         * كان يكتب قائمة أفقر فوق أغنى عند قراءة sync مسمّمة.
         * التقلّص العمدي يبقى لمسارات الأرشفة/السلة فقط.
         */
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
            /*
             * شواهد غير مقروءة أو دورة حياة قائمة: لا تستورد المرآة —
             * كانت تُعيد محذوفاً/منقولاً للسلة من lawyer_files القديم.
             */
            if (shouldRefuseEmptyActiveMonolithRecovery(index)) {
                return { active, archived: null, trash: null, index, migrated: false };
            }
            const monolithic = loadLawsuitFilesRaw() as FileData[];
            if (monolithic.length > 0) {
                const split = splitMonolithic(monolithic);
                const diskTrash = readLawsuitTrashSegment();
                const diskArchived = readLawsuitArchivedSegment();
                const held = collectHeldOutOfActiveIds({
                    trash: [...split.trash, ...diskTrash],
                    archived: [...split.archived, ...diskArchived],
                    index,
                    preferActiveIds: active,
                    includeTombstones: true,
                });
                let tombstoned = new Set<string>();
                try {
                    tombstoned = readLawsuitDossierTombstoneIds();
                } catch {
                    /* ignore */
                }
                active = excludeTombstonedLawsuitFiles(
                    split.active.filter((f) => !held.has(String(f.id ?? '').trim())),
                );
                const healedArchivedRaw = [
                    ...split.archived,
                    ...diskArchived.filter(
                        (f) => !split.archived.some((a) => String(a.id) === String(f.id)),
                    ),
                ].filter((f) => !tombstoned.has(String(f.id ?? '').trim()));
                let healedTrash = [
                    ...split.trash,
                    ...diskTrash.filter(
                        (f) => !split.trash.some((t) => String(t.id) === String(f.id)),
                    ),
                ].filter((f) => !tombstoned.has(String(f.id ?? '').trim()));
                healedTrash = healLawsuitTrashAgainstActive(active, healedTrash) ?? healedTrash;
                const healedArchived =
                    healLawsuitArchivedAgainstActive(active, healedArchivedRaw) ??
                    healedArchivedRaw;
                const healedIndex = buildLawsuitLifecycleIndex(
                    active,
                    healedArchived,
                    healedTrash,
                );
                /*
                 * عرض فقط حتى يستقر القرص. الكتابة هنا فوق ciphertext غير مقروء
                 * كانت تُثبّت المدنية القديمة وتمسح الأحوال المنشأة.
                 */
                if (
                    !shouldSkipBootSegmentPersist() &&
                    (active.length > 0 || healedArchived.length > 0 || healedTrash.length > 0)
                ) {
                    persistLawsuitSegmentBundle(
                        active,
                        healedArchived,
                        healedTrash,
                        healedIndex,
                        { allowLifecycleRedistribute: true },
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

        /* نشط غير فارغ: اشفِ تكرار السلة/الأرشيف أولاً — لا تفرّغ النشط بسبب صف مكرّر */
        {
            const diskTrash = readLawsuitTrashSegment();
            const diskArchived = readLawsuitArchivedSegment();
            const healedTrash = healLawsuitTrashAgainstActive(active, diskTrash);
            const healedArchived = healLawsuitArchivedAgainstActive(active, diskArchived);
            if (
                healedTrash &&
                healedTrash.length !== diskTrash.length &&
                !shouldSkipBootSegmentPersist()
            ) {
                persistLawsuitTrashSegment(healedTrash, {
                    allowShrink: true,
                    allowVerifiedEmpty: healedTrash.length === 0,
                });
            }
            if (
                healedArchived &&
                healedArchived.length !== diskArchived.length &&
                !shouldSkipBootSegmentPersist()
            ) {
                persistLawsuitArchivedSegment(healedArchived, {
                    allowShrink: true,
                    allowVerifiedEmpty: healedArchived.length === 0,
                });
            }
            const held = collectHeldOutOfActiveIds({
                trash: healedTrash ?? diskTrash,
                archived: healedArchived ?? diskArchived,
                preferActiveIds: active,
                includeTombstones: true,
            });
            if (held.size > 0) {
                const cleaned = active.filter((f) => !held.has(String(f.id ?? '').trim()));
                if (cleaned.length !== active.length) {
                    /*
                     * عرض فقط — لا تكتب تقلّص نشط من مسار الإقلاع/الترحيل.
                     * الكتابة هنا كانت تثبّت wipe جزئياً عند كل reload.
                     */
                    return {
                        active: cleaned,
                        archived: null,
                        trash: null,
                        index: buildLawsuitLifecycleIndex(
                            cleaned,
                            healedArchived ?? diskArchived,
                            healedTrash ?? diskTrash,
                        ),
                        migrated: false,
                    };
                }
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
 * لا تُعاد إضبارة من السحابة إلى النشط إن كانت محلياً في السلة/الأرشيف.
 */
export function unionLawsuitPayloadWithDiskSegments(payload: FileData[]): {
    active: FileData[];
    archived: FileData[];
    trash: FileData[];
} {
    const rows = Array.isArray(payload) ? payload : [];
    const split = splitMonolithic(rows);
    const payloadIds = new Set(rows.map((f) => String(f?.id ?? '')).filter(Boolean));
    const diskTrash = readLawsuitTrashSegment();
    const diskArchived = readLawsuitArchivedSegment();
    const diskActive = readLawsuitActiveSegment();
    const diskActiveIds = new Set(
        diskActive.map((f) => String(f.id ?? '').trim()).filter(Boolean),
    );
    const preferActive = new Set(diskActiveIds);
    const heldOutOfActive = collectHeldOutOfActiveIds({
        trash: [...split.trash, ...diskTrash],
        archived: [...split.archived, ...diskArchived],
        preferActiveIds: preferActive,
        includeTombstones: true,
    });

    const active = [
        ...split.active.filter((f) => !heldOutOfActive.has(String(f.id ?? '').trim())),
        ...diskActive.filter(
            (f) =>
                !payloadIds.has(String(f.id)) && !heldOutOfActive.has(String(f.id ?? '').trim()),
        ),
    ];
    let archived = [
        ...split.archived,
        ...diskArchived.filter((f) => !payloadIds.has(String(f.id))),
    ];
    let trash = [
        ...split.trash.filter((f) => !diskActiveIds.has(String(f.id ?? '').trim())),
        ...diskTrash.filter(
            (f) =>
                !payloadIds.has(String(f.id)) && !diskActiveIds.has(String(f.id ?? '').trim()),
        ),
    ];
    trash = healLawsuitTrashAgainstActive(active, trash) ?? trash;
    archived = healLawsuitArchivedAgainstActive(active, archived) ?? archived;
    return {
        active: excludeTombstonedLawsuitFiles(active),
        archived: excludeTombstonedLawsuitFiles(archived),
        trash: excludeTombstonedLawsuitFiles(trash),
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
        return excludeTombstonedLawsuitFiles(out);
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
    if (areLawsuitDossierTombstonesUnreadSync()) {
        return current;
    }
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
): { next: FileData[]; ok: boolean } {
    const idSet = new Set(ids.map(String));
    const next = current.filter((f) => !idSet.has(String(f.id)));
    if (next.length === current.length) {
        return { next, ok: true };
    }
    let ok = false;
    if (segmentKey === LAWSUIT_FILES_ACTIVE_KEY) {
        ok = persistLawsuitActiveSegment(next, {
            allowVerifiedEmpty: next.length === 0,
            allowShrink: true,
        });
    } else if (segmentKey === LAWSUIT_FILES_ARCHIVED_KEY) {
        ok = persistLawsuitArchivedSegment(next, {
            allowVerifiedEmpty: next.length === 0,
            allowShrink: true,
        });
    } else {
        ok = persistLawsuitTrashSegment(next, {
            allowVerifiedEmpty: next.length === 0,
            allowShrink: true,
        });
    }
    return { next, ok };
}
