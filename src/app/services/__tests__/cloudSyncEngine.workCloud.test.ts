import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkUserAuth = vi.fn(async () => true);
const getLawsuitFiles = vi.fn(async () => [{ id: 'ls-1' }]);
const getExecutionFiles = vi.fn(async () => [{ id: 'ex-1' }]);
const isLawyerWorkCloudLive = vi.fn(() => false);
const isLiveCloudSyncBucketEnabled = vi.fn(() => false);

vi.mock('@/app/services/SupabaseService', () => ({
    SupabaseService: {
        checkUserAuth: () => checkUserAuth(),
        getLawsuitFiles: () => getLawsuitFiles(),
        getExecutionFiles: () => getExecutionFiles(),
        getGlobalNotes: vi.fn(async () => []),
        saveLawsuitFile: vi.fn(async () => 'saved'),
        saveExecutionFile: vi.fn(async () => 'saved'),
        saveGlobalNote: vi.fn(async () => 'saved'),
    },
}));

vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
    persistenceRepository: {
        loadAsync: vi.fn(async () => []),
        save: vi.fn(),
        flushPending: vi.fn(),
        synchronizeExternalWrite: vi.fn(),
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

vi.mock('@/app/services/settings/lawyerWorkCloudGate', () => ({
    isLawyerWorkCloudLive: () => isLawyerWorkCloudLive(),
    isWorkLocalKvMaterial: () => false,
}));

vi.mock('@/app/services/settings/cloudSyncBucket', () => ({
    isLiveCloudSyncBucketEnabled: (bucket: 'notes' | 'files' | 'execution') =>
        isLiveCloudSyncBucketEnabled(bucket),
    isCloudSyncBucketEnabled: () => false,
}));

describe('cloudSyncEngine work-cloud isolation', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_ENABLE_CLOUD_SYNC', 'true');
        checkUserAuth.mockClear().mockResolvedValue(true);
        getLawsuitFiles.mockClear();
        getExecutionFiles.mockClear();
        isLawyerWorkCloudLive.mockReset().mockReturnValue(false);
        isLiveCloudSyncBucketEnabled.mockReset().mockReturnValue(false);
        Object.defineProperty(globalThis.navigator, 'onLine', {
            configurable: true,
            get: () => true,
        });
    });

    it('لا يلمس /api ولا يفحص الجلسة عندما المزامنة مطفأة', async () => {
        const { performCloudSyncBucket, canRunCloudSync } = await import(
            '@/app/services/cloudSyncEngine'
        );
        expect(await canRunCloudSync()).toBe(false);
        const lawsuit = await performCloudSyncBucket('lawyer_files');
        const execution = await performCloudSyncBucket('executionFiles');
        expect(lawsuit).toEqual({ ok: true, skipped: true });
        expect(execution).toEqual({ ok: true, skipped: true });
        expect(checkUserAuth).not.toHaveBeenCalled();
        expect(getLawsuitFiles).not.toHaveBeenCalled();
        expect(getExecutionFiles).not.toHaveBeenCalled();
    });

    it('يتخطى سلة التنفيذ وحدها إذا المزامنة الحيّة للدعاوى فقط', async () => {
        isLawyerWorkCloudLive.mockReturnValue(true);
        isLiveCloudSyncBucketEnabled.mockImplementation((bucket: string) => bucket === 'files');
        const { performCloudSyncBucket } = await import('@/app/services/cloudSyncEngine');
        const execution = await performCloudSyncBucket('executionFiles');
        expect(execution.skipped).toBe(true);
        expect(getExecutionFiles).not.toHaveBeenCalled();
        expect(checkUserAuth).not.toHaveBeenCalled();
    });
});
