import React, { Suspense } from 'react';
import {
    LazySettingsOverlayEntry,
    loadSettingsOverlayEntry,
} from '@/app/runtime/settingsOverlayEntryLoader';
import { SettingsInstantPaintCover } from '@/app/components/lawyer/dashboard/SettingsInstantPaintCover';
import type { LawyerDashboardSettingsFeature } from '@/app/components/lawyer/dashboard/createBootChromeFeatureStubs';

export { loadSettingsOverlayEntry };

type LawyerDashboardSettingsOverlayPortalProps = {
    settingsFeature: LawyerDashboardSettingsFeature;
    userId: string;
    authUserId?: string;
    onLogout?: (options?: { skipLocalPurge?: boolean }) => void | Promise<void>;
};

/**
 * بوابة الإعدادات خارج MainView — الطلاء الفوري في DOM يغطي انتظار المقطع.
 * بعد التسخين تُرسم مباشرة بلا إطار React.lazy.
 */
export function LawyerDashboardSettingsOverlayPortal({
    settingsFeature,
    userId,
    authUserId,
    onLogout,
}: LawyerDashboardSettingsOverlayPortalProps) {
    const live = settingsFeature.showSettings || settingsFeature.settingsHostMounted;
    if (!live) return null;

    void loadSettingsOverlayEntry();

    return (
        <Suspense fallback={<SettingsInstantPaintCover />}>
            <LazySettingsOverlayEntry
                shell={{
                    userId,
                    authUserId,
                    onLogout: onLogout ?? (() => undefined),
                }}
                overlays={{
                    showSettings: settingsFeature.showSettings,
                    settingsHostMounted: settingsFeature.settingsHostMounted,
                    settingsSessionKey: settingsFeature.settingsSessionKey,
                    closeSettings: settingsFeature.closeSettings,
                    resetSettingsShell: settingsFeature.resetSettingsShell,
                }}
            />
        </Suspense>
    );
}
