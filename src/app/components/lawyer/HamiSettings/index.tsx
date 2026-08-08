import React, { useCallback, useEffect, useState } from 'react';
import type { SettingsSectionId } from '@/app/services/settings';
import { EnsureLawyerSettingsProvider } from '@/app/context/LawyerSettingsContext';
import { SettingsShell } from './SettingsShell';
import { SettingsSectionRouter } from './SettingsSectionRouter';
import { SettingsErrorBoundary } from './SettingsErrorBoundary';
import { useSettingsLifecycle } from './hooks/useSettingsLifecycle';
import {
    persistSettingsSection,
    readPersistedSettingsSection,
} from './settingsSectionPersistence';
import { prefetchSettingsDialogs, ensureSettingsDialogsReady } from './settingsDialogPrefetch';

export interface HamiSettingsProps {
    onClose: () => void;
    onLogout?: () => void;
    onShellReset?: () => void;
    userId?: string | null;
    /** false مع keep-alive — الإعدادات مخفية لكن mounted */
    open?: boolean;
    /** يبقي shellHydrated بعد الإغلاق */
    keepAlive?: boolean;
}

export const HamiSettings = ({
    onClose,
    onLogout,
    onShellReset,
    userId,
    open = true,
    keepAlive = false,
}: HamiSettingsProps) => {
    const [activeSection, setActiveSection] = useState<SettingsSectionId>(readPersistedSettingsSection);
    const [shellHydrated, setShellHydrated] = useState(false);

    useEffect(() => {
        if (!open && !keepAlive) setShellHydrated(false);
    }, [keepAlive, open]);

    useSettingsLifecycle(open, activeSection, userId, () => setShellHydrated(true));

    useEffect(() => {
        if (!open) return;
        void ensureSettingsDialogsReady();
    }, [open]);

    useEffect(() => {
        persistSettingsSection(activeSection);
    }, [activeSection]);

    const handleSectionChange = useCallback((sectionId: SettingsSectionId) => {
        setActiveSection(sectionId);
    }, []);

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
                        accountProps={{ onLogout }}
                    />
                </SettingsShell>
            </EnsureLawyerSettingsProvider>
        </SettingsErrorBoundary>
    );
};
