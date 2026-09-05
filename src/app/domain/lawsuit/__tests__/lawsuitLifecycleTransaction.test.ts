import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { CryptoService } from '@/app/services/CryptoService';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_TRASH_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import { LAWSUIT_DOSSIER_TOMBSTONES_KEY } from '@/app/utils/lawsuitDossierTombstones';
import { LAWSUIT_WRITE_JOURNAL_KEY } from '@/app/domain/lawsuit/lawsuitWriteJournal';
import { LAWSUIT_PENDING_CREATES_KEY } from '@/app/domain/lawsuit/lawsuitPendingCreateStore';
import { buildLawsuitLifecycleIndex } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import { executeLawsuitLifecycleTransaction } from '@/app/domain/lawsuit/lawsuitLifecycleTransaction';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import type { LawsuitFileSegments } from '@/app/domain/lawsuit/lawsuitFileSegments';

function file(id: number, status: FileData['status'] = 'active'): FileData {
    return {
        id,
        type: 'lawsuit',
        status,
        caseNo: `2026/ب/${id}`,
        court: 'بداءة الكرخ',
        date: '2026-01-01',
        parties: [],
        history: [],
        notes: [],
        images: [],
    };
}

function segments(active: FileData[], archived: FileData[] = [], trash: FileData[] = []): LawsuitFileSegments {
    return {
        active,
        archived,
        trash,
        index: buildLawsuitLifecycleIndex(active, archived, trash),
    };
}

async function readDiskArray(key: string): Promise<Array<{ id?: string | number; status?: string }>> {
    return JSON.parse(String(await SecureStoreService.getItemFromDisk(key))) as Array<{
        id?: string | number;
        status?: string;
    }>;
}

describe('lawsuit lifecycle atomic transaction', () => {
    beforeEach(async () => {
        await SecureStoreService.waitForAllPendingPersist();
        for (const key of SecureStoreService.listKeysSync()) {
            await SecureStoreService.deleteItem(key);
        }
    });

    it('commits active → trash as one disk state and survives cold reload', async () => {
        const first = file(1);
        const second = file(2);
        const current = segments([first, second]);
        await SecureStoreService.setItemsAtomically([
            { key: LAWSUIT_FILES_ACTIVE_KEY, value: JSON.stringify(current.active) },
            { key: LAWSUIT_FILES_ARCHIVED_KEY, value: '[]' },
            { key: LAWSUIT_FILES_TRASH_KEY, value: '[]' },
            { key: LAWSUIT_FILES_INDEX_KEY, value: JSON.stringify(current.index) },
            { key: LAWSUIT_FILES_STORAGE_KEY, value: JSON.stringify(current.active) },
        ]);

        const result = await executeLawsuitLifecycleTransaction(current, 'trash', [1]);

        expect(result).toMatchObject({ ok: true });
        expect((await readDiskArray(LAWSUIT_FILES_ACTIVE_KEY)).map((row) => row.id)).toEqual([2]);
        expect(await readDiskArray(LAWSUIT_FILES_TRASH_KEY)).toEqual([
            expect.objectContaining({ id: 1, status: 'deleted' }),
        ]);
        expect(await readDiskArray(LAWSUIT_PENDING_CREATES_KEY)).toEqual([]);
        expect(await readDiskArray(LAWSUIT_WRITE_JOURNAL_KEY)).toEqual([]);

        SecureStoreService.clearDecryptedMemoryCache();
        expect((await readDiskArray(LAWSUIT_FILES_ACTIVE_KEY)).map((row) => row.id)).toEqual([2]);
        expect((await readDiskArray(LAWSUIT_FILES_TRASH_KEY)).map((row) => row.id)).toEqual([1]);
    });

    it('does not re-initialize crypto during COMMIT when a master key is already in memory', async () => {
        const first = file(1);
        const current = segments([first]);
        await SecureStoreService.setItemsAtomically([
            { key: LAWSUIT_FILES_ACTIVE_KEY, value: JSON.stringify(current.active) },
            { key: LAWSUIT_FILES_ARCHIVED_KEY, value: '[]' },
            { key: LAWSUIT_FILES_TRASH_KEY, value: '[]' },
            { key: LAWSUIT_FILES_INDEX_KEY, value: JSON.stringify(current.index) },
        ]);
        const initialize = vi.spyOn(CryptoService, 'initialize');
        initialize.mockClear();
        const result = await executeLawsuitLifecycleTransaction(current, 'trash', [1]);
        expect(result).toMatchObject({ ok: true });
        expect(initialize).not.toHaveBeenCalled();
        initialize.mockRestore();
    });

    it('restores from trash after cold cache when encrypted active is empty', async () => {
        const first = file(1);
        const current = segments([first]);
        await SecureStoreService.setItemsAtomically([
            { key: LAWSUIT_FILES_ACTIVE_KEY, value: JSON.stringify(current.active) },
            { key: LAWSUIT_FILES_ARCHIVED_KEY, value: '[]' },
            { key: LAWSUIT_FILES_TRASH_KEY, value: '[]' },
            { key: LAWSUIT_FILES_INDEX_KEY, value: JSON.stringify(current.index) },
        ]);
        const trashed = await executeLawsuitLifecycleTransaction(current, 'trash', [1]);
        expect(trashed).toMatchObject({ ok: true });
        expect(trashed.next).toBeTruthy();

        SecureStoreService.clearDecryptedMemoryCache();
        SecureStoreService.dropMemoryMirrorsForTests();

        const restored = await executeLawsuitLifecycleTransaction(trashed.next!, 'restore-trash', [1]);
        expect(restored).toMatchObject({ ok: true });
        expect((await readDiskArray(LAWSUIT_FILES_ACTIVE_KEY)).map((row) => row.id)).toEqual([1]);
        expect((await readDiskArray(LAWSUIT_FILES_TRASH_KEY)).map((row) => row.id)).toEqual([]);
    });

    it('drops overlapping setItemSync so autosave cannot restore active after trash COMMIT', async () => {
        const first = file(1);
        const second = file(2);
        const current = segments([first, second]);
        await SecureStoreService.setItemsAtomically([
            { key: LAWSUIT_FILES_ACTIVE_KEY, value: JSON.stringify(current.active) },
            { key: LAWSUIT_FILES_ARCHIVED_KEY, value: '[]' },
            { key: LAWSUIT_FILES_TRASH_KEY, value: '[]' },
            { key: LAWSUIT_FILES_INDEX_KEY, value: JSON.stringify(current.index) },
        ]);

        const commit = executeLawsuitLifecycleTransaction(current, 'trash', [1]);
        await Promise.resolve();
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_ACTIVE_KEY,
            JSON.stringify(current.active),
        );
        const result = await commit;

        expect(result).toMatchObject({ ok: true });
        expect((await readDiskArray(LAWSUIT_FILES_ACTIVE_KEY)).map((row) => row.id)).toEqual([2]);
        expect((await readDiskArray(LAWSUIT_FILES_TRASH_KEY)).map((row) => row.id)).toEqual([1]);
    });

    it('drops overlapping setItem so a late IDB put cannot restore active after trash COMMIT', async () => {
        const first = file(1);
        const second = file(2);
        const current = segments([first, second]);
        await SecureStoreService.setItemsAtomically([
            { key: LAWSUIT_FILES_ACTIVE_KEY, value: JSON.stringify(current.active) },
            { key: LAWSUIT_FILES_ARCHIVED_KEY, value: '[]' },
            { key: LAWSUIT_FILES_TRASH_KEY, value: '[]' },
            { key: LAWSUIT_FILES_INDEX_KEY, value: JSON.stringify(current.index) },
        ]);

        const commit = executeLawsuitLifecycleTransaction(current, 'trash', [1]);
        const stale = SecureStoreService.setItem(
            LAWSUIT_FILES_ACTIVE_KEY,
            JSON.stringify(current.active),
            { allowShrink: true },
        );
        const result = await commit;
        await stale;

        expect(result).toMatchObject({ ok: true });
        expect((await readDiskArray(LAWSUIT_FILES_ACTIVE_KEY)).map((row) => row.id)).toEqual([2]);
        expect((await readDiskArray(LAWSUIT_FILES_TRASH_KEY)).map((row) => row.id)).toEqual([1]);
    });

    it('removes stale pending/WAL copies so a trashed dossier cannot resurrect', async () => {
        const first = file(1);
        const current = segments([first]);
        await SecureStoreService.setItemsAtomically([
            { key: LAWSUIT_FILES_ACTIVE_KEY, value: JSON.stringify([first]) },
            { key: LAWSUIT_FILES_ARCHIVED_KEY, value: '[]' },
            { key: LAWSUIT_FILES_TRASH_KEY, value: '[]' },
            { key: LAWSUIT_PENDING_CREATES_KEY, value: JSON.stringify([first]) },
            {
                key: LAWSUIT_WRITE_JOURNAL_KEY,
                value: JSON.stringify([{ v: 1, fileId: '1', file: first, ts: Date.now() }]),
            },
        ]);

        const result = await executeLawsuitLifecycleTransaction(current, 'trash', [1]);

        expect(result.ok).toBe(true);
        expect(await readDiskArray(LAWSUIT_FILES_ACTIVE_KEY)).toEqual([]);
        expect(await readDiskArray(LAWSUIT_PENDING_CREATES_KEY)).toEqual([]);
        expect(await readDiskArray(LAWSUIT_WRITE_JOURNAL_KEY)).toEqual([]);
    });

    it('commits tombstone and removal in the same permanent-delete transaction', async () => {
        const trashed = { ...file(1), status: 'deleted' as const, deletedAt: Date.now() };
        const current = segments([], [], [trashed]);
        await SecureStoreService.setItemsAtomically([
            { key: LAWSUIT_FILES_ACTIVE_KEY, value: '[]' },
            { key: LAWSUIT_FILES_ARCHIVED_KEY, value: '[]' },
            { key: LAWSUIT_FILES_TRASH_KEY, value: JSON.stringify([trashed]) },
            { key: LAWSUIT_DOSSIER_TOMBSTONES_KEY, value: '[]' },
        ]);

        const result = await executeLawsuitLifecycleTransaction(
            current,
            'permanent-delete',
            [1],
        );

        expect(result.ok).toBe(true);
        expect(await readDiskArray(LAWSUIT_FILES_ACTIVE_KEY)).toEqual([]);
        expect(await readDiskArray(LAWSUIT_FILES_ARCHIVED_KEY)).toEqual([]);
        expect(await readDiskArray(LAWSUIT_FILES_TRASH_KEY)).toEqual([]);
        expect(await readDiskArray(LAWSUIT_FILES_STORAGE_KEY)).toEqual([]);
        expect(await readDiskArray(LAWSUIT_DOSSIER_TOMBSTONES_KEY)).toEqual(['1']);

        await SecureStoreService.setItem(
            'lawsuitFiles',
            JSON.stringify([{ id: 1, status: 'deleted' }]),
        );
        const { loadLawsuitFilesRaw } = await import('@/app/utils/lawsuitFilesStorage');
        expect(loadLawsuitFilesRaw()).toEqual([]);
        expect(await readDiskArray(LAWSUIT_FILES_STORAGE_KEY)).toEqual([]);
    });

    it('refuses permanent-delete when tombstones stay unread', async () => {
        const trashed = { ...file(1), status: 'deleted' as const, deletedAt: Date.now() };
        const current = segments([], [], [trashed]);
        await SecureStoreService.setItemsAtomically([
            { key: LAWSUIT_FILES_ACTIVE_KEY, value: '[]' },
            { key: LAWSUIT_FILES_ARCHIVED_KEY, value: '[]' },
            { key: LAWSUIT_FILES_TRASH_KEY, value: JSON.stringify([trashed]) },
            { key: LAWSUIT_DOSSIER_TOMBSTONES_KEY, value: JSON.stringify(['keep-me']) },
        ]);
        const originalUnread = SecureStoreService.isUnreadSync.bind(SecureStoreService);
        const originalHas = SecureStoreService.hasItemSync.bind(SecureStoreService);
        vi.spyOn(SecureStoreService, 'hasItemSync').mockImplementation((key: string) => {
            if (key === LAWSUIT_DOSSIER_TOMBSTONES_KEY) return true;
            return originalHas(key);
        });
        vi.spyOn(SecureStoreService, 'isUnreadSync').mockImplementation((key: string) => {
            if (key === LAWSUIT_DOSSIER_TOMBSTONES_KEY) return true;
            return originalUnread(key);
        });

        try {
            const result = await executeLawsuitLifecycleTransaction(
                current,
                'permanent-delete',
                [1],
            );
            expect(result).toMatchObject({ ok: false, reason: 'unread' });
            expect(await readDiskArray(LAWSUIT_DOSSIER_TOMBSTONES_KEY)).toEqual(['keep-me']);
            expect(await readDiskArray(LAWSUIT_FILES_TRASH_KEY)).toEqual([
                expect.objectContaining({ id: 1 }),
            ]);
        } finally {
            vi.restoreAllMocks();
        }
    });

    it('drops a stale tombstone wipe that waited on the atomic barrier', async () => {
        await SecureStoreService.setItemsAtomically([
            {
                key: LAWSUIT_DOSSIER_TOMBSTONES_KEY,
                value: JSON.stringify(['keep-me']),
            },
        ]);
        SecureStoreService.acquireAtomicWriteBarriers([LAWSUIT_DOSSIER_TOMBSTONES_KEY]);
        const stale = SecureStoreService.setItem(LAWSUIT_DOSSIER_TOMBSTONES_KEY, '[]');
        await SecureStoreService.setItemsAtomically([
            {
                key: LAWSUIT_DOSSIER_TOMBSTONES_KEY,
                value: JSON.stringify(['keep-me', '1']),
                options: { allowShrink: true },
            },
        ]);
        SecureStoreService.releaseAtomicWriteBarriers();
        await stale;
        expect(await readDiskArray(LAWSUIT_DOSSIER_TOMBSTONES_KEY)).toEqual(['keep-me', '1']);
    });

    it('does not advance the returned state when the atomic COMMIT fails', async () => {
        const first = file(1);
        const current = segments([first]);
        await SecureStoreService.setItem(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([first]));
        const atomic = vi
            .spyOn(SecureStoreService, 'setItemsAtomically')
            .mockRejectedValueOnce(new Error('quota'));

        const result = await executeLawsuitLifecycleTransaction(current, 'trash', [1]);

        expect(result).toMatchObject({ ok: false, reason: 'write-failed' });
        expect((await readDiskArray(LAWSUIT_FILES_ACTIVE_KEY)).map((row) => row.id)).toEqual([1]);
        atomic.mockRestore();
    });

    it('commits trash when overlay keys stay unread', async () => {
        const first = file(1);
        const current = segments([first]);
        await SecureStoreService.setItemsAtomically([
            { key: LAWSUIT_FILES_ACTIVE_KEY, value: JSON.stringify(current.active) },
            { key: LAWSUIT_FILES_ARCHIVED_KEY, value: '[]' },
            { key: LAWSUIT_FILES_TRASH_KEY, value: '[]' },
            { key: LAWSUIT_FILES_INDEX_KEY, value: JSON.stringify(current.index) },
        ]);
        const originalUnread = SecureStoreService.isUnreadSync.bind(SecureStoreService);
        const originalHas = SecureStoreService.hasItemSync.bind(SecureStoreService);
        const overlayKeys = new Set([
            LAWSUIT_WRITE_JOURNAL_KEY,
            LAWSUIT_PENDING_CREATES_KEY,
            LAWSUIT_FILES_STORAGE_KEY,
            LAWSUIT_DOSSIER_TOMBSTONES_KEY,
        ]);
        vi.spyOn(SecureStoreService, 'hasItemSync').mockImplementation((key: string) => {
            if (overlayKeys.has(key)) return true;
            return originalHas(key);
        });
        vi.spyOn(SecureStoreService, 'isUnreadSync').mockImplementation((key: string) => {
            if (overlayKeys.has(key)) return true;
            return originalUnread(key);
        });

        try {
            const result = await executeLawsuitLifecycleTransaction(current, 'trash', [1]);
            expect(result).toMatchObject({ ok: true });
            expect((await readDiskArray(LAWSUIT_FILES_ACTIVE_KEY)).map((row) => row.id)).toEqual([]);
            expect(await readDiskArray(LAWSUIT_FILES_TRASH_KEY)).toEqual([
                expect.objectContaining({ id: 1, status: 'deleted' }),
            ]);
        } finally {
            vi.restoreAllMocks();
        }
    });
});
