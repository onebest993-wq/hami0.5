import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    __resetExecutionFilesStorageOwnerForTests,
    bindExecutionFilesStorageOwner,
    loadExecutionFilesRaw,
    resolveExecutionFilesStorageKey,
} from '@/app/utils/executionFilesStorage';
import SecureStoreService from '@/app/services/SecureStoreService';

const getExecutionFiles = vi.fn();

vi.mock('@/app/services/SupabaseService', () => ({
    SupabaseService: {
        checkUserAuth: () => Promise.resolve(true),
        getExecutionFiles: () => getExecutionFiles(),
        saveExecutionFile: vi.fn(async () => 'saved'),
    },
}));

vi.mock('@/app/utils/executionDossierStorageReconcile', () => ({
    reconcileExecutionDossierStorageAsync: () => Promise.resolve(),
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

describe('execution cloud merge is immediately readable by the archive index', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_ENABLE_CLOUD_SYNC', 'true');
        getExecutionFiles.mockReset();
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        __resetExecutionFilesStorageOwnerForTests();
        bindExecutionFilesStorageOwner('lawyer-immediate-1');
        Object.defineProperty(globalThis.navigator, 'onLine', {
            configurable: true,
            get: () => true,
        });
    });

    it('loadExecutionFilesRaw sees merged cloud rows without waiting for the 450ms persist debounce', async () => {
        getExecutionFiles.mockResolvedValue([
            { id: 'from-cloud', caseNo: '88/2026', updatedAt: '2026-08-01T00:00:00.000Z' },
        ]);

        const { performCloudSyncBucket } = await import('@/app/services/cloudSyncEngine');
        const ownerKey = resolveExecutionFilesStorageKey();
        const result = await performCloudSyncBucket(ownerKey);

        expect(result.ok).toBe(true);
        const rows = loadExecutionFilesRaw() as Array<{ id?: string }>;
        expect(rows.map((r) => String(r.id ?? ''))).toContain('from-cloud');
        const raw = SecureStoreService.getItemSync(ownerKey);
        expect(raw).toBeTruthy();
        expect(JSON.parse(String(raw))).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: 'from-cloud' })]),
        );
    });
});
