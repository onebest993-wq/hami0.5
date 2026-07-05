import { warmGlobalSearchOnHover, warmGlobalSearchOnOpen } from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';
import { loadGlobalSearchOverlayModule } from '@/app/runtime/globalSearchLoader';
import { warmProfileOnHover, warmProfileOnOpen } from '@/app/hooks/lawyerDashboard/profileIntentWarm';
import { loadRoyalLawyerProfileModule } from '@/app/runtime/royalLawyerProfileLoader';
import { warmSettingsOnHover, warmSettingsOnOpen, primeSettingsShellForOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';
import { loadHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';
import { preloadAllSettingsSectionComponents } from '@/app/components/lawyer/HamiSettings/settingsSectionRegistry';
import {
    warmNotificationsOnHover,
} from '@/app/hooks/lawyerDashboard/notificationIntentWarm';
import { loadNotificationPanelModule } from '@/app/runtime/notificationPanelLoader';
import { warmVaultOnHover } from '@/app/hooks/lawyerDashboard/vaultIntentWarm';

/** معالجات prefetch ثابتة — تُكمَّل بمعرّف المستخدم من الهيدر عند التوصيل */
export function createLawyerDashboardHeaderPrefetch(
    userId?: string | null,
    opts?: {
        primeGlobalSearchShellMount?: () => void;
        primeProfileTabMount?: () => void;
        primeVaultShellMount?: () => void;
    },
) {
    const resolvedId = userId?.trim() || null;
    const prefetchNotificationsHover = () => {
        warmNotificationsOnHover();
    };
    const prefetchNotificationsPress = () => {
        warmNotificationsOnHover();
        void loadNotificationPanelModule().catch(() => undefined);
    };
    const prefetchSettingsHover = () => {
        warmSettingsOnHover();
        void loadHamiSettingsModule().catch(() => undefined);
    };
    const prefetchSettingsPress = () => {
        primeSettingsShellForOpen();
        void Promise.all([
            loadHamiSettingsModule(),
            preloadAllSettingsSectionComponents(),
        ]).catch(() => undefined);
    };
    const prefetchProfileHover = () => {
        warmProfileOnHover(resolvedId);
        opts?.primeProfileTabMount?.();
    };
    const prefetchProfilePress = () => {
        warmProfileOnOpen(resolvedId);
        void loadRoyalLawyerProfileModule(resolvedId).catch(() => undefined);
        opts?.primeProfileTabMount?.();
    };
    const prefetchSearchHover = () => {
        warmGlobalSearchOnHover();
        opts?.primeGlobalSearchShellMount?.();
    };
    const prefetchSearchPress = () => {
        warmGlobalSearchOnOpen();
        void loadGlobalSearchOverlayModule().catch(() => undefined);
        opts?.primeGlobalSearchShellMount?.();
    };
    const prefetchVault = () => {
        warmVaultOnHover();
        opts?.primeVaultShellMount?.();
    };
    return {
        onProfilePointerEnter: prefetchProfileHover,
        onProfilePointerDown: prefetchProfilePress,
        onSearchPointerEnter: prefetchSearchHover,
        onSearchPointerDown: prefetchSearchPress,
        onNotificationsPointerEnter: prefetchNotificationsHover,
        onNotificationsPointerDown: prefetchNotificationsPress,
        onSettingsPointerEnter: prefetchSettingsHover,
        onSettingsPointerDown: prefetchSettingsPress,
        onVaultPointerEnter: prefetchVault,
        onVaultPointerDown: prefetchVault,
    } as const;
}

/** @deprecated استخدم createLawyerDashboardHeaderPrefetch */
export const lawyerDashboardHeaderPrefetch = createLawyerDashboardHeaderPrefetch();
