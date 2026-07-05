import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
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
import { loadSettingsSection, prefetchSettingsSection } from './settingsSectionLoader';
import { resolveSettingsSectionComponent } from './settingsSectionRegistry';

export interface HamiSettingsProps {
    onClose: () => void;
    onLogout?: () => void;
    onEnterHomeLayoutEdit?: () => void;
    onShellReset?: () => void;
    userId?: string | null;
    /** false مع keep-alive — الإعدادات مخفية لكن mounted */
    open?: boolean;
}

export const HamiSettings = ({
    onClose,
    onLogout,
    onEnterHomeLayoutEdit,
    onShellReset,
    userId,
    open = true,
}: HamiSettingsProps) => {
    const [activeSection, setActiveSection] = useState<SettingsSectionId>(readPersistedSettingsSection);
    const [shellHydrated, setShellHydrated] = useState(false);

    useEffect(() => {
        if (!open) setShellHydrated(false);
    }, [open]);

    useSettingsLifecycle(open, activeSection, userId, () => setShellHydrated(true));

    useLayoutEffect(() => {
        if (!open) return;
        void loadSettingsSection(activeSection).catch(() => undefined);
    }, [activeSection, open]);

    useEffect(() => {
        persistSettingsSection(activeSection);
    }, [activeSection]);

    const handleSectionChange = useCallback((sectionId: SettingsSectionId) => {
        prefetchSettingsSection(sectionId);
        void resolveSettingsSectionComponent(sectionId);
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
                        onEnterHomeLayoutEdit={onEnterHomeLayoutEdit}
                        open={open}
                        accountProps={{ onLogout }}
                    />
                </SettingsShell>
            </EnsureLawyerSettingsProvider>
        </SettingsErrorBoundary>
    );
};
