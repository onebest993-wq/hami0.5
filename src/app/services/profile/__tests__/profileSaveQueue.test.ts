import { describe, expect, it, vi } from 'vitest';
import { createProfileSaveQueue } from '../profileSaveQueue';

describe('createProfileSaveQueue', () => {
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
});
