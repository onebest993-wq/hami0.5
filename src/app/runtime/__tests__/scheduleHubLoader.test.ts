import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('scheduleHubLoader', () => {
    beforeEach(async () => {
        vi.resetModules();
        const mod = await import('@/app/runtime/scheduleHubLoader');
        mod.resetScheduleHubModuleCacheForTests();
    });

    it('hydrateScheduleShellForInstantOpen يكتفي بتبويب التقويم دون انتظار الرادار', async () => {
        const tabMod = {
            LawyerDashboardScheduleTab: () => null,
        };
        let resolveRadar: ((v: unknown) => void) | undefined;
        const radarPromise = new Promise((resolve) => {
            resolveRadar = resolve;
        });

        vi.doMock('@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab', () => tabMod);
        vi.doMock('@/app/components/lawyer/SmartLegalRadar.tsx', () => radarPromise);

        const { hydrateScheduleShellForInstantOpen, isScheduleTabModuleResolved, isSmartLegalRadarModuleResolved } =
            await import('@/app/runtime/scheduleHubLoader');

        const okPromise = hydrateScheduleShellForInstantOpen();
        const ok = await okPromise;

        expect(ok).toBe(true);
        expect(isScheduleTabModuleResolved()).toBe(true);
        expect(isSmartLegalRadarModuleResolved()).toBe(false);

        resolveRadar?.({ SmartLegalRadar: () => null });
        await radarPromise;
    });
});
