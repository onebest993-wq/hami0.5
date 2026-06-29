import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createLawyerDashboardHeaderPrefetch } from '@/app/hooks/lawyerDashboard/lawyerDashboardHeaderPrefetch';

vi.mock('@/app/hooks/lawyerDashboard/profileIntentWarm', () => ({
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
}));

vi.mock('@/app/hooks/lawyerDashboard/notificationIntentWarm', () => ({
    warmNotificationsOnHover: vi.fn(),
    warmNotificationsOnOpen: vi.fn(),
}));

vi.mock('@/app/runtime/royalLawyerProfileLoader', () => ({
    loadRoyalLawyerProfileModule: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/app/runtime/notificationPanelLoader', () => ({
    loadNotificationPanelModule: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/app/runtime/globalSearchLoader', () => ({
    loadGlobalSearchOverlayModule: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/app/hooks/lawyerDashboard/vaultIntentWarm', () => ({
    warmVaultOnHover: vi.fn(),
}));

import { warmProfileOnHover, warmProfileOnOpen } from '@/app/hooks/lawyerDashboard/profileIntentWarm';
import { warmSettingsOnHover, warmSettingsOnOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';
import { warmNotificationsOnHover, warmNotificationsOnOpen } from '@/app/hooks/lawyerDashboard/notificationIntentWarm';
import { loadNotificationPanelModule } from '@/app/runtime/notificationPanelLoader';
import { loadGlobalSearchOverlayModule } from '@/app/runtime/globalSearchLoader';
import { loadRoyalLawyerProfileModule } from '@/app/runtime/royalLawyerProfileLoader';
import { warmGlobalSearchOnHover, warmGlobalSearchOnOpen } from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';

describe('createLawyerDashboardHeaderPrefetch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يسخّن الملف والتبويب عند hover الهيدر', () => {
        const primeProfileTabMount = vi.fn();
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-1', {
            primeProfileTabMount,
        });

        prefetch.onProfilePointerEnter();

        expect(warmProfileOnHover).toHaveBeenCalledWith('lawyer-1');
        expect(primeProfileTabMount).toHaveBeenCalledTimes(1);
    });

    it('يسخّن الملف عند pointer down بالكامل', () => {
        const primeProfileTabMount = vi.fn();
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-2', {
            primeProfileTabMount,
        });

        prefetch.onProfilePointerDown();

        expect(warmProfileOnOpen).toHaveBeenCalledWith('lawyer-2');
        expect(loadRoyalLawyerProfileModule).toHaveBeenCalledWith('lawyer-2');
        expect(primeProfileTabMount).toHaveBeenCalledTimes(1);
    });

    it('يسخّن الملف خفيفاً عند hover', () => {
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-2');

        prefetch.onProfilePointerEnter();

        expect(warmProfileOnHover).toHaveBeenCalledWith('lawyer-2');
        expect(warmProfileOnOpen).not.toHaveBeenCalled();
    });

    it('يسخّن الإعدادات خفيفاً عند pointer down — بلا warmOnOpen', () => {
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-1');

        prefetch.onSettingsPointerDown();

        expect(warmSettingsOnHover).toHaveBeenCalledTimes(1);
        expect(warmSettingsOnOpen).not.toHaveBeenCalled();
    });

    it('يسخّن الإعدادات خفيفاً عند hover', () => {
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-1');

        prefetch.onSettingsPointerEnter();

        expect(warmSettingsOnHover).toHaveBeenCalledTimes(1);
        expect(warmSettingsOnOpen).not.toHaveBeenCalled();
    });

    it('يسخّن الإشعارات chunk عند pointer down — بلا warmOnOpen', () => {
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-1');

        prefetch.onNotificationsPointerDown();

        expect(warmNotificationsOnHover).toHaveBeenCalledTimes(1);
        expect(loadNotificationPanelModule).toHaveBeenCalledTimes(1);
        expect(warmNotificationsOnOpen).not.toHaveBeenCalled();
    });

    it('يسخّن الإشعارات خفيفاً عند hover', () => {
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-1');

        prefetch.onNotificationsPointerEnter();

        expect(warmNotificationsOnHover).toHaveBeenCalledTimes(1);
        expect(warmNotificationsOnOpen).not.toHaveBeenCalled();
    });

    it('يسخّن البحث بالكامل عند pointer down', () => {
        const primeGlobalSearchShellMount = vi.fn();
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-1', {
            primeGlobalSearchShellMount,
        });

        prefetch.onSearchPointerDown();

        expect(warmGlobalSearchOnOpen).toHaveBeenCalledTimes(1);
        expect(loadGlobalSearchOverlayModule).toHaveBeenCalledTimes(1);
        expect(primeGlobalSearchShellMount).toHaveBeenCalledTimes(1);
    });

    it('يسخّن البحث خفيفاً عند hover', () => {
        const prefetch = createLawyerDashboardHeaderPrefetch('lawyer-1');

        prefetch.onSearchPointerEnter();

        expect(warmGlobalSearchOnHover).toHaveBeenCalledTimes(1);
        expect(warmGlobalSearchOnOpen).not.toHaveBeenCalled();
    });
});
