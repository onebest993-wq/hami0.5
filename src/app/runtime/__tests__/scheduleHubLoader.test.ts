import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('scheduleHubLoader', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('hydrateScheduleShellForInstantOpen يحمّل مضيف التقويم فقط', async () => {
        vi.doMock('@/app/components/lawyer/dashboard/schedule/ScheduleTabHost', () => ({
            ScheduleTabHost: () => null,
        }));

        const { hydrateScheduleShellForInstantOpen, isScheduleShellModuleResolved, resetScheduleHubModuleCacheForTests } =
            await import('@/app/runtime/scheduleHubLoader');
        resetScheduleHubModuleCacheForTests();

        const ok = await hydrateScheduleShellForInstantOpen();

        expect(ok).toBe(true);
        expect(isScheduleShellModuleResolved()).toBe(true);
    });
});
