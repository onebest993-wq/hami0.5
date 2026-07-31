import { beforeEach, describe, expect, it, vi } from 'vitest';

const hydrateMock = vi.fn(async (userId: string | null | undefined) => ({
    key: userId ? `executionFiles:${userId}` : 'executionFiles',
    rows: [{ id: 'eager-1', caseNo: '1 / 2026' }],
}));

vi.mock('@/app/utils/executionFilesStorage', () => ({
    hydrateExecutionFilesStorageForOwner: (userId: string | null | undefined) => hydrateMock(userId),
}));

describe('executionFilesEagerHydrate', () => {
    beforeEach(async () => {
        hydrateMock.mockClear();
        const mod = await import('@/app/runtime/executionFilesEagerHydrate');
        mod.resetExecutionFilesEagerHydrateForTests();
    });

    it('يعيد نتيجة جاهزة لنفس المالك دون إعادة hydrate', async () => {
        const mod = await import('@/app/runtime/executionFilesEagerHydrate');
        mod.startExecutionFilesEagerHydrate('u1');
        const first = await mod.awaitExecutionFilesEagerHydrate('u1');
        expect(first.rows).toEqual([{ id: 'eager-1', caseNo: '1 / 2026' }]);
        expect(hydrateMock).toHaveBeenCalledTimes(1);

        const ready = mod.getExecutionFilesEagerHydrateIfReady('u1');
        expect(ready?.rows).toEqual([{ id: 'eager-1', caseNo: '1 / 2026' }]);
        await mod.awaitExecutionFilesEagerHydrate('u1');
        expect(hydrateMock).toHaveBeenCalledTimes(1);
    });

    it('يعيد التسخين بعد الإبطال', async () => {
        const mod = await import('@/app/runtime/executionFilesEagerHydrate');
        await mod.awaitExecutionFilesEagerHydrate('u1');
        mod.invalidateExecutionFilesEagerHydrate();
        await mod.awaitExecutionFilesEagerHydrate('u1');
        expect(hydrateMock).toHaveBeenCalledTimes(2);
    });

    it('لا يرفض عند فشل hydrate — يعيد قائمة فارغة', async () => {
        hydrateMock.mockRejectedValueOnce(new Error('idb-fail'));
        const mod = await import('@/app/runtime/executionFilesEagerHydrate');
        const result = await mod.awaitExecutionFilesEagerHydrate('u1', 0);
        expect(result.rows).toEqual([]);
        expect(result.owner).toBe('u1');
    });
});
