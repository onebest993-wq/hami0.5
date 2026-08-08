import React from 'react';
import { HamiSettingsHost } from '@/app/components/lawyer/HamiSettings/HamiSettingsHost';
import { resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import type { LawyerDashboardOverlaysBundleProps } from '../lawyerDashboardOverlaysBundles';

/**
 * الإعدادات — Entry sync على MainView (بلا Suspense)؛ Host دافئ من orchestration.
 */
export function LawyerDashboardSettingsOverlayEntry({
    shell,
    overlays,
}: Pick<LawyerDashboardOverlaysBundleProps, 'shell' | 'overlays'>) {
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
