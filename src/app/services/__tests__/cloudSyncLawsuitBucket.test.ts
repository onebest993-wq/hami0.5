import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/app/services/SupabaseService', () => ({
    SupabaseService: {
        getExecutionFiles: vi.fn(async () => []),
        getLawsuitFiles: vi.fn(async () => [{ id: 'ls-1', updatedAt: '2026-01-02' }]),
        getGlobalNotes: vi.fn(async () => []),
        checkUserAuth: vi.fn(async () => true),
    },
}));

vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
    persistenceRepository: {
        loadAsync: vi.fn(async () => [{ id: 'ls-1', updatedAt: '2026-01-01' }]),
        save: vi.fn(),
    },
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: { ensurePersistedReady: vi.fn(async () => undefined) },
}));

vi.mock('@/app/services/settings/localOnlyGuard', () => ({
    isLocalOnlyModeEnabled: vi.fn(() => false),
}));

vi.mock('@/app/services/realtimeSyncGate', () => ({
    isCloudPollingPausedByRealtime: vi.fn(() => false),
}));

describe('cloudSyncEngine lawsuit bucket', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('VITE_ENABLE_CLOUD_SYNC', 'true');
        Object.defineProperty(globalThis.navigator, 'onLine', {
            configurable: true,
            get: () => true,
        });
    });

    it('لا يعيد ok صامتًا دون جلب السحابة — يمزج getLawsuitFiles', async () => {
        const { performCloudSyncBucket } = await import('@/app/services/cloudSyncEngine');
        const { SupabaseService } = await import('@/app/services/SupabaseService');
        const { persistenceRepository } = await import(
            '@/app/infrastructure/persistence/LocalStorageRepository'
        );

        const result = await performCloudSyncBucket('lawyer_files');
        expect(result.ok).toBe(true);
        expect(SupabaseService.getLawsuitFiles).toHaveBeenCalled();
        expect(persistenceRepository.save).toHaveBeenCalled();
    });
});
