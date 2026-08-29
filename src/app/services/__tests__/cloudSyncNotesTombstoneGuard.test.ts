import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    markGlobalNoteDeleted,
    resetGlobalNotesTombstonesForTests,
} from '@/app/services/notes/globalNotesTombstones';
import SecureStoreService from '@/app/services/SecureStoreService';

const getGlobalNotes = vi.fn();
const save = vi.fn();
const loadAsync = vi.fn();

vi.mock('@/app/services/SupabaseService', () => ({
    SupabaseService: {
        checkUserAuth: () => Promise.resolve(true),
        getGlobalNotes: () => getGlobalNotes(),
        saveGlobalNote: vi.fn(async () => 'saved'),
        deleteGlobalNote: vi.fn(async () => undefined),
    },
}));

vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
    persistenceRepository: {
        save: (key: string, value: unknown) => save(key, value),
        loadAsync: (key: string) => loadAsync(key),
        load: () => null,
        remove: () => undefined,
    },
}));

vi.mock('@/app/services/settings/localOnlyGuard', () => ({
    isLocalOnlyModeEnabled: vi.fn(() => false),
}));

vi.mock('@/app/services/realtimeSyncGate', () => ({
    isCloudPollingPausedByRealtime: vi.fn(() => false),
}));

vi.mock('@/app/services/settings/lawyerWorkCloudGate', () => ({
    isLawyerWorkCloudLive: () => true,
    isWorkLocalKvMaterial: () => false,
}));

vi.mock('@/app/services/settings/cloudSyncBucket', () => ({
    isLiveCloudSyncBucketEnabled: () => true,
    isCloudSyncBucketEnabled: () => true,
}));

describe('cloud sync notes tombstone guard', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_ENABLE_CLOUD_SYNC', 'true');
        getGlobalNotes.mockReset();
        save.mockReset();
        loadAsync.mockReset();
        loadAsync.mockResolvedValue([]);
        resetGlobalNotesTombstonesForTests();
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        Object.defineProperty(globalThis.navigator, 'onLine', {
            configurable: true,
            get: () => true,
        });
    });

    async function syncNotesBucket() {
        const { performCloudSyncBucket } = await import('@/app/services/cloudSyncEngine');
        return performCloudSyncBucket('lawyer_notes');
    }

    function savedIds(): string[] {
        const call = save.mock.calls.at(-1);
        const rows = (call?.[1] ?? []) as Array<{ id?: string | number }>;
        return rows.map((r) => String(r?.id ?? ''));
    }

    it('does not resurrect a tombstoned note from cloud rows', async () => {
        markGlobalNoteDeleted('lawyer-1', 'dead-note');
        getGlobalNotes.mockResolvedValue([
            { id: 'dead-note', body: 'gone', updatedAt: '2026-07-30T00:00:00.000Z' },
            { id: 'live-note', body: 'ok', updatedAt: '2026-07-30T00:00:00.000Z' },
        ]);

        const result = await syncNotesBucket();

        expect(result.ok).toBe(true);
        expect(savedIds()).toEqual(['live-note']);
    });

    it('drops a tombstoned note lingering in local storage too', async () => {
        markGlobalNoteDeleted('lawyer-1', 'dead-local');
        getGlobalNotes.mockResolvedValue([]);
        loadAsync.mockResolvedValue([
            { id: 'dead-local', body: 'x' },
            { id: 'live-local', body: 'y' },
        ]);

        await syncNotesBucket();

        expect(savedIds()).toContain('live-local');
        expect(savedIds()).not.toContain('dead-local');
    });

    it('skips merge when deleted-ids ciphertext is unread', async () => {
        SecureStoreService.setItemSync(
            'hami:lawyer-notes:deleted:v1',
            'hami_enc_v2:notes-deleted-cold',
        );
        SecureStoreService.clearDecryptedMemoryCache();
        getGlobalNotes.mockResolvedValue([
            { id: 'cloud-note', body: 'z', updatedAt: '2026-07-30T00:00:00.000Z' },
        ]);

        const result = await syncNotesBucket();

        expect(result.ok).toBe(true);
        expect(result.skipped).toBe(true);
        expect(save).not.toHaveBeenCalled();
    });
});
