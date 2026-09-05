import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../buildFollowupModalSnapshotInput', () => ({
    buildFollowupModalSnapshotInput: vi.fn((sources: Record<string, unknown>) => ({
        ...sources,
        CoerciveTab: sources.LazyCoerciveTab,
    })),
}));

describe('followupModalSnapshotBuilderCache', () => {
    beforeEach(async () => {
        vi.resetModules();
        const cache = await import('../followupModalSnapshotBuilderCache');
        cache.resetFollowupModalSnapshotBuilderCacheForTests();
    });

    it('يعيد null قبل التحميل ثم يثبّت البناء بعد load', async () => {
        const cache = await import('../followupModalSnapshotBuilderCache');
        expect(cache.peekFollowupModalSnapshotBuilder()).toBeNull();
        const builder = await cache.loadAndCacheFollowupModalSnapshotBuilder();
        expect(builder).toBeTypeOf('function');
        expect(cache.peekFollowupModalSnapshotBuilder()).toBe(builder);
        expect(builder({ unifiedModalTab: 'personal' })).toMatchObject({ unifiedModalTab: 'personal' });
    });
});
