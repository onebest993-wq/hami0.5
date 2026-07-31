import { describe, expect, it, vi, afterEach } from 'vitest';
import { createProfileSaveQueue } from '../profileSaveQueue';

describe('createProfileSaveQueue', () => {
    afterEach(() => {
        vi.useRealTimers();
    });
    it('runs saves sequentially in order', async () => {
        const order: number[] = [];
        const enqueue = createProfileSaveQueue();

        await Promise.all([
            enqueue(async () => {
                await new Promise((r) => setTimeout(r, 20));
                order.push(1);
            }),
            enqueue(async () => {
                order.push(2);
            }),
            enqueue(async () => {
                order.push(3);
            }),
        ]);

        expect(order).toEqual([1, 2, 3]);
    });

    it('continues after a failed save', async () => {
        const order: number[] = [];
        const enqueue = createProfileSaveQueue();
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        await enqueue(async () => {
            order.push(1);
            throw new Error('fail');
        }).catch(() => undefined);

        await enqueue(async () => {
            order.push(2);
        });

        expect(order).toEqual([1, 2]);
        errorSpy.mockRestore();
    });

    it('يفتح الطابور بعد مهلة مهمة معلّقة', async () => {
        vi.useFakeTimers();
        const enqueue = createProfileSaveQueue({ timeoutMs: 50 });
        let secondStarted = false;

        const first = enqueue(async () => {
            await new Promise(() => undefined);
        });
        const second = enqueue(async () => {
            secondStarted = true;
        });

        await vi.advanceTimersByTimeAsync(60);
        await expect(first).rejects.toThrow('profile-save-timeout');
        await second;
        expect(secondStarted).toBe(true);
        vi.useRealTimers();
    });
});
