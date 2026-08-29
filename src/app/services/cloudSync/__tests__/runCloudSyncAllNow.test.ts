import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import { STORAGE_KEYS } from '@/app/utils/constants';

const performCloudSyncBuckets = vi.fn(async (keys: string[]) => {
    const map = new Map();
    for (const key of keys) {
        map.set(key, { ok: true, skipped: false });
    }
    return map;
});

vi.mock('@/app/services/cloudSyncEngine', () => ({
    performCloudSyncBuckets: (...args: unknown[]) => performCloudSyncBuckets(...args),
}));

vi.mock('@/app/utils/liveAuthUserId', () => ({
    resolveLiveAuthUserIdForStorage: () => 'user-1',
}));

vi.mock('@/app/utils/executionFilesStorage', () => ({
    resolveExecutionFilesStorageKey: (id?: string | null) => `executionFiles:${id ?? 'anon'}`,
}));

const { pushWorkCloudCheckpointNow } = vi.hoisted(() => ({
    pushWorkCloudCheckpointNow: vi.fn(async () => true),
}));

vi.mock('@/app/services/cloud/workCloudCheckpoint', () => ({
    pushWorkCloudCheckpointNow: (...args: unknown[]) => pushWorkCloudCheckpointNow(...args),
}));

import { runCloudSyncAllNow } from '@/app/services/cloudSync/runCloudSyncAllNow';

describe('runCloudSyncAllNow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يتخطى عندما المزامنة معطلة', async () => {
        const summary = await runCloudSyncAllNow({
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            data: { ...LAWYER_SETTINGS_V2_DEFAULTS.data, cloudSync: false },
        });
        expect(summary.skipped).toBe(true);
        expect(performCloudSyncBuckets).not.toHaveBeenCalled();
        expect(pushWorkCloudCheckpointNow).not.toHaveBeenCalled();
    });

    it('يزامن السلات المفعّلة صراحة', async () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const summary = await runCloudSyncAllNow({
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            security: { ...LAWYER_SETTINGS_V2_DEFAULTS.security, localOnlyMode: false },
            data: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.data,
                cloudSync: true,
                syncNotes: true,
                syncFiles: true,
                syncExecution: true,
            },
        });
        expect(summary.ok).toBe(true);
        expect(performCloudSyncBuckets).toHaveBeenCalledWith(
            [STORAGE_KEYS.LAWYER_NOTES, STORAGE_KEYS.LAWYER_FILES, 'executionFiles:user-1'],
            { allowWhenRealtimeActive: true },
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'hami:data-imported' }),
        );
        await vi.waitFor(() => {
            expect(pushWorkCloudCheckpointNow).toHaveBeenCalled();
        });
        dispatchSpy.mockRestore();
    });
});
