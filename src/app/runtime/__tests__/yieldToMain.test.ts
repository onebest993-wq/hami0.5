import { describe, expect, it, vi } from 'vitest';
import { runWarmSteps, yieldToMain } from '@/app/runtime/yieldToMain';

describe('yieldToMain / runWarmSteps — تكلفة التحليل', () => {
    it('yieldToMain يُعيد وعداً ولا يرمي', async () => {
        await expect(yieldToMain()).resolves.toBeUndefined();
    });

    it('runWarmSteps ينفّذ بالترتيب ويتوقف عند الإلغاء', async () => {
        const order: number[] = [];
        let cancelled = false;
        await runWarmSteps(
            [
                () => {
                    order.push(1);
                },
                () => {
                    order.push(2);
                    cancelled = true;
                },
                () => {
                    order.push(3);
                },
            ],
            () => cancelled,
        );
        expect(order).toEqual([1, 2]);
    });

    it('runWarmSteps يبتلع خطأ خطوة ويكمل', async () => {
        const second = vi.fn();
        await runWarmSteps([
            () => {
                throw new Error('warm-step');
            },
            second,
        ]);
        expect(second).toHaveBeenCalledTimes(1);
    });

    it('مهلة الأصل أطول من الويب عندما يكون الغلاف مختوماً', async () => {
        const { yieldToMainIdleTimeoutMs } = await import('@/app/runtime/yieldToMain');
        document.documentElement.dataset.hamiNative = '0';
        expect(yieldToMainIdleTimeoutMs()).toBe(48);
        document.documentElement.dataset.hamiNative = '1';
        expect(yieldToMainIdleTimeoutMs()).toBe(160);
        delete document.documentElement.dataset.hamiNative;
    });
});
