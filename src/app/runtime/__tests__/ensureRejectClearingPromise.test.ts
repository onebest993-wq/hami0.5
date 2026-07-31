import { describe, expect, it, vi } from 'vitest';
import { ensureRejectClearingPromise } from '@/app/runtime/ensureRejectClearingPromise';

describe('ensureRejectClearingPromise', () => {
    it('يمسح الكاش عند الرفض فيسمح بمحاولة لاحقة', async () => {
        let cached: Promise<string> | null = null;
        const create = vi
            .fn<() => Promise<string>>()
            .mockRejectedValueOnce(new Error('chunk fail'))
            .mockResolvedValueOnce('ok');

        const first = ensureRejectClearingPromise(cached, (p) => {
            cached = p;
        }, create);
        await expect(first).rejects.toThrow('chunk fail');
        expect(cached).toBeNull();

        const second = ensureRejectClearingPromise(cached, (p) => {
            cached = p;
        }, create);
        await expect(second).resolves.toBe('ok');
        expect(create).toHaveBeenCalledTimes(2);
    });

    it('يعيد نفس الوعد أثناء التحميل الجاري', async () => {
        let cached: Promise<string> | null = null;
        let resolve!: (v: string) => void;
        const create = vi.fn(
            () =>
                new Promise<string>((r) => {
                    resolve = r;
                }),
        );

        const a = ensureRejectClearingPromise(cached, (p) => {
            cached = p;
        }, create);
        const b = ensureRejectClearingPromise(cached, (p) => {
            cached = p;
        }, create);
        expect(a).toBe(b);
        expect(create).toHaveBeenCalledTimes(1);
        resolve('done');
        await expect(a).resolves.toBe('done');
    });
});
