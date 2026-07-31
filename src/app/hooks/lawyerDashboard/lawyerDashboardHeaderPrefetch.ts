import { loadHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';

import { prefetchProfileHubModule } from '@/app/runtime/profileHubLoader';
import { loadNotificationPanelModule } from '@/app/runtime/notificationPanelLoader';
import {
    loadGlobalSearchOverlayModule,
    prefetchGlobalSearchOverlayChunk,
} from '@/app/runtime/globalSearchLoader';
import { loadSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';

function loadProfileIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/profileIntentWarm');
}

function loadGlobalSearchIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/globalSearchIntentWarm');
}

function loadSettingsIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/settingsIntentWarm');
}

function loadNotificationIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/notificationIntentWarm');
}

function loadVaultIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/vaultIntentWarm');
}

function loadProfileBootHydrator() {
    return import('@/app/runtime/profileBootHydrator');
}

function loadSettingsBootHydrator() {
    return import('@/app/runtime/settingsBootHydrator');
}

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
        void loadNotificationIntentWarm().then((m) => m.warmNotificationsOnHover());
    };
    const prefetchNotificationsPress = () => {
        void loadNotificationIntentWarm().then((m) => m.warmNotificationsOnHover());
        void loadNotificationPanelModule().catch(() => undefined);
    };
    const prefetchSettingsHover = () => {
        void loadSettingsIntentWarm().then((m) => m.warmSettingsOnHover());
        void loadHamiSettingsModule().catch(() => undefined);
    };
    const prefetchSettingsPress = () => {
        void loadSettingsIntentWarm().then((m) => m.primeSettingsShellForOpen());
        void loadSettingsOverlayEntry().catch(() => undefined);
        void loadSettingsBootHydrator().then((m) => m.dispatchSettingsPrimeHost());
    };
    const prefetchProfileHover = () => {
        void loadProfileIntentWarm().then((m) => m.warmProfileOnHover(resolvedId));
        opts?.primeProfileTabMount?.();
    };
    const prefetchProfilePress = () => {
        /*
         * لا warmOnOpen / loadRoyal كامل هنا — ينافس flushSync فتح التبويب على نفس الإطار
         * (مثل إعدادات/بحث). الفتح يستدعي warmProfileOnOpen بعد التزام التبويب.
         */
        prefetchProfileHubModule();
        void loadProfileBootHydrator().then((m) => m.dispatchProfilePrimeHost());
        opts?.primeProfileTabMount?.();
    };
    const prefetchSearchHover = () => {
        void loadGlobalSearchIntentWarm().then((m) => m.warmGlobalSearchOnHover());
        opts?.primeGlobalSearchShellMount?.();
    };
    const prefetchSearchPress = () => {
        /* استيراد ثابت — بلا hop ديناميكي قبل بدء الـ chunk */
        prefetchGlobalSearchOverlayChunk();
        void loadGlobalSearchOverlayModule().catch(() => undefined);
        opts?.primeGlobalSearchShellMount?.();
    };
    const prefetchVault = () => {
        void loadVaultIntentWarm().then((m) => m.warmVaultOnHover());
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
