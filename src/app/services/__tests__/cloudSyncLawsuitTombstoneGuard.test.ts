import { describe, expect, it, vi, beforeEach } from 'vitest';

import { markLawsuitDossierTombstone } from '@/app/utils/lawsuitDossierTombstones';
import SecureStoreService from '@/app/services/SecureStoreService';

const getLawsuitFiles = vi.fn();
const save = vi.fn();
const loadAsync = vi.fn();

vi.mock('@/app/services/SupabaseService', () => ({
    SupabaseService: {
        checkUserAuth: () => Promise.resolve(true),
        getLawsuitFiles: () => getLawsuitFiles(),
        saveLawsuitFile: vi.fn(async () => 'saved'),
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

vi.mock('@/app/services/SecureStoreService', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/SecureStoreService')>();
    return { default: actual.default };
});

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

describe('cloud sync lawsuit tombstone guard', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_ENABLE_CLOUD_SYNC', 'true');
        getLawsuitFiles.mockReset();
        save.mockReset();
        loadAsync.mockReset();
        loadAsync.mockResolvedValue([]);
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        Object.defineProperty(globalThis.navigator, 'onLine', {
            configurable: true,
            get: () => true,
        });
    });

    async function syncLawsuitBucket() {
        const { performCloudSyncBucket } = await import('@/app/services/cloudSyncEngine');
        return performCloudSyncBucket('lawyer_files');
    }

    function savedIds(): string[] {
        const call = save.mock.calls.at(-1);
        const rows = (call?.[1] ?? []) as Array<{ id?: string | number }>;
        return rows.map((r) => String(r?.id ?? ''));
    }

    it('does not resurrect a tombstoned dossier from cloud rows', async () => {
        markLawsuitDossierTombstone('dead-lawsuit');
        getLawsuitFiles.mockResolvedValue([
            { id: 'dead-lawsuit', caseNo: '9/2026', updatedAt: '2026-07-30T00:00:00.000Z' },
            { id: 'live-lawsuit', caseNo: '10/2026', updatedAt: '2026-07-30T00:00:00.000Z' },
        ]);

        const result = await syncLawsuitBucket();

        expect(result.ok).toBe(true);
        expect(savedIds()).toEqual(['live-lawsuit']);
    });

    it('drops a tombstoned dossier lingering in the local index too', async () => {
        markLawsuitDossierTombstone('dead-local');
        getLawsuitFiles.mockResolvedValue([]);
        loadAsync.mockResolvedValue([
            { id: 'dead-local', caseNo: '11/2026' },
            { id: 'live-local', caseNo: '12/2026' },
        ]);

        await syncLawsuitBucket();

        expect(savedIds()).toContain('live-local');
        expect(savedIds()).not.toContain('dead-local');
    });
});
