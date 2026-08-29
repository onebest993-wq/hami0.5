import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/services/settings/lawyerWorkCloudGate', () => ({
    isLawyerWorkCloudLive: vi.fn(() => true),
}));

vi.mock('@/app/services/settings/cloudSyncBucket', () => ({
    isLiveCloudSyncBucketEnabled: vi.fn(() => true),
}));

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: vi.fn(async () => ({ ok: true })),
    },
}));

vi.mock('@/app/services/CryptoService', () => ({
    CryptoService: {
        initialize: vi.fn(async () => undefined),
        encryptData: vi.fn(async (plain: string) => `enc:${plain.length}`),
        generateDataSignature: vi.fn(async () => 'sig'),
        verifyDataSignature: vi.fn(async () => true),
        decryptData: vi.fn(async (cipher: string) => {
            if (cipher.startsWith('plain:')) return cipher.slice(6);
            return '{}';
        }),
    },
}));

vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
    persistenceRepository: {
        loadAsync: vi.fn(async () => []),
        save: vi.fn(),
    },
}));

vi.mock('@/app/utils/executionFilesStorage', () => ({
    saveExecutionFilesRawImmediate: vi.fn(),
    resolveExecutionFilesStorageKey: vi.fn(() => 'hami:execution:v1:u1'),
}));

vi.mock('@/app/utils/liveAuthUserId', () => ({
    resolveLiveAuthUserIdForStorage: vi.fn(() => 'u1'),
}));

vi.mock('@/app/domain/lawsuit/lawsuitSegmentStorage', () => ({
    collectLawsuitLocalRowsForSync: vi.fn(() => [{ id: 'ls-1' }]),
    applyLawsuitMonolithicMergeToSegments: vi.fn(),
}));

import {
    cancelScheduledWorkCloudCheckpoint,
    parseWorkCloudCheckpointPayload,
    pushWorkCloudCheckpointNow,
    scheduleWorkCloudCheckpoint,
} from '@/app/services/cloud/workCloudCheckpoint';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { isLawyerWorkCloudLive } from '@/app/services/settings/lawyerWorkCloudGate';

describe('parseWorkCloudCheckpointPayload', () => {
    it('يرفض الحمولة بلا إصدار', () => {
        expect(parseWorkCloudCheckpointPayload({ lawsuits: [] })).toBeNull();
    });

    it('يقبل نقطة العمل v1', () => {
        const parsed = parseWorkCloudCheckpointPayload({
            v: 1,
            savedAt: '2026-08-29T12:00:00.000Z',
            lawsuits: [{ id: 'a' }],
            execution: [],
            notes: [{ id: 'n' }],
        });
        expect(parsed).toEqual({
            v: 1,
            savedAt: '2026-08-29T12:00:00.000Z',
            lawsuits: [{ id: 'a' }],
            execution: [],
            notes: [{ id: 'n' }],
        });
    });
});

describe('pushWorkCloudCheckpointNow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(isLawyerWorkCloudLive).mockReturnValue(true);
        vi.mocked(persistenceRepository.loadAsync).mockImplementation(async (key: string) => {
            if (String(key).includes('execution')) return [{ id: 'ex-1' }];
            if (String(key).includes('notes') || String(key).includes('NOTES')) return [{ id: 'n-1' }];
            return [];
        });
    });

    afterEach(() => {
        cancelScheduledWorkCloudCheckpoint();
        vi.useRealTimers();
    });

    it('يلغي النقطة المؤجّلة قبل الدفع الفوري — لا رفع مزدوج', async () => {
        vi.useFakeTimers();
        scheduleWorkCloudCheckpoint();
        const ok = await pushWorkCloudCheckpointNow();
        expect(ok).toBe(true);
        expect(SecureAPIClient.fetchSecure).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(5_000);
        expect(SecureAPIClient.fetchSecure).toHaveBeenCalledTimes(1);
    });

    it('يرفض الحمولة العربية الضخمة بقياس البايتات لا المحارف', async () => {
        const arabicChunk = 'محامي'.repeat(280_000);
        vi.mocked(persistenceRepository.loadAsync).mockResolvedValue([
            { id: 'huge', note: arabicChunk },
        ]);
        const { collectLawsuitLocalRowsForSync } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        vi.mocked(collectLawsuitLocalRowsForSync).mockReturnValue([
            { id: 'huge', note: arabicChunk } as never,
        ]);

        const ok = await pushWorkCloudCheckpointNow();
        expect(ok).toBe(false);
        expect(SecureAPIClient.fetchSecure).not.toHaveBeenCalled();
    });

    it('لا يدفع إن السحابة غير حيّة', async () => {
        vi.mocked(isLawyerWorkCloudLive).mockReturnValue(false);
        const ok = await pushWorkCloudCheckpointNow();
        expect(ok).toBe(false);
        expect(SecureAPIClient.fetchSecure).not.toHaveBeenCalled();
    });
});
