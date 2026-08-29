import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createLawyerDashboardHeaderPrefetch } from '@/app/hooks/lawyerDashboard/lawyerDashboardHeaderPrefetch';

vi.mock('@/app/runtime/profileShellPrime', () => ({
    warmProfileOnHover: vi.fn(),
    warmProfileOnOpen: vi.fn(),
}));

vi.mock('@/app/hooks/lawyerDashboard/globalSearchIntentWarm', () => ({
    warmGlobalSearchOnHover: vi.fn(),
    warmGlobalSearchOnOpen: vi.fn(),
}));

vi.mock('@/app/hooks/lawyerDashboard/settingsIntentWarm', () => ({
    warmSettingsOnHover: vi.fn(),
    warmSettingsOnOpen: vi.fn(),
    primeSettingsShellForOpen: vi.fn(),
}));

vi.mock('@/app/hooks/lawyerDashboard/notificationIntentWarm', () => ({
    warmNotificationsOnHover: vi.fn(),
    warmNotificationsOnOpen: vi.fn(),
}));

vi.mock('@/app/runtime/notificationPanelLoader', () => ({
    loadNotificationPanelModule: vi.fn(() => Promise.resolve({})),
    isNotificationPanelModuleResolved: vi.fn(() => false),
    hydrateNotificationPanelForInstantOpen: vi.fn(() => Promise.resolve(true)),
    prefetchNotificationPanel: vi.fn(),
}));

vi.mock('@/app/runtime/notificationBootHydrator', () => ({
    dispatchNotificationPrimeHost: vi.fn(),
    hydrateNotificationShellForInstantOpen: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/app/runtime/hamiSettingsLoader', () => ({
    loadHamiSettingsModule: vi.fn(() => Promise.resolve({})),
    prefetchHamiSettingsModule: vi.fn(),
}));

vi.mock('@/app/runtime/globalSearchLoader', () => ({
    loadGlobalSearchOverlayModule: vi.fn(() => Promise.resolve({})),
    prefetchGlobalSearchOverlayChunk: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/app/runtime/settingsOverlayEntryLoader', () => ({
    loadSettingsOverlayEntry: vi.fn(() => Promise.resolve({})),
    prefetchSettingsOverlayEntry: vi.fn(),
}));

vi.mock('@/app/hooks/lawyerDashboard/vaultIntentWarm', () => ({
    warmVaultOnHover: vi.fn(),
}));

vi.mock('@/app/runtime/settingsBootHydrator', () => ({
    dispatchSettingsPrimeHost: vi.fn(),
}));

vi.mock('@/app/runtime/profileBootHydrator', () => ({
    dispatchProfilePrimeHost: vi.fn(),
}));

vi.mock('@/app/runtime/royalLawyerProfileLoader', () => ({
    loadRoyalLawyerProfileModule: vi.fn(() => Promise.resolve({})),
    prefetchProfileHubModule: vi.fn(),
    loadProfileHubModule: vi.fn(() => Promise.resolve([])),
    isProfileShellModuleResolved: vi.fn(() => false),
}));

import { loadHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';
import { warmProfileOnHover, warmProfileOnOpen } from '@/app/runtime/profileShellPrime';
import { warmSettingsOnHover, primeSettingsShellForOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';
import { warmNotificationsOnHover, warmNotificationsOnOpen } from '@/app/hooks/lawyerDashboard/notificationIntentWarm';
import { loadNotificationPanelModule } from '@/app/runtime/notificationPanelLoader';
import { prefetchGlobalSearchOverlayChunk, loadGlobalSearchOverlayModule } from '@/app/runtime/globalSearchLoader';
import { loadRoyalLawyerProfileModule } from '@/app/runtime/royalLawyerProfileLoader';
import { warmGlobalSearchOnHover, warmGlobalSearchOnOpen } from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';
import { dispatchSettingsPrimeHost } from '@/app/runtime/settingsBootHydrator';
import { dispatchProfilePrimeHost } from '@/app/runtime/profileBootHydrator';
import { loadProfileHubModule } from '@/app/runtime/royalLawyerProfileLoader';

describe('createLawyerDashboardHeaderPrefetch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يسخّن الملف والتبويب عند hover الهيدر', async () => {
        const primeProfileTabMount = vi.fn();
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-1', {
            primeProfileTabMount,
        });

        prefetch.onProfilePointerEnter();

        await vi.waitFor(() => {
            expect(warmProfileOnHover).toHaveBeenCalledWith('lawyer-1');
        });
        expect(primeProfileTabMount).toHaveBeenCalledTimes(1);
    });

    it('عند pointer down: prime + load hub — بلا warmOnOpen/loadRoyal المباشر', async () => {
        const primeProfileTabMount = vi.fn();
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-2', {
            primeProfileTabMount,
        });

        prefetch.onProfilePointerDown();

        expect(primeProfileTabMount).toHaveBeenCalledTimes(1);
        expect(warmProfileOnOpen).not.toHaveBeenCalled();
        expect(loadRoyalLawyerProfileModule).not.toHaveBeenCalled();
        await vi.waitFor(() => {
            expect(loadProfileHubModule).toHaveBeenCalledTimes(1);
            expect(dispatchProfilePrimeHost).toHaveBeenCalled();
        });
    });

    it('لا يسخّن الملف عند الإغلاق (profileIsOpen)', () => {
        const primeProfileTabMount = vi.fn();
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-3', {
            primeProfileTabMount,
            profileIsOpen: true,
        });

        prefetch.onProfilePointerEnter();
        prefetch.onProfilePointerDown();

        expect(warmProfileOnHover).not.toHaveBeenCalled();
        expect(primeProfileTabMount).not.toHaveBeenCalled();
        expect(loadProfileHubModule).not.toHaveBeenCalled();
    });

    it('يسخّن الملف خفيفاً عند hover', async () => {
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-2');

        prefetch.onProfilePointerEnter();

        await vi.waitFor(() => {
            expect(warmProfileOnHover).toHaveBeenCalledWith('lawyer-2');
        });
        expect(warmProfileOnOpen).not.toHaveBeenCalled();
    });

    it('يسخّن الإعدادات بالكامل عند pointer down', async () => {
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-1');

        prefetch.onSettingsPointerDown();

        await vi.waitFor(() => {
            expect(primeSettingsShellForOpen).toHaveBeenCalledTimes(1);
        });
        await vi.waitFor(() => {
            expect(dispatchSettingsPrimeHost).toHaveBeenCalledTimes(1);
        });
        expect(loadHamiSettingsModule).toHaveBeenCalled();
        expect(warmSettingsOnHover).not.toHaveBeenCalled();
    });

    it('يسخّن الإعدادات chunk عند hover', async () => {
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-1');

        prefetch.onSettingsPointerEnter();

        await vi.waitFor(() => {
            expect(warmSettingsOnHover).toHaveBeenCalledTimes(1);
        });
        await vi.waitFor(() => {
            expect(loadHamiSettingsModule).toHaveBeenCalledTimes(1);
        });
        expect(primeSettingsShellForOpen).not.toHaveBeenCalled();
    });

    it('يسخّن الإشعارات عند pointer down عبر warmOnOpen + chunk', async () => {
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-1');

        prefetch.onNotificationsPointerDown();

        await vi.waitFor(() => {
            expect(warmNotificationsOnOpen).toHaveBeenCalledWith('lawyer-1');
        });
        await vi.waitFor(() => {
            expect(loadNotificationPanelModule).toHaveBeenCalledTimes(1);
        });
        expect(warmNotificationsOnHover).not.toHaveBeenCalled();
    });

    it('يسخّن الإشعارات خفيفاً عند hover', async () => {
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-1');

        prefetch.onNotificationsPointerEnter();

        await vi.waitFor(() => {
            expect(warmNotificationsOnHover).toHaveBeenCalledTimes(1);
        });
        expect(warmNotificationsOnOpen).not.toHaveBeenCalled();
    });

    it('يسخّن البحث عند pointer down — chunk + loadModule بلا warmOnOpen', async () => {
        const primeGlobalSearchShellMount = vi.fn();
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-1', {
            primeGlobalSearchShellMount,
        });

        prefetch.onSearchPointerDown();

        await vi.waitFor(() => {
            expect(prefetchGlobalSearchOverlayChunk).toHaveBeenCalledTimes(1);
            expect(loadGlobalSearchOverlayModule).toHaveBeenCalledTimes(1);
        });
        expect(primeGlobalSearchShellMount).toHaveBeenCalledTimes(1);
        expect(warmGlobalSearchOnOpen).not.toHaveBeenCalled();
    });

    it('يسخّن البحث خفيفاً عند hover', async () => {
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-1');

        prefetch.onSearchPointerEnter();

        await vi.waitFor(() => {
            expect(warmGlobalSearchOnHover).toHaveBeenCalledTimes(1);
        });
        expect(warmGlobalSearchOnOpen).not.toHaveBeenCalled();
    });
});
