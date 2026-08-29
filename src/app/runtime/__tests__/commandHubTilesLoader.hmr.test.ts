import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    bumpCommandHubTilesGeneration,
    getCommandHubTilesStoreSnapshot,
    loadCommandHubTiles,
    resetCommandHubTilesCacheForTests,
    subscribeCommandHubTiles,
} from '@/app/runtime/commandHubTilesLoader';

describe('commandHubTilesLoader HMR generation', () => {
    afterEach(() => {
        resetCommandHubTilesCacheForTests();
    });

    it('bump ينشر لقطة بهوية جديدة دون تغيير الوحدة', async () => {
        const listener = vi.fn();
        const unsub = subscribeCommandHubTiles(listener);
        await loadCommandHubTiles();
        listener.mockClear();
        const first = getCommandHubTilesStoreSnapshot();
        expect(first).not.toBeNull();
        bumpCommandHubTilesGeneration();
        const second = getCommandHubTilesStoreSnapshot();
        expect(second).not.toBe(first);
        expect(second?.v).toBeGreaterThan(first!.v);
        expect(second?.mod).toBe(first!.mod);
        expect(listener).toHaveBeenCalled();
        unsub();
    });
});
