import { describe, expect, it, vi } from 'vitest';

import { purgeDeletedExecutionDossiers } from '@/app/utils/purgeDeletedExecutionDossiers';

function deps(overrides: Partial<Parameters<typeof purgeDeletedExecutionDossiers>[1]> = {}) {
    return {
        removeStorageBundle: vi.fn().mockResolvedValue(undefined),
        purgeScopedState: vi.fn().mockResolvedValue(undefined),
        deleteFromCloud: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

describe('purgeDeletedExecutionDossiers', () => {
    it('purges every dossier in the batch', async () => {
        const d = deps();

        const result = await purgeDeletedExecutionDossiers(['a', 'b', 'c'], d);

        expect(d.removeStorageBundle).toHaveBeenCalledTimes(3);
        expect(d.purgeScopedState).toHaveBeenCalledTimes(3);
        expect(d.deleteFromCloud).toHaveBeenCalledTimes(3);
        expect(result).toEqual({ storageFailures: [], cloudFailures: [] });
    });

    it('keeps purging after one dossier fails instead of abandoning the batch', async () => {
        const removeStorageBundle = vi
            .fn()
            .mockRejectedValueOnce(new Error('quota'))
            .mockResolvedValue(undefined);
        const d = deps({ removeStorageBundle });

        const result = await purgeDeletedExecutionDossiers(['bad', 'good-1', 'good-2'], d);

        expect(removeStorageBundle).toHaveBeenCalledTimes(3);
        expect(result.storageFailures).toEqual(['bad']);
        expect(d.purgeScopedState.mock.calls.flat()).toEqual(['good-1', 'good-2']);
    });

    it('reports the failure instead of swallowing it', async () => {
        const d = deps({ purgeScopedState: vi.fn().mockRejectedValue(new Error('store gone')) });

        const result = await purgeDeletedExecutionDossiers(['x', 'y'], d);

        expect(result.storageFailures).toEqual(['x', 'y']);
    });

    it('still removes the cloud copy when the local purge fails', async () => {
        const d = deps({ removeStorageBundle: vi.fn().mockRejectedValue(new Error('locked')) });

        const result = await purgeDeletedExecutionDossiers(['orphan'], d);

        expect(d.deleteFromCloud).toHaveBeenCalledWith('orphan');
        expect(result.storageFailures).toEqual(['orphan']);
        expect(result.cloudFailures).toEqual([]);
    });

    it('separates cloud failures from storage failures', async () => {
        const d = deps({ deleteFromCloud: vi.fn().mockRejectedValue(new Error('offline')) });

        const result = await purgeDeletedExecutionDossiers(['a', 'b'], d);

        expect(result.storageFailures).toEqual([]);
        expect(result.cloudFailures).toEqual(['a', 'b']);
    });

    it('ignores blank ids rather than purging a "default" bucket', async () => {
        const d = deps();

        await purgeDeletedExecutionDossiers(['', '   ', 'real'], d);

        expect(d.removeStorageBundle.mock.calls.flat()).toEqual(['real']);
    });
});
