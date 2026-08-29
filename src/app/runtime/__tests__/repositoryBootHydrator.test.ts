import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    bindRepositoryBootHydrator,
    hydrateRepositoryBootShellForInstantOpen,
    resetRepositoryBootHydratorForTests,
} from '@/app/runtime/repositoryBootHydrator';

vi.mock('@/app/runtime/repositoryHubLoader', () => ({
    hydrateRepositoryShellForInstantOpen: vi.fn(() => Promise.resolve(true)),
    isRepositoryHubModuleResolved: vi.fn(() => false),
    prefetchRepositoryHubModule: vi.fn(),
}));

vi.mock('@/app/hooks/lawyerDashboard/repositoryIntentWarm', () => ({
    warmRepositoryDataCache: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: () => false,
    isNativeShellStampedOnDom: () => false,
}));

vi.mock('@/app/services/settings/settingsSnapshot', () => ({
    getLawyerSettingsSnapshot: () => ({
        security: { localOnlyMode: false },
        performance: { prefetchScreens: true, litePerformance: false },
    }),
}));

import { hydrateRepositoryShellForInstantOpen } from '@/app/runtime/repositoryHubLoader';
import { warmRepositoryDataCache } from '@/app/hooks/lawyerDashboard/repositoryIntentWarm';

describe('repositoryBootHydrator', () => {
    beforeEach(() => {
        resetRepositoryBootHydratorForTests();
        vi.clearAllMocks();
    });

    it('يحمّل shell + بيانات vault عند force', async () => {
        const ok = await hydrateRepositoryBootShellForInstantOpen('lawyer-1', true);
        expect(ok).toBe(true);
        expect(hydrateRepositoryShellForInstantOpen).toHaveBeenCalled();
        await vi.waitFor(() => {
            expect(warmRepositoryDataCache).toHaveBeenCalledWith('lawyer-1');
        });
    });

    it('bindRepositoryBootHydrator يُجدول التهيئة عند dashboard-interactive', () => {
        const unbind = bindRepositoryBootHydrator('lawyer-1');
        expect(hydrateRepositoryShellForInstantOpen).not.toHaveBeenCalled();
        window.dispatchEvent(new Event('hami:dashboard-interactive'));
        expect(hydrateRepositoryShellForInstantOpen).toHaveBeenCalled();
        unbind();
    });
});
