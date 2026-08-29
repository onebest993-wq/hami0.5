import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/app/services/SupabaseService', () => ({
    SupabaseService: {
        getExecutionFiles: vi.fn(async () => []),
        getLawsuitFiles: vi.fn(async () => [{ id: 'ls-1', updatedAt: '2026-01-02' }]),
        getGlobalNotes: vi.fn(async () => []),
        checkUserAuth: vi.fn(async () => true),
        saveLawsuitFile: vi.fn(async () => 'saved'),
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

vi.mock('@/app/services/settings/lawyerWorkCloudGate', () => ({
    isLawyerWorkCloudLive: () => true,
    isWorkLocalKvMaterial: () => false,
}));

vi.mock('@/app/services/settings/cloudSyncBucket', () => ({
    isLiveCloudSyncBucketEnabled: () => true,
    isCloudSyncBucketEnabled: () => true,
}));

const lawsuitSegmentMocks = vi.hoisted(() => ({
    applyLawsuitMonolithicMergeToSegments: vi.fn(),
}));

vi.mock('@/app/domain/lawsuit/lawsuitSegmentStorage', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/domain/lawsuit/lawsuitSegmentStorage')>();
    return {
        ...actual,
        applyLawsuitMonolithicMergeToSegments: lawsuitSegmentMocks.applyLawsuitMonolithicMergeToSegments,
    };
});

vi.mock('@/app/domain/lawsuit/lawsuitPersistFlush', () => ({
    awaitLawsuitWorkspaceCommit: vi.fn(async () => ({ ok: true })),
    scheduleLawsuitWorkspaceCommit: vi.fn(),
    commitLawsuitWorkspacePersist: vi.fn(async () => ({ ok: true })),
    flushLawsuitWorkspacePersist: vi.fn(async () => true),
    resetLawsuitCommitSchedulerForTests: vi.fn(),
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
        expect(lawsuitSegmentMocks.applyLawsuitMonolithicMergeToSegments).toHaveBeenCalled();
    });

    it('يرفع الصف المحلي الأحدث بدلاً من الاكتفاء بتنزيل السحابة', async () => {
        const { performCloudSyncBucket } = await import('@/app/services/cloudSyncEngine');
        const { SupabaseService } = await import('@/app/services/SupabaseService');
        const { persistenceRepository } = await import(
            '@/app/infrastructure/persistence/LocalStorageRepository'
        );
        vi.mocked(SupabaseService.getLawsuitFiles).mockResolvedValueOnce([
            { id: 'ls-1', updatedAt: '2026-01-01' },
        ] as never);
        vi.mocked(persistenceRepository.loadAsync).mockResolvedValueOnce([
            { id: 'ls-1', updatedAt: '2026-01-02' },
        ]);

        const result = await performCloudSyncBucket('lawyer_files');

        expect(result.ok).toBe(true);
        expect(SupabaseService.saveLawsuitFile).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'ls-1', updatedAt: '2026-01-02' }),
        );
        expect(lawsuitSegmentMocks.applyLawsuitMonolithicMergeToSegments).toHaveBeenCalled();
    });
});
