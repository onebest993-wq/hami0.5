import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    hydrateProfileWarmCachePeekSync: vi.fn(),
    prefetchProfileData: vi.fn(),
    prefetchRoyalLawyerProfileChunk: vi.fn(),
    prefetchProfileSettingsSheetModule: vi.fn(),
    prefetchProfileStudioChunk: vi.fn(),
    hydrateProfileShellForInstantOpenWithData: vi.fn(() => Promise.resolve(true)),
    prefetchProfileCanvasFxCore: vi.fn(),
    loadProfileHubModule: vi.fn(() => Promise.resolve({})),
    isProfileShellModuleResolved: vi.fn(() => false),
}));

vi.mock('@/app/services/profile/profileWarmCache', () => ({
    hydrateProfileWarmCachePeekSync: mocks.hydrateProfileWarmCachePeekSync,
    prefetchProfileData: mocks.prefetchProfileData,
}));

vi.mock('@/app/runtime/royalLawyerProfileLoader', () => ({
    prefetchRoyalLawyerProfileChunk: mocks.prefetchRoyalLawyerProfileChunk,
    loadProfileHubModule: mocks.loadProfileHubModule,
    prefetchProfileHubModule: vi.fn(),
    isProfileShellModuleResolved: mocks.isProfileShellModuleResolved,
}));

vi.mock('@/app/runtime/profileSettingsSheetLoader', () => ({
    prefetchProfileSettingsSheetModule: mocks.prefetchProfileSettingsSheetModule,
}));

vi.mock('@/app/runtime/profileSettingsStudioTabsLoader', () => ({
    prefetchProfileStudioChunk: mocks.prefetchProfileStudioChunk,
}));

vi.mock('@/app/runtime/profileBootHydrator', () => ({
    hydrateProfileShellForInstantOpenWithData: mocks.hydrateProfileShellForInstantOpenWithData,
}));

vi.mock('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader', () => ({
    prefetchProfileCanvasFxCore: mocks.prefetchProfileCanvasFxCore,
}));

vi.mock('@/app/runtime/profileAndroidFxLoader', () => ({
    prefetchProfileAndroidFx: vi.fn(),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: vi.fn(() => false),
    isNativeShellStampedOnDom: vi.fn(() => false),
    isMeteredOrSlowNetwork: vi.fn(() => false),
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
        mocks.isProfileShellModuleResolved.mockReturnValue(false);
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    });

    it('boot يحمّل shell chunks + hub load', async () => {
        primeProfileForBoot();
        await vi.waitFor(() => {
            expect(mocks.prefetchRoyalLawyerProfileChunk).toHaveBeenCalled();
            expect(mocks.loadProfileHubModule).toHaveBeenCalled();
        });
        expect(mocks.hydrateProfileWarmCachePeekSync).not.toHaveBeenCalled();
        expect(mocks.prefetchProfileSettingsSheetModule).not.toHaveBeenCalled();
    });

    it('hover يمرّ عبر data + shell بلا استوديو', async () => {
        primeProfileForHover('lawyer-1');
        await vi.waitFor(() => {
            expect(mocks.hydrateProfileWarmCachePeekSync).toHaveBeenCalledWith('lawyer-1');
            expect(mocks.prefetchRoyalLawyerProfileChunk).toHaveBeenCalled();
            expect(mocks.prefetchProfileData).toHaveBeenCalledWith('lawyer-1');
            expect(mocks.prefetchProfileCanvasFxCore).toHaveBeenCalled();
        });
        expect(mocks.prefetchProfileSettingsSheetModule).not.toHaveBeenCalled();
        expect(mocks.prefetchProfileStudioChunk).not.toHaveBeenCalled();
    });

    it('open يجبر hydrate shell مع data sync بلا استوديو', async () => {
        primeProfileForOpen('lawyer-2');
        await vi.waitFor(() => {
            expect(mocks.hydrateProfileWarmCachePeekSync).toHaveBeenCalledWith('lawyer-2');
            expect(mocks.hydrateProfileShellForInstantOpenWithData).toHaveBeenCalledWith(
                'lawyer-2',
                true,
            );
            expect(mocks.prefetchProfileCanvasFxCore).toHaveBeenCalled();
        });
        expect(mocks.prefetchProfileSettingsSheetModule).not.toHaveBeenCalled();
    });

    it('primeProfileStudio نقطة واحدة للاستوديو', async () => {
        primeProfileStudio();
        await vi.waitFor(() => {
            expect(mocks.prefetchProfileSettingsSheetModule).toHaveBeenCalledTimes(1);
            expect(mocks.prefetchProfileStudioChunk).toHaveBeenCalledWith('appearance');
        });
    });
});
