import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    warmProfileDataCache: vi.fn(() => Promise.resolve(null)),
    hydrateProfileWarmCachePeekSync: vi.fn(),
    hydrateProfileShellForInstantOpenWithData: vi.fn(() => Promise.resolve(true)),
    prefetchProfileSettingsSheetModule: vi.fn(),
    prefetchProfileStudioChunk: vi.fn(),
    prefetchRoyalLawyerProfileChunk: vi.fn(),
    prefetchProfileCanvasFxCore: vi.fn(),
    loadProfileHubModule: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/app/runtime/royalLawyerProfileLoader', () => ({
    prefetchRoyalLawyerProfileChunk: mocks.prefetchRoyalLawyerProfileChunk,
    loadProfileHubModule: mocks.loadProfileHubModule,
    prefetchProfileHubModule: vi.fn(),
    isProfileShellModuleResolved: vi.fn(() => false),
}));

vi.mock('@/app/runtime/profileBootHydrator', () => ({
    hydrateProfileShellForInstantOpenWithData: mocks.hydrateProfileShellForInstantOpenWithData,
}));

vi.mock('@/app/services/profile/profileWarmCache', () => ({
    prefetchProfileData: mocks.warmProfileDataCache,
    hydrateProfileWarmCachePeekSync: mocks.hydrateProfileWarmCachePeekSync,
}));

vi.mock('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader', () => ({
    prefetchProfileCanvasFxCore: mocks.prefetchProfileCanvasFxCore,
}));

vi.mock('@/app/runtime/profileSettingsSheetLoader', () => ({
    prefetchProfileSettingsSheetModule: mocks.prefetchProfileSettingsSheetModule,
}));

vi.mock('@/app/runtime/profileSettingsStudioTabsLoader', () => ({
    prefetchProfileStudioChunk: mocks.prefetchProfileStudioChunk,
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

import { warmProfileOnHover, warmProfileOnOpen } from '@/app/runtime/profileShellPrime';

describe('profileShellPrime warm aliases (ex-profileIntentWarm)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    });

    it('warmProfileOnOpen يبدأ جلب البيانات فوراً ويؤجّل FX الأساسي', async () => {
        warmProfileOnOpen('lawyer-1');
        await vi.waitFor(() => {
            expect(mocks.prefetchRoyalLawyerProfileChunk).toHaveBeenCalled();
            expect(mocks.hydrateProfileShellForInstantOpenWithData).toHaveBeenCalledWith(
                'lawyer-1',
                true,
            );
            expect(mocks.hydrateProfileWarmCachePeekSync).toHaveBeenCalledWith('lawyer-1');
            expect(mocks.warmProfileDataCache).toHaveBeenCalledWith('lawyer-1');
            expect(mocks.prefetchProfileCanvasFxCore).toHaveBeenCalled();
        });
        expect(mocks.prefetchProfileSettingsSheetModule).not.toHaveBeenCalled();
    });

    it('warmProfileOnOpen لا يجلب FX عند تبويب مخفي', async () => {
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        warmProfileOnOpen('lawyer-1');
        await vi.waitFor(() => {
            expect(mocks.hydrateProfileShellForInstantOpenWithData).toHaveBeenCalled();
            expect(mocks.warmProfileDataCache).toHaveBeenCalledWith('lawyer-1');
        });
        expect(mocks.prefetchProfileCanvasFxCore).not.toHaveBeenCalled();
    });

    it('warmProfileOnHover ي prefetch الأساسي', async () => {
        warmProfileOnHover('lawyer-2');
        await vi.waitFor(() => {
            expect(mocks.prefetchRoyalLawyerProfileChunk).toHaveBeenCalled();
            expect(mocks.hydrateProfileWarmCachePeekSync).toHaveBeenCalledWith('lawyer-2');
            expect(mocks.warmProfileDataCache).toHaveBeenCalledWith('lawyer-2');
            expect(mocks.prefetchProfileCanvasFxCore).toHaveBeenCalled();
        });
        expect(mocks.prefetchProfileSettingsSheetModule).not.toHaveBeenCalled();
    });
});
