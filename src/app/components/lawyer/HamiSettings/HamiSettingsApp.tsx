import React, { useEffect, useState } from 'react';
import { EnsureLawyerSettingsProvider } from '@/app/context/LawyerSettingsContext';
import { SettingsShell } from './SettingsShell';
import { SettingsSectionRouter } from './SettingsSectionRouter';
import { SettingsErrorBoundary } from './SettingsErrorBoundary';
import { useSettingsActiveSection } from './hooks/useSettingsActiveSection';
import { useSettingsLifecycle } from './hooks/useSettingsLifecycle';
import { useSettingsSectionWarm } from './hooks/useSettingsSectionWarm';
import type { HamiSettingsProps } from './hamiSettingsTypes';

export type { HamiSettingsProps };

export const HamiSettings = ({
    onClose,
    onLogout,
    onShellReset,
    userId,
    open = true,
    keepAlive = false,
}: HamiSettingsProps) => {
    const { activeSection, handleSectionChange } = useSettingsActiveSection(open);
    const [shellHydrated, setShellHydrated] = useState(false);

    useEffect(() => {
        if (!open && !keepAlive) setShellHydrated(false);
    }, [keepAlive, open]);

    useSettingsLifecycle(open, activeSection, userId, () => setShellHydrated(true));
    useSettingsSectionWarm(open || keepAlive, activeSection);

    return (
        <SettingsErrorBoundary onClose={onClose} onShellReset={onShellReset}>
            <EnsureLawyerSettingsProvider>
                <SettingsShell
                    onClose={onClose}
                    activeSection={activeSection}
                    onSectionChange={handleSectionChange}
                    open={open}
                    hydrated={shellHydrated}
                >
                    <SettingsSectionRouter
                        activeSection={activeSection}
                        onClose={onClose}
                        open={open}
                        accountProps={{ onLogout, userId }}
                    />
                </SettingsShell>
            </EnsureLawyerSettingsProvider>
        </SettingsErrorBoundary>
    );
};
