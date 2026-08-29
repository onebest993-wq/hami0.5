import React, { Suspense } from 'react';
import { loadSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import type { LawyerDashboardSettingsFeature } from '@/app/components/lawyer/dashboard/createBootChromeFeatureStubs';

const LazySettingsOverlayEntry = lazyWithRetry(() =>
    loadSettingsOverlayEntry().then((m) => ({
        default: m.LawyerDashboardSettingsOverlayEntry as unknown as LazyComponent,
    })),
);

type LawyerDashboardSettingsOverlayPortalProps = {
    settingsFeature: LawyerDashboardSettingsFeature;
    userId: string;
    authUserId?: string;
    onLogout?: (options?: { skipLocalPurge?: boolean }) => void | Promise<void>;
};

/**
 * بوابة الإعدادات خارج MainView — الطلاء الفوري في DOM يغطي انتظار المقطع.
 */
export function LawyerDashboardSettingsOverlayPortal({
    settingsFeature,
    userId,
    authUserId,
    onLogout,
}: LawyerDashboardSettingsOverlayPortalProps) {
    const live = settingsFeature.showSettings || settingsFeature.settingsHostMounted;
    if (!live) return null;

    return (
        <Suspense fallback={null}>
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
