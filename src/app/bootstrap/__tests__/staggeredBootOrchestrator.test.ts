import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    STAGGERED_BOOT_IDLE_EVENT,
    enqueueStaggeredBootTask,
    resetStaggeredBootOrchestratorForTests,
} from '@/app/bootstrap/staggeredBootOrchestrator';

describe('staggeredBootOrchestrator', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetStaggeredBootOrchestratorForTests();
    });

    afterEach(() => {
        vi.useRealTimers();
        resetStaggeredBootOrchestratorForTests();
    });

    it('لا يُشغّل مهام secondary قبل dashboard-interactive', async () => {
        const run = vi.fn();
        enqueueStaggeredBootTask('test-task', run, 'secondary');

        await vi.runAllTimersAsync();
        expect(run).not.toHaveBeenCalled();

        window.dispatchEvent(new Event('hami:dashboard-interactive'));
        await vi.runAllTimersAsync();

        expect(run).toHaveBeenCalledTimes(1);
    });

    it('يُطلق hami:staggered-boot-idle بعد إفراغ الطابور', async () => {
        const onIdle = vi.fn();
        window.addEventListener(STAGGERED_BOOT_IDLE_EVENT, onIdle, { once: true });

        enqueueStaggeredBootTask('idle-task', () => undefined, 'secondary');
        window.dispatchEvent(new Event('hami:dashboard-interactive'));

        await vi.runAllTimersAsync();
        expect(onIdle).toHaveBeenCalledTimes(1);
    });

    it('critical يُنفَّذ فوراً', () => {
        const run = vi.fn();
        enqueueStaggeredBootTask('critical-task', run, 'critical');
        expect(run).toHaveBeenCalledTimes(1);
    });
});
