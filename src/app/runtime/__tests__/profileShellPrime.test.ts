import { beforeEach, describe, expect, it, vi } from 'vitest';

const hydrateProfileWarmCachePeekSync = vi.fn();
const prefetchProfileData = vi.fn();
const prefetchProfileTabModule = vi.fn();
const prefetchRoyalLawyerProfileChunk = vi.fn();
const prefetchProfileSettingsSheetModule = vi.fn();
const prefetchProfileStudioChunk = vi.fn();
const hydrateProfileShellForInstantOpenWithData = vi.fn(() => Promise.resolve(true));
const prefetchProfileCanvasFxCore = vi.fn();
const loadProfileHubModule = vi.fn(() => Promise.resolve(true));

vi.mock('@/app/services/profile/profileWarmCache', () => ({
    hydrateProfileWarmCachePeekSync: (...args: unknown[]) => hydrateProfileWarmCachePeekSync(...args),
    prefetchProfileData: (...args: unknown[]) => prefetchProfileData(...args),
}));

vi.mock('@/app/runtime/profileTabModuleLoader', () => ({
    prefetchProfileTabModule: (...args: unknown[]) => prefetchProfileTabModule(...args),
}));

vi.mock('@/app/runtime/royalLawyerProfileLoader', () => ({
    prefetchRoyalLawyerProfileChunk: (...args: unknown[]) => prefetchRoyalLawyerProfileChunk(...args),
}));

vi.mock('@/app/runtime/profileSettingsSheetLoader', () => ({
    prefetchProfileSettingsSheetModule: (...args: unknown[]) =>
        prefetchProfileSettingsSheetModule(...args),
}));

vi.mock('@/app/runtime/profileSettingsStudioTabsLoader', () => ({
    prefetchProfileStudioChunk: (...args: unknown[]) => prefetchProfileStudioChunk(...args),
}));

vi.mock('@/app/runtime/profileBootHydrator', () => ({
    hydrateProfileShellForInstantOpenWithData: (...args: unknown[]) =>
        hydrateProfileShellForInstantOpenWithData(...args),
}));

vi.mock('@/app/runtime/profileHubLoader', () => ({
    loadProfileHubModule: (...args: unknown[]) => loadProfileHubModule(...args),
    prefetchProfileHubModule: vi.fn(),
}));

vi.mock('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader', () => ({
    prefetchProfileCanvasFxCore: (...args: unknown[]) => prefetchProfileCanvasFxCore(...args),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: vi.fn(() => false),
}));

vi.mock('@/app/services/settings/settingsSnapshot', () => ({
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { localOnlyMode: false },
        performance: { prefetchScreens: true, litePerformance: false },
    })),
}));

import {
    primeProfileForBoot,
    primeProfileForHover,
    primeProfileForOpen,
    primeProfileStudio,
} from '@/app/runtime/profileShellPrime';

describe('profileShellPrime', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('boot يحمّل shell chunks + hub load', async () => {
        primeProfileForBoot();
        expect(prefetchProfileTabModule).toHaveBeenCalledTimes(1);
        expect(prefetchRoyalLawyerProfileChunk).toHaveBeenCalledTimes(1);
        expect(hydrateProfileWarmCachePeekSync).not.toHaveBeenCalled();
        expect(prefetchProfileSettingsSheetModule).not.toHaveBeenCalled();
        await vi.waitFor(() => {
            expect(loadProfileHubModule).toHaveBeenCalledTimes(1);
        });
    });

    it('hover يمرّ عبر data + shell + studio', () => {
        primeProfileForHover('lawyer-1');
        expect(hydrateProfileWarmCachePeekSync).toHaveBeenCalledWith('lawyer-1');
        expect(prefetchProfileTabModule).toHaveBeenCalled();
        expect(prefetchProfileSettingsSheetModule).toHaveBeenCalled();
        expect(prefetchProfileData).toHaveBeenCalledWith('lawyer-1');
    });

    it('open يجبر hydrate shell مع data sync', async () => {
        primeProfileForOpen('lawyer-2');
        expect(hydrateProfileWarmCachePeekSync).toHaveBeenCalledWith('lawyer-2');
        expect(hydrateProfileShellForInstantOpenWithData).toHaveBeenCalledWith('lawyer-2', true);
        expect(prefetchProfileSettingsSheetModule).toHaveBeenCalled();
        await Promise.resolve();
        expect(prefetchProfileCanvasFxCore).toHaveBeenCalled();
    });

    it('primeProfileStudio نقطة واحدة للاستوديو', () => {
        primeProfileStudio();
        expect(prefetchProfileSettingsSheetModule).toHaveBeenCalledTimes(1);
        expect(prefetchProfileStudioChunk).toHaveBeenCalledWith('appearance');
    });
});
