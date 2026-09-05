import SecureStoreService, {
    type SecureStoreAtomicWrite,
} from '@/app/services/SecureStoreService';
import { CryptoService } from '@/app/services/CryptoService';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
    LAWSUIT_FILES_TRASH_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import { LAWSUIT_DOSSIER_TOMBSTONES_KEY } from '@/app/utils/lawsuitDossierTombstones';
import {
    applyLawsuitArchiveSegments,
    applyLawsuitPermanentDeleteSegments,
    applyLawsuitRestoreFromArchiveSegments,
    applyLawsuitRestoreFromTrashSegments,
    applyLawsuitTrashSegments,
} from './lawsuitFilesSegmentMutations';
import {
    excludeLawsuitIdsBySet,
    lawsuitActiveIdSet,
    mergeRicherLawsuitActive,
    parseLawsuitActiveFiles,
} from './lawsuitActiveDurability';
import {
    collectHeldOutOfActiveIds,
    healLawsuitArchivedAgainstActive,
    healLawsuitTrashAgainstActive,
} from './lawsuitFilesStatePolicy';
import { buildLawsuitLifecycleIndex } from './lawsuitLifecycleIndex';
import type { LawsuitFileSegments } from './lawsuitFileSegments';
import { LAWSUIT_PENDING_CREATES_KEY } from './lawsuitPendingCreateStore';
import { LAWSUIT_WRITE_JOURNAL_KEY } from './lawsuitWriteJournal';
import { pruneLawsuitDurabilityOverlaysForFileIds } from './lawsuitDurabilityOverlay';
import { recordLawsuitLifecycleE2e } from '@/app/runtime/lawsuitLifecycleE2eProbe';

export type LawsuitLifecycleMutationKind =
    | 'trash'
    | 'archive'
    | 'restore-trash'
    | 'restore-archive'
    | 'permanent-delete';

export type LawsuitLifecycleTransactionResult = {
    ok: boolean;
    next?: LawsuitFileSegments;
    reason?: 'not-found' | 'unread' | 'invalid-transition' | 'write-failed' | 'verify-failed';
};

const SEGMENT_KEYS = [
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_TRASH_KEY,
    LAWSUIT_FILES_INDEX_KEY,
] as const;

const REQUIRED_KEYS = [
    ...SEGMENT_KEYS,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_DOSSIER_TOMBSTONES_KEY,
] as const;

const LIFECYCLE_KEYS = [
    ...SEGMENT_KEYS,
    LAWSUIT_FILES_STORAGE_KEY,
    ...LAWSUIT_FILES_STORAGE_KEYS_LEGACY,
    LAWSUIT_PENDING_CREATES_KEY,
    LAWSUIT_WRITE_JOURNAL_KEY,
    LAWSUIT_DOSSIER_TOMBSTONES_KEY,
] as const;

function readArray(key: string): unknown[] {
    const raw = readSecureOrDrainLegacySync(key);
    if (!raw?.trim()) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function uniqueIds(ids: readonly (string | number)[]): string[] {
    return [...new Set(ids.map((id) => String(id ?? '').trim()).filter(Boolean))];
}

function canonicalizeCurrent(current: LawsuitFileSegments): LawsuitFileSegments {
    const diskActive = parseLawsuitActiveFiles(
        readSecureOrDrainLegacySync(LAWSUIT_FILES_ACTIVE_KEY),
    );
    const diskArchived = parseLawsuitActiveFiles(
        readSecureOrDrainLegacySync(LAWSUIT_FILES_ARCHIVED_KEY),
    );
    const diskTrash = parseLawsuitActiveFiles(
        readSecureOrDrainLegacySync(LAWSUIT_FILES_TRASH_KEY),
    );

    const archivedSeed =
        current.archived === null
            ? diskArchived
            : mergeRicherLawsuitActive(current.archived, diskArchived);
    const trashSeed =
        current.trash === null
            ? diskTrash
            : mergeRicherLawsuitActive(current.trash, diskTrash);

    const held = collectHeldOutOfActiveIds({
        archived: archivedSeed,
        trash: trashSeed,
        index: current.index,
        includeTombstones: true,
        preferActiveIds: current.active,
    });
    const active = excludeLawsuitIdsBySet(
        mergeRicherLawsuitActive(current.active, diskActive),
        held,
    );
    let archived = healLawsuitArchivedAgainstActive(active, archivedSeed) ?? [];
    let trash = healLawsuitTrashAgainstActive(active, trashSeed) ?? [];

    /*
     * تلف قديم قد يضع المعرّف في archive وtrash معاً. الفهرس يحسم إن كان
     * صريحاً، وإلا السلة أحدث/أشد من الأرشيف فتحفظ نسخة واحدة هناك.
     */
    const archivedIds = lawsuitActiveIdSet(archived);
    const trashIds = lawsuitActiveIdSet(trash);
    for (const id of archivedIds) {
        if (!trashIds.has(id)) continue;
        if (current.index.entries[id]?.status === 'archived') {
            trash = trash.filter((row) => String(row.id) !== id);
        } else {
            archived = archived.filter((row) => String(row.id) !== id);
        }
    }

    return {
        active,
        archived,
        trash,
        index: buildLawsuitLifecycleIndex(active, archived, trash),
    };
}

function applyTransition(
    current: LawsuitFileSegments,
    kind: LawsuitLifecycleMutationKind,
    ids: readonly string[],
): LawsuitFileSegments {
    if (kind === 'permanent-delete') {
        return applyLawsuitPermanentDeleteSegments(current, [...ids]);
    }
    let next = current;
    for (const id of ids) {
        if (kind === 'trash') next = applyLawsuitTrashSegments(next, id);
        else if (kind === 'archive') next = applyLawsuitArchiveSegments(next, id);
        else if (kind === 'restore-trash') {
            next = applyLawsuitRestoreFromTrashSegments(next, id);
        } else {
            next = applyLawsuitRestoreFromArchiveSegments(next, id);
        }
    }
    return next;
}

type Placement = 'active' | 'archived' | 'deleted';

function placementMap(segments: LawsuitFileSegments): Map<string, Placement> | null {
    const placements = new Map<string, Placement>();
    const add = (rows: NonNullable<LawsuitFileSegments['archived']>, place: Placement) => {
        for (const row of rows) {
            const id = String(row.id ?? '').trim();
            if (!id) continue;
            if (placements.has(id)) return false;
            placements.set(id, place);
        }
        return true;
    };
    if (!add(segments.active, 'active')) return null;
    if (!add(segments.archived ?? [], 'archived')) return null;
    if (!add(segments.trash ?? [], 'deleted')) return null;
    return placements;
}

function expectedPlacement(kind: LawsuitLifecycleMutationKind): Placement | null {
    if (kind === 'trash') return 'deleted';
    if (kind === 'archive') return 'archived';
    if (kind === 'restore-trash' || kind === 'restore-archive') return 'active';
    return null;
}

function validateTransition(
    previous: LawsuitFileSegments,
    next: LawsuitFileSegments,
    kind: LawsuitLifecycleMutationKind,
    ids: readonly string[],
): boolean {
    const before = placementMap(previous);
    const after = placementMap(next);
    if (!before || !after) return false;
    const targetIds = new Set(ids);
    const expected = expectedPlacement(kind);

    for (const id of targetIds) {
        if (!before.has(id)) return false;
        if (expected === null) {
            if (after.has(id)) return false;
        } else if (after.get(id) !== expected) {
            return false;
        }
    }

    for (const [id, placement] of before) {
        if (targetIds.has(id)) continue;
        if (after.get(id) !== placement) return false;
    }
    for (const id of after.keys()) {
        if (!targetIds.has(id) && !before.has(id)) return false;
    }
    return true;
}

function filterPendingRows(ids: ReadonlySet<string>): unknown[] {
    return readArray(LAWSUIT_PENDING_CREATES_KEY).filter((row) => {
        if (!row || typeof row !== 'object') return false;
        return !ids.has(String((row as { id?: unknown }).id ?? ''));
    });
}

function filterJournalRows(ids: ReadonlySet<string>): unknown[] {
    return readArray(LAWSUIT_WRITE_JOURNAL_KEY).filter((row) => {
        if (!row || typeof row !== 'object') return false;
        return !ids.has(String((row as { fileId?: unknown }).fileId ?? ''));
    });
}

function nextTombstones(
    kind: LawsuitLifecycleMutationKind,
    ids: readonly string[],
): string[] | null {
    if (kind !== 'permanent-delete' && kind !== 'restore-trash' && kind !== 'restore-archive') {
        return null;
    }
    const set = new Set(readArray(LAWSUIT_DOSSIER_TOMBSTONES_KEY).map(String).filter(Boolean));
    if (kind === 'permanent-delete') {
        for (const id of ids) set.add(id);
    } else {
        for (const id of ids) set.delete(id);
    }
    return [...set];
}

function canOverwriteLifecycleKey(key: string): boolean {
    return !(SecureStoreService.hasItemSync(key) && SecureStoreService.isUnreadSync(key));
}

function arrayWrite(key: string, rows: unknown[]): SecureStoreAtomicWrite {
    return {
        key,
        value: JSON.stringify(rows),
        options: {
            allowShrink: true,
            allowVerifiedEmptyOverwrite: rows.length === 0,
        },
    };
}

function pushOptionalWrite(writes: SecureStoreAtomicWrite[], write: SecureStoreAtomicWrite): void {
    if (!canOverwriteLifecycleKey(write.key)) return;
    writes.push(write);
}

function buildAtomicWrites(
    next: LawsuitFileSegments,
    kind: LawsuitLifecycleMutationKind,
    ids: readonly string[],
): SecureStoreAtomicWrite[] {
    const archived = next.archived ?? [];
    const trash = next.trash ?? [];
    const index = buildLawsuitLifecycleIndex(next.active, archived, trash);
    const idSet = new Set(ids);
    const merged = [...next.active, ...archived, ...trash];
    const writes: SecureStoreAtomicWrite[] = [
        arrayWrite(LAWSUIT_FILES_ACTIVE_KEY, next.active),
        arrayWrite(LAWSUIT_FILES_ARCHIVED_KEY, archived),
        arrayWrite(LAWSUIT_FILES_TRASH_KEY, trash),
        {
            key: LAWSUIT_FILES_INDEX_KEY,
            value: JSON.stringify(index),
            options: { allowShrink: true },
        },
        arrayWrite(LAWSUIT_FILES_STORAGE_KEY, merged),
    ];
    for (const legacyKey of LAWSUIT_FILES_STORAGE_KEYS_LEGACY) {
        pushOptionalWrite(writes, arrayWrite(legacyKey, merged));
    }
    pushOptionalWrite(writes, arrayWrite(LAWSUIT_PENDING_CREATES_KEY, filterPendingRows(idSet)));
    pushOptionalWrite(writes, arrayWrite(LAWSUIT_WRITE_JOURNAL_KEY, filterJournalRows(idSet)));
    const tombstones = nextTombstones(kind, ids);
    if (tombstones) {
        writes.push(arrayWrite(LAWSUIT_DOSSIER_TOMBSTONES_KEY, tombstones));
    }
    return writes;
}

async function verifyAtomicWrites(writes: readonly SecureStoreAtomicWrite[]): Promise<boolean> {
    for (const write of writes) {
        let disk: string | null = null;
        for (let attempt = 0; attempt < 8; attempt += 1) {
            disk = await SecureStoreService.getItemFromDisk(write.key);
            if (disk === write.value) break;
            if (disk != null) {
                try {
                    if (JSON.stringify(JSON.parse(disk)) === JSON.stringify(JSON.parse(write.value))) {
                        break;
                    }
                } catch {
                    /* مقارنة نصية أدناه */
                }
            }
            await new Promise<void>((resolve) => {
                setTimeout(resolve, 25);
            });
        }
        if (disk !== write.value) {
            let parsedMatch = false;
            if (disk != null) {
                try {
                    parsedMatch =
                        JSON.stringify(JSON.parse(disk)) === JSON.stringify(JSON.parse(write.value));
                } catch {
                    parsedMatch = false;
                }
            }
            if (parsedMatch) continue;
            const raw = await SecureStoreService.peekRawFromDisk(write.key);
            const keyState = CryptoService.probeKeyState();
            let decryptErr = '';
            if (
                raw != null &&
                raw.startsWith('hami_enc_v2:') &&
                CryptoService.hasMasterKey()
            ) {
                try {
                    const plain = await CryptoService.decryptData(raw.slice('hami_enc_v2:'.length));
                    decryptErr = `direct=${plain.length}`;
                } catch (error) {
                    decryptErr =
                        error instanceof Error
                            ? `${error.name}:${error.message.slice(0, 48)}`
                            : 'decrypt';
                }
            }
            recordLawsuitLifecycleE2e('tx-verify-mismatch', {
                kind: undefined,
                ids: write.key,
                extra: `disk=${disk == null ? 'null' : String(disk.length)},want=${write.value.length},raw=${raw == null ? 'null' : `${raw.length}:${raw.slice(0, 12)}`},has=${keyState.has ? 1 : 0},pin=${keyState.pin},bits=${keyState.bits},bound=${keyState.bound || 'empty'},${decryptErr}`,
            });
            return false;
        }
    }
    return true;
}

function tombstoneKeysForKind(kind: LawsuitLifecycleMutationKind): readonly string[] {
    if (kind === 'permanent-delete' || kind === 'restore-trash' || kind === 'restore-archive') {
        return [LAWSUIT_DOSSIER_TOMBSTONES_KEY];
    }
    return [];
}

async function warmLifecycleKeys(kind: LawsuitLifecycleMutationKind): Promise<boolean> {
    const extraRead = tombstoneKeysForKind(kind);
    try {
        await SecureStoreService.ensureLawsuitKeysReady();
        await SecureStoreService.warmKeys([...LIFECYCLE_KEYS]);
        for (const key of [...SEGMENT_KEYS, ...extraRead]) {
            if (SecureStoreService.hasItemSync(key) && SecureStoreService.isUnreadSync(key)) {
                await SecureStoreService.getItem(key);
            }
        }
    } catch {
        return false;
    }
    const required: readonly string[] =
        kind === 'restore-trash' || kind === 'permanent-delete'
            ? [LAWSUIT_FILES_TRASH_KEY]
            : kind === 'restore-archive'
              ? [LAWSUIT_FILES_ARCHIVED_KEY]
              : [LAWSUIT_FILES_ACTIVE_KEY];
    const blocked = [...required, ...extraRead].filter(
        (key) => SecureStoreService.hasItemSync(key) && SecureStoreService.isUnreadSync(key),
    );
    if (blocked.length === 0) return true;
    recordLawsuitLifecycleE2e('tx-unread', {
        kind,
        extra: blocked.join(','),
    });
    return false;
}

/**
 * العقد الوحيد لعمليات سلة/أرشيف/استعادة/حذف نهائي:
 * hydrate → انتقال نقي → تحقق invariant → COMMIT ذري → تحقق من القرص.
 */
export async function executeLawsuitLifecycleTransaction(
    current: LawsuitFileSegments,
    kind: LawsuitLifecycleMutationKind,
    requestedIds: readonly (string | number)[],
): Promise<LawsuitLifecycleTransactionResult> {
    const ids = uniqueIds(requestedIds);
    if (ids.length === 0) return { ok: false, reason: 'not-found' };
    recordLawsuitLifecycleE2e('tx-start', { kind, ids: ids.join(',') });
    SecureStoreService.acquireAtomicWriteBarriers(LIFECYCLE_KEYS);
    let masterKeyPinned = false;
    try {
        if (!(await warmLifecycleKeys(kind))) {
            return { ok: false, reason: 'unread' };
        }

        const previous = canonicalizeCurrent(current);
        const transitioned = applyTransition(previous, kind, ids);
        const next: LawsuitFileSegments = {
            active: transitioned.active,
            archived: transitioned.archived ?? [],
            trash: transitioned.trash ?? [],
            index: buildLawsuitLifecycleIndex(
                transitioned.active,
                transitioned.archived ?? [],
                transitioned.trash ?? [],
            ),
        };
        if (!validateTransition(previous, next, kind, ids)) {
            const reason = ids.some((id) => placementMap(previous)?.has(id))
                ? 'invalid-transition'
                : 'not-found';
            recordLawsuitLifecycleE2e('tx-validate', {
                kind,
                reason,
                ids: ids.join(','),
                extra: `active=${previous.active.length},trash=${previous.trash?.length ?? 0}`,
            });
            return { ok: false, reason };
        }

        /*
         * أزل pending/WAL من الذاكرة قبل بناء الكتابات حتى لا تُحذف مفاتيح
         * اختيارية بعد أن تُكتب [] في COMMIT.
         */
        if (kind === 'trash' || kind === 'archive' || kind === 'permanent-delete') {
            pruneLawsuitDurabilityOverlaysForFileIds(ids);
        }

        const writes = buildAtomicWrites(next, kind, ids);
        const required = writes.filter((write) =>
            (REQUIRED_KEYS as readonly string[]).includes(write.key),
        );
        const optional = writes.filter(
            (write) => !(REQUIRED_KEYS as readonly string[]).includes(write.key),
        );
        /*
         * ألغِ مؤقتات الكاتب القديم قبل COMMIT؛ وإلا قد يصل payload سابق بعد
         * المعاملة. لا نغيّر قرصاً هنا، فقط كاش LocalStorageRepository.
         */
        for (const write of writes) {
            persistenceRepository.synchronizeExternalWrite(
                write.key,
                readSecureOrDrainLegacySync(write.key),
            );
        }

        try {
            if (!CryptoService.hasMasterKey()) {
                await CryptoService.initialize();
            }
            if (!CryptoService.hasMasterKey()) {
                recordLawsuitLifecycleE2e('tx-crypto', { kind, ids: ids.join(',') });
                return { ok: false, reason: 'write-failed' };
            }
            CryptoService.pinMasterKeyForAtomicWrite();
            masterKeyPinned = true;
            await SecureStoreService.setItemsAtomically(required);
        } catch (error) {
            recordLawsuitLifecycleE2e('tx-write-failed', {
                kind,
                ids: ids.join(','),
                extra:
                    error instanceof Error
                        ? `${error.message}${error.cause != null ? ` | ${String(error.cause)}` : ''}`
                        : 'write',
            });
            return { ok: false, reason: 'write-failed' };
        }

        for (const write of required) {
            persistenceRepository.synchronizeExternalWrite(write.key, write.value);
            clearLegacyPlaintextMirror(write.key);
        }
        if (!(await verifyAtomicWrites(required))) {
            recordLawsuitLifecycleE2e('tx-verify-failed', { kind, ids: ids.join(',') });
            return { ok: false, reason: 'verify-failed' };
        }

        if (optional.length > 0) {
            for (const write of optional) {
                try {
                    await SecureStoreService.setItemsAtomically([write]);
                    persistenceRepository.synchronizeExternalWrite(write.key, write.value);
                    clearLegacyPlaintextMirror(write.key);
                } catch {
                    recordLawsuitLifecycleE2e('tx-optional-skipped', {
                        kind,
                        ids: ids.join(','),
                        extra: write.key,
                    });
                }
            }
        }
        recordLawsuitLifecycleE2e('tx-ok', { kind, ids: ids.join(',') });
        return { ok: true, next };
    } finally {
        if (masterKeyPinned) CryptoService.unpinMasterKeyForAtomicWrite();
        SecureStoreService.releaseAtomicWriteBarriers();
    }
}
