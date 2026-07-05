import { beforeEach, describe, expect, it, vi } from 'vitest';

const warmProfileDataCache = vi.fn(() => Promise.resolve(null));
const hydrateProfileShellForInstantOpenWithData = vi.fn(() => Promise.resolve(true));

vi.mock('@/app/runtime/lawyerDashboardProfileTabLoader', () => ({
    prefetchLawyerDashboardProfileTabShell: vi.fn(),
}));

vi.mock('@/app/runtime/profileHubLoader', () => ({
    prefetchProfileHubModule: vi.fn(),
}));

vi.mock('@/app/runtime/profileBootHydrator', () => ({
    hydrateProfileShellForInstantOpenWithData: (...args: unknown[]) =>
        hydrateProfileShellForInstantOpenWithData(...args),
}));

vi.mock('@/app/services/profile/profileWarmCache', () => ({
    prefetchProfileData: (...args: unknown[]) => warmProfileDataCache(...args),
}));

vi.mock('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader', () => ({
    prefetchProfileCanvasFxCore: vi.fn(),
    prefetchProfileCanvasStudioFx: vi.fn(),
}));

vi.mock('@/app/utils/lazyComponents', () => ({
    prefetchProfileSettingsSheet: vi.fn(),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: vi.fn(() => false),
}));

vi.mock('@/app/services/settings/settingsRuntime', () => ({
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { localOnlyMode: false },
        performance: { prefetchScreens: true, litePerformance: false },
    })),
}));

import { prefetchProfileHubModule } from '@/app/runtime/profileHubLoader';
import { prefetchLawyerDashboardProfileTabShell } from '@/app/runtime/lawyerDashboardProfileTabLoader';
import {
    prefetchProfileCanvasFxCore,
    prefetchProfileCanvasStudioFx,
} from '@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader';
import { prefetchProfileSettingsSheet } from '@/app/utils/lazyComponents';
import { warmProfileOnHover, warmProfileOnOpen } from '@/app/hooks/lawyerDashboard/profileIntentWarm';

describe('profileIntentWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('warmProfileOnOpen يبدأ جلب البيانات فوراً ويؤجّل FX/studio', async () => {
        warmProfileOnOpen('lawyer-1');
        expect(prefetchLawyerDashboardProfileTabShell).toHaveBeenCalledTimes(1);
        expect(hydrateProfileShellForInstantOpenWithData).toHaveBeenCalledWith('lawyer-1', true);
        expect(warmProfileDataCache).toHaveBeenCalledWith('lawyer-1');
        expect(prefetchProfileCanvasStudioFx).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(prefetchProfileSettingsSheet).toHaveBeenCalled();
        expect(prefetchProfileCanvasFxCore).toHaveBeenCalled();
        expect(prefetchProfileCanvasStudioFx).toHaveBeenCalled();
    });

    it('warmProfileOnOpen لا يجلب البيانات عند document.hidden', async () => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        warmProfileOnOpen('lawyer-1');
        expect(warmProfileDataCache).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(prefetchProfileCanvasStudioFx).not.toHaveBeenCalled();
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    });

    it('warmProfileOnHover ي prefetch الكامل + canvas', () => {
        warmProfileOnHover('lawyer-2');
        expect(prefetchLawyerDashboardProfileTabShell).toHaveBeenCalledTimes(1);
        expect(prefetchProfileHubModule).toHaveBeenCalledTimes(1);
        expect(warmProfileDataCache).toHaveBeenCalledWith('lawyer-2');
        expect(prefetchProfileSettingsSheet).toHaveBeenCalled();
        expect(prefetchProfileCanvasFxCore).toHaveBeenCalled();
        expect(prefetchProfileCanvasStudioFx).toHaveBeenCalled();
    });
});
