import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: vi.fn(() => false),
}));

vi.mock('@/app/services/settings/settingsRuntime', () => ({
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { localOnlyMode: false },
        performance: { prefetchScreens: true, litePerformance: false },
    })),
}));

vi.mock('@/app/hooks/lawyerDashboard/settingsIntentWarm', () => ({
    warmSettingsOnHover: vi.fn(),
    warmSettingsOnOpen: vi.fn(),
}));

vi.mock('@/app/hooks/lawyerDashboard/notificationIntentWarm', () => ({
    warmNotificationsOnHover: vi.fn(),
    warmNotificationsOnOpen: vi.fn(),
}));

vi.mock('@/app/hooks/lawyerDashboard/globalSearchIntentWarm', () => ({
    warmGlobalSearchOnHover: vi.fn(),
    warmGlobalSearchOnOpen: vi.fn(),
}));

vi.mock('@/app/hooks/lawyerDashboard/profileIntentWarm', () => ({
    warmProfileOnHover: vi.fn(),
    warmProfileOnOpen: vi.fn(),
}));

vi.mock('@/app/runtime/hamiSettingsLoader', () => ({
    loadHamiSettingsModule: vi.fn(() => Promise.resolve({})),
    prefetchHamiSettingsModule: vi.fn(),
}));

vi.mock('@/app/runtime/settingsOverlayEntryLoader', () => ({
    prefetchSettingsOverlayEntry: vi.fn(),
}));

vi.mock('@/app/runtime/settingsBootHydrator', () => ({
    hydrateSettingsShellForInstantOpen: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/app/runtime/notificationPanelLoader', () => ({
    loadNotificationPanelModule: vi.fn(() => Promise.resolve({})),
    prefetchNotificationPanel: vi.fn(),
}));

vi.mock('@/app/runtime/globalSearchLoader', () => ({
    loadGlobalSearchOverlayModule: vi.fn(() => Promise.resolve({})),
    loadGlobalSearchOverlayWithEngine: vi.fn(() => Promise.resolve({})),
    prefetchGlobalSearchOverlay: vi.fn(),
    prefetchGlobalSearchOverlayChunk: vi.fn(),
    prefetchGlobalSearchSearchEngine: vi.fn(),
}));

vi.mock('@/app/runtime/royalLawyerProfileLoader', () => ({
    loadRoyalLawyerProfileModule: vi.fn(() => Promise.resolve({})),
    loadRoyalLawyerProfileWithData: vi.fn(() => Promise.resolve({})),
    prefetchRoyalLawyerProfile: vi.fn(),
    prefetchRoyalLawyerProfileChunk: vi.fn(),
}));

vi.mock('@/app/runtime/profileBootHydrator', () => ({
    hydrateProfileShellForInstantOpenWithData: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/app/runtime/profileHubLoader', () => ({
    prefetchProfileHubModule: vi.fn(),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

import { prefetchHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';
import { prefetchSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';
import {
    loadNotificationPanelModule,
    prefetchNotificationPanel,
} from '@/app/runtime/notificationPanelLoader';
import { hydrateSettingsShellForInstantOpen } from '@/app/runtime/settingsBootHydrator';
import {
    loadGlobalSearchOverlayWithEngine,
    prefetchGlobalSearchOverlayChunk,
} from '@/app/runtime/globalSearchLoader';
import { loadRoyalLawyerProfileWithData } from '@/app/runtime/royalLawyerProfileLoader';
import { warmSettingsOnHover, warmSettingsOnOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';
import { warmNotificationsOnHover, warmNotificationsOnOpen } from '@/app/hooks/lawyerDashboard/notificationIntentWarm';
import { warmGlobalSearchOnHover, warmGlobalSearchOnOpen } from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';
import { warmProfileOnHover, warmProfileOnOpen } from '@/app/hooks/lawyerDashboard/profileIntentWarm';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import {
    hydrateLawyerDashboardHeaderShellChunks,
    preloadLawyerDashboardHeaderShellChunks,
    resetHeaderShellIntentWarmForTests,
    shouldAggressiveHeaderShellWarm,
    warmLawyerDashboardHeaderShell,
} from '@/app/hooks/lawyerDashboard/headerShellIntentWarm';

describe('headerShellIntentWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetHeaderShellIntentWarmForTests();
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: true, litePerformance: false },
        } as never);
    });

    it('shouldAggressiveHeaderShellWarm يحترم تعطيل prefetchScreens', async () => {
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: false, litePerformance: false },
        } as never);
        await expect(shouldAggressiveHeaderShellWarm()).resolves.toBe(false);
    });

    it('warmLawyerDashboardHeaderShell — تسخين كامل للمستخدم المسجّل', async () => {
        warmLawyerDashboardHeaderShell('lawyer-1');

        await vi.waitFor(() => {
            expect(warmSettingsOnOpen).toHaveBeenCalledTimes(1);
        });
        expect(warmNotificationsOnOpen).toHaveBeenCalledWith('lawyer-1');
        expect(warmGlobalSearchOnOpen).toHaveBeenCalledTimes(1);
        expect(warmProfileOnOpen).toHaveBeenCalledWith('lawyer-1');
    });

    it('warmLawyerDashboardHeaderShell — خفيف عند تعطيل prefetch', async () => {
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: false, litePerformance: false },
        } as never);

        warmLawyerDashboardHeaderShell('lawyer-1');

        await vi.waitFor(() => {
            expect(warmSettingsOnHover).toHaveBeenCalledTimes(1);
        });
        expect(warmNotificationsOnHover).toHaveBeenCalledTimes(1);
        expect(warmGlobalSearchOnHover).toHaveBeenCalledTimes(1);
        expect(warmProfileOnHover).toHaveBeenCalledWith('lawyer-1');
    });

    it('warmLawyerDashboardHeaderShell يتخطى بدون معرّف', () => {
        warmLawyerDashboardHeaderShell(null);
        expect(warmSettingsOnOpen).not.toHaveBeenCalled();
        expect(warmSettingsOnHover).not.toHaveBeenCalled();
    });

    it('preloadLawyerDashboardHeaderShellChunks — prefetch فقط بلا تحميل كامل', async () => {
        preloadLawyerDashboardHeaderShellChunks();

        expect(prefetchHamiSettingsModule).toHaveBeenCalledTimes(1);
        expect(prefetchSettingsOverlayEntry).toHaveBeenCalledTimes(1);
        expect(prefetchNotificationPanel).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => {
            expect(prefetchGlobalSearchOverlayChunk).toHaveBeenCalledTimes(1);
        });
        expect(hydrateSettingsShellForInstantOpen).not.toHaveBeenCalled();
        expect(loadNotificationPanelModule).not.toHaveBeenCalled();
        expect(loadGlobalSearchOverlayWithEngine).not.toHaveBeenCalled();
    });

    it('hydrateLawyerDashboardHeaderShellChunks — hover فوراً ثم تحميل idle متدرج', async () => {
        hydrateLawyerDashboardHeaderShellChunks('lawyer-1');

        await vi.waitFor(() => {
            expect(warmSettingsOnHover).toHaveBeenCalled();
        });
        expect(warmSettingsOnOpen).not.toHaveBeenCalled();
        await vi.waitFor(() => {
            expect(hydrateSettingsShellForInstantOpen).toHaveBeenCalled();
        });
        await vi.waitFor(() => {
            expect(loadNotificationPanelModule).toHaveBeenCalled();
        });
        await vi.waitFor(() => {
            expect(loadGlobalSearchOverlayWithEngine).toHaveBeenCalled();
        });
        await vi.waitFor(() => {
            expect(loadRoyalLawyerProfileWithData).toHaveBeenCalledWith('lawyer-1');
        });
    });

    it('hydrateLawyerDashboardHeaderShellChunks — idempotent', async () => {
        hydrateLawyerDashboardHeaderShellChunks('lawyer-1');
        hydrateLawyerDashboardHeaderShellChunks('lawyer-1');

        await vi.waitFor(() => {
            expect(warmSettingsOnHover).toHaveBeenCalledTimes(1);
        });
    });
});
