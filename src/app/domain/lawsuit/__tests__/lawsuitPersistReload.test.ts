import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileData } from '../lawsuitFileTypes';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import { loadInitialLawsuitFilesAsync } from '@/app/domain/lawsuit/lawsuitFilesRepository';
import {
    lawsuitStorageMayHaveUnreadData,
    migrateLawsuitMonolithicToSegmentsIfNeeded,
} from '@/app/domain/lawsuit/lawsuitSegmentStorage';
import { emptyLawsuitLifecycleIndex } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import { flushLawsuitWorkspacePersist, resetLawsuitCommitSchedulerForTests } from '@/app/domain/lawsuit/lawsuitPersistFlush';
import { clearLawsuitPendingCreatesForTests } from '@/app/domain/lawsuit/lawsuitPendingCreateStore';

vi.mock('@/app/utils/lawsuitFilesStorage', () => ({
    loadLawsuitFilesRaw: vi.fn(() => []),
    saveLawsuitFilesRaw: vi.fn(),
}));

const file = (id: number): FileData => ({
    id,
    type: 'lawsuit',
    status: 'active',
    caseNo: `2026/ب/${id}`,
    court: 'بداءة الكرخ',
    parties: [],
    history: [],
    notes: [],
    images: [],
    date: '2026-01-01',
});

describe('lawsuit persistence reload safety', () => {
    beforeEach(async () => {
        resetLawsuitCommitSchedulerForTests();
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        await SecureStoreService.waitForAllPendingPersist();
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        clearLawsuitPendingCreatesForTests();
        try {
            SecureStoreService.deleteItemSync('hami_lawsuit_write_journal_v1');
        } catch {
            /* ignore */
        }
        localStorage.removeItem('hami_lawsuit_write_journal_v1');
        vi.clearAllMocks();
    });

    it('lawsuitStorageMayHaveUnreadData true when active key is cold encrypted', async () => {
        await SecureStoreService.setItem(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(1)]));
        SecureStoreService.clearDecryptedMemoryCache();
        expect(SecureStoreService.isUnreadSync(LAWSUIT_FILES_ACTIVE_KEY)).toBe(true);
        expect(lawsuitStorageMayHaveUnreadData(emptyLawsuitLifecycleIndex())).toBe(true);
    });

    it('migrate uses monolithic fallback when segments cold but lawyer_files readable', async () => {
        const { loadLawsuitFilesRaw } = await import('@/app/utils/lawsuitFilesStorage');
        await SecureStoreService.setItem(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([]));
        await SecureStoreService.setItem(
            LAWSUIT_FILES_INDEX_KEY,
            JSON.stringify({
                v: 1,
                entries: {},
                counts: { active: 1, archived: 0, trash: 0 },
            }),
        );
        SecureStoreService.clearDecryptedMemoryCache();
        vi.mocked(loadLawsuitFilesRaw).mockReturnValue([file(7)]);

        const boot = migrateLawsuitMonolithicToSegmentsIfNeeded();
        expect(boot.active).toHaveLength(1);
        expect(boot.active[0]?.id).toBe(7);
    });

    it('loadInitialLawsuitFilesAsync awaits ensureLawsuitKeysReady before read', async () => {
        const ready = vi
            .spyOn(SecureStoreService, 'ensureLawsuitKeysReady')
            .mockResolvedValue(undefined);
        const fullReady = vi
            .spyOn(SecureStoreService, 'ensurePersistedReady')
            .mockResolvedValue(undefined);
        SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(3)]));
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_INDEX_KEY,
            JSON.stringify({
                v: 1,
                entries: {},
                counts: { active: 1, archived: 0, trash: 0 },
            }),
        );

        const loaded = await loadInitialLawsuitFilesAsync();
        expect(ready).toHaveBeenCalled();
        expect(loaded).toHaveLength(1);
        expect(loaded[0]?.id).toBe(3);
        expect(fullReady).toHaveBeenCalled();
        ready.mockRestore();
        fullReady.mockRestore();
    });

    it('flushLawsuitWorkspacePersist waits for lawsuit durable keys', async () => {
        SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(5)]));
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_INDEX_KEY,
            JSON.stringify({
                v: 1,
                entries: {},
                counts: { active: 1, archived: 0, trash: 0 },
            }),
        );
        const ok = await flushLawsuitWorkspacePersist();
        expect(ok).toBe(true);
        expect(SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY)).toBeTruthy();
    });

    it('flushLawsuitWorkspacePersist returns false on timeout without hanging', async () => {
        const pending = new Promise<void>(() => undefined);
        const spy = vi
            .spyOn(SecureStoreService, 'waitForPendingSetItem')
            .mockImplementation(() => pending);
        const ok = await flushLawsuitWorkspacePersist(40);
        expect(ok).toBe(false);
        spy.mockRestore();
    });

    it('commitLawsuitWorkspacePersist verifies active file survives clearDecryptedMemoryCache+warm', async () => {
        const { commitLawsuitWorkspacePersist } = await import(
            '@/app/domain/lawsuit/lawsuitPersistFlush'
        );
        const { persistLawsuitActiveSegment, persistLawsuitLifecycleIndex } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        const { buildLawsuitLifecycleIndex } = await import(
            '@/app/domain/lawsuit/lawsuitLifecycleIndex'
        );
        const row = file(42);
        persistLawsuitActiveSegment([row]);
        persistLawsuitLifecycleIndex(buildLawsuitLifecycleIndex([row], [], []));

        const commit = await commitLawsuitWorkspacePersist({
            timeoutMs: 5_000,
            requireActiveFileId: 42,
        });
        expect(commit.ok).toBe(true);

        SecureStoreService.clearDecryptedMemoryCache();
        await SecureStoreService.warmKeys([LAWSUIT_FILES_ACTIVE_KEY, LAWSUIT_FILES_INDEX_KEY]);
        const raw = SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        expect(raw).toBeTruthy();
        expect(JSON.parse(raw!)).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: 42 })]),
        );
    });

    it('setItemSync rejects cold empty overwrite on protected lawsuit key', async () => {
        await SecureStoreService.setItem(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(2)]));
        SecureStoreService.clearDecryptedMemoryCache();
        const ok = SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, '[]');
        expect(ok).toBe(false);
        await SecureStoreService.warmKeys([LAWSUIT_FILES_ACTIVE_KEY]);
        expect(JSON.parse(SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY)!)).toHaveLength(1);
    });

    it('applyLawsuitMonolithicMergeToSegments refuses empty wipe over existing segments', async () => {
        const { applyLawsuitMonolithicMergeToSegments, persistLawsuitActiveSegment, persistLawsuitLifecycleIndex } =
            await import('@/app/domain/lawsuit/lawsuitSegmentStorage');
        const { buildLawsuitLifecycleIndex } = await import(
            '@/app/domain/lawsuit/lawsuitLifecycleIndex'
        );
        persistLawsuitActiveSegment([file(11)]);
        persistLawsuitLifecycleIndex(buildLawsuitLifecycleIndex([file(11)], [], []));

        const result = applyLawsuitMonolithicMergeToSegments([]);
        expect(result.active).toHaveLength(1);
        expect(result.active[0]?.id).toBe(11);
        expect(JSON.parse(SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY)!)).toHaveLength(1);
    });

    it('writeJsonArray does not empty persistence when setItemSync rejects wipe', async () => {
        const { persistLawsuitActiveSegment } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(8)]));
        const rejected = SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, '[]');
        expect(rejected).toBe(false);
        persistLawsuitActiveSegment([]);
        expect(JSON.parse(SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY)!)).toHaveLength(1);
    });

    it('commitLawsuitWorkspacePersist verifies active file survives dropMemoryMirrorsForTests (reload sim)', async () => {
        const { commitLawsuitWorkspacePersist } = await import(
            '@/app/domain/lawsuit/lawsuitPersistFlush'
        );
        const { persistLawsuitActiveSegment, persistLawsuitLifecycleIndex } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        const { buildLawsuitLifecycleIndex } = await import(
            '@/app/domain/lawsuit/lawsuitLifecycleIndex'
        );
        const row = file(99);
        persistLawsuitActiveSegment([row]);
        persistLawsuitLifecycleIndex(buildLawsuitLifecycleIndex([row], [], []));

        const commit = await commitLawsuitWorkspacePersist({
            timeoutMs: 5_000,
            requireActiveFileId: 99,
        });
        expect(commit.ok).toBe(true);

        SecureStoreService.dropMemoryMirrorsForTests([
            LAWSUIT_FILES_ACTIVE_KEY,
            LAWSUIT_FILES_INDEX_KEY,
            LAWSUIT_FILES_STORAGE_KEY,
        ]);
        const fromDisk = await SecureStoreService.getItemFromDisk(LAWSUIT_FILES_ACTIVE_KEY);
        expect(fromDisk).toBeTruthy();
        expect(JSON.parse(fromDisk!)).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: 99 })]),
        );
        await SecureStoreService.warmKeys([LAWSUIT_FILES_ACTIVE_KEY]);
        expect(JSON.parse(SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY)!)).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: 99 })]),
        );
    });

    it('commitLawsuitWorkspacePersist fails when disk verify cannot see required id', async () => {
        const { commitLawsuitWorkspacePersist } = await import(
            '@/app/domain/lawsuit/lawsuitPersistFlush'
        );
        const { persistLawsuitActiveSegment, persistLawsuitLifecycleIndex } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        const { buildLawsuitLifecycleIndex } = await import(
            '@/app/domain/lawsuit/lawsuitLifecycleIndex'
        );
        persistLawsuitActiveSegment([file(7)]);
        persistLawsuitLifecycleIndex(buildLawsuitLifecycleIndex([file(7)], [], []));
        await flushLawsuitWorkspacePersist(5_000);

        const spy = vi
            .spyOn(SecureStoreService, 'getItemFromDisk')
            .mockResolvedValue(JSON.stringify([file(1)]));
        const commit = await commitLawsuitWorkspacePersist({
            timeoutMs: 2_000,
            requireActiveFileId: 7,
        });
        expect(commit.ok).toBe(false);
        expect(
            commit.reason === 'verify-failed'
                || commit.reason === 'write-failed'
                || commit.reason === 'timeout',
        ).toBe(true);
        spy.mockRestore();
    });

    it('setItemSync refuses to poison memory with [] when protected key absent from mirror', () => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        const ok = SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, '[]');
        expect(ok).toBe(false);
        expect(SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY)).toBeNull();
    });

    it('setItem prefers disk data over poisoned empty memory mirror', async () => {
        await SecureStoreService.setItem(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(55)]));
        await flushLawsuitWorkspacePersist(5_000);

        SecureStoreService.dropMemoryMirrorsForTests([LAWSUIT_FILES_ACTIVE_KEY]);
        SecureStoreService.poisonMemoryMirrorForTests(LAWSUIT_FILES_ACTIVE_KEY, '[]');

        await SecureStoreService.setItem(LAWSUIT_FILES_ACTIVE_KEY, '[]');
        await flushLawsuitWorkspacePersist(5_000);
        const surviving = await SecureStoreService.getItemFromDisk(LAWSUIT_FILES_ACTIVE_KEY);
        expect(surviving).toBeTruthy();
        expect(JSON.parse(surviving!)).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: 55 })]),
        );
    });

    it('awaitLawsuitWorkspaceCommit cancels debounce and verifies disk', async () => {
        const {
            scheduleLawsuitWorkspaceCommit,
            awaitLawsuitWorkspaceCommit,
        } = await import('@/app/domain/lawsuit/lawsuitPersistFlush');
        const { persistLawsuitActiveSegment, persistLawsuitLifecycleIndex } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        const { buildLawsuitLifecycleIndex } = await import(
            '@/app/domain/lawsuit/lawsuitLifecycleIndex'
        );
        persistLawsuitActiveSegment([file(77)]);
        persistLawsuitLifecycleIndex(buildLawsuitLifecycleIndex([file(77)], [], []));
        scheduleLawsuitWorkspaceCommit({ requireActiveFileId: 77, debounceMs: 60_000 });
        const commit = await awaitLawsuitWorkspaceCommit({
            timeoutMs: 5_000,
            requireActiveFileId: 77,
        });
        expect(commit.ok).toBe(true);
        SecureStoreService.dropMemoryMirrorsForTests([LAWSUIT_FILES_ACTIVE_KEY]);
        const disk = await SecureStoreService.getItemFromDisk(LAWSUIT_FILES_ACTIVE_KEY);
        expect(JSON.parse(disk!)).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: 77 })]),
        );
    });

    it('commit without requireId does not soft-succeed when disk still has payload after memory drop', async () => {
        const { commitLawsuitWorkspacePersist } = await import(
            '@/app/domain/lawsuit/lawsuitPersistFlush'
        );
        const { persistLawsuitActiveSegment, persistLawsuitLifecycleIndex } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        const { buildLawsuitLifecycleIndex } = await import(
            '@/app/domain/lawsuit/lawsuitLifecycleIndex'
        );
        persistLawsuitActiveSegment([file(88)]);
        persistLawsuitLifecycleIndex(buildLawsuitLifecycleIndex([file(88)], [], []));
        await flushLawsuitWorkspacePersist(5_000);
        SecureStoreService.dropMemoryMirrorsForTests([
            LAWSUIT_FILES_ACTIVE_KEY,
            LAWSUIT_FILES_INDEX_KEY,
            LAWSUIT_FILES_STORAGE_KEY,
            LAWSUIT_FILES_ARCHIVED_KEY,
        ]);
        const commit = await commitLawsuitWorkspacePersist({ timeoutMs: 5_000 });
        expect(commit.ok).toBe(true);
        const disk = await SecureStoreService.getItemFromDisk(LAWSUIT_FILES_ACTIVE_KEY);
        expect(JSON.parse(disk!)).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: 88 })]),
        );
    });

    it('archive last active file empties active segment on disk via verified empty', async () => {
        const { applyLawsuitArchiveSegments } = await import(
            '@/app/domain/lawsuit/lawsuitFilesSegmentMutations'
        );
        const { awaitLawsuitWorkspaceCommit } = await import(
            '@/app/domain/lawsuit/lawsuitPersistFlush'
        );
        const { buildLawsuitLifecycleIndex } = await import(
            '@/app/domain/lawsuit/lawsuitLifecycleIndex'
        );
        const { persistLawsuitActiveSegment, persistLawsuitLifecycleIndex } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        const row = file(12);
        persistLawsuitActiveSegment([row]);
        persistLawsuitLifecycleIndex(buildLawsuitLifecycleIndex([row], [], []));
        await awaitLawsuitWorkspaceCommit({ timeoutMs: 5_000, requireActiveFileId: 12 });

        const next = applyLawsuitArchiveSegments(
            {
                active: [row],
                archived: [],
                trash: [],
                index: buildLawsuitLifecycleIndex([row], [], []),
            },
            12,
        );
        expect(next.active).toHaveLength(0);
        expect(next.archived).toHaveLength(1);
        const commit = await awaitLawsuitWorkspaceCommit({ timeoutMs: 5_000 });
        expect(commit.ok).toBe(true);
        SecureStoreService.dropMemoryMirrorsForTests([
            LAWSUIT_FILES_ACTIVE_KEY,
            LAWSUIT_FILES_ARCHIVED_KEY,
        ]);
        const diskActive = await SecureStoreService.getItemFromDisk(LAWSUIT_FILES_ACTIVE_KEY);
        const diskArchived = await SecureStoreService.getItemFromDisk(LAWSUIT_FILES_ARCHIVED_KEY);
        expect(JSON.parse(diskActive ?? '[]')).toHaveLength(0);
        expect(JSON.parse(diskArchived!)).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: 12 })]),
        );
    });
});
