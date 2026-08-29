/**
 * الإعدادات — يُركَّب من FullBootPath (فوق HomeFirstPaint) بلا Suspense/InstantShell.
 * Host يضم المحتوى sync — فتح الترس يرسم مركز الإعدادات الحقيقي فوراً.
 */
import React from 'react';
import { HamiSettingsHost } from '@/app/components/lawyer/HamiSettings/HamiSettingsHost';
import { resolveShellAuthUserId } from '@/app/services/auth/shellAuth';

type LawyerDashboardSettingsOverlayEntryProps = {
    shell: {
        userId: string;
        authUserId?: string | null;
        onLogout: (options?: { skipLocalPurge?: boolean }) => void | Promise<void>;
    };
    overlays: {
        showSettings: boolean;
        settingsHostMounted: boolean;
        settingsSessionKey: number;
        closeSettings: () => void;
        resetSettingsShell: () => void;
    };
};

export function LawyerDashboardSettingsOverlayEntry({
    shell,
    overlays,
}: LawyerDashboardSettingsOverlayEntryProps) {
    const { userId, authUserId, onLogout } = shell;
    const {
        showSettings,
        settingsHostMounted,
        settingsSessionKey,
        closeSettings,
        resetSettingsShell,
    } = overlays;

    const settingsUserId = resolveShellAuthUserId(authUserId, userId);
    const shouldMount = showSettings || settingsHostMounted;

    if (!shouldMount) return null;

    return (
        <HamiSettingsHost
            key={`hami-settings-${settingsSessionKey}`}
            open={showSettings}
            keepAlive={settingsHostMounted}
            userId={settingsUserId}
            onShellReset={resetSettingsShell}
            onClose={closeSettings}
            onLogout={onLogout}
        />
    );
}
