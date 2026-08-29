import { afterEach, describe, expect, it, vi } from 'vitest';
import { withMediaStreamTimeout } from '@/app/services/platform/mediaStreamTimeout';

describe('withMediaStreamTimeout', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('يرمي TimeoutError بعد المهلة', async () => {
        vi.useFakeTimers();
        const pending = withMediaStreamTimeout(new Promise(() => undefined), 1_000, 'CAMERA_TIMEOUT');
        const assertion = expect(pending).rejects.toMatchObject({
            name: 'TimeoutError',
            message: 'CAMERA_TIMEOUT',
        });
        await vi.advanceTimersByTimeAsync(1_001);
        await assertion;
    });

    it('يمرّر القيمة إن اكتملت قبل المهلة', async () => {
        await expect(withMediaStreamTimeout(Promise.resolve(7), 1_000, 'x')).resolves.toBe(7);
    });
});
