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

export interface HamiSettingsProps {
    onClose: () => void;
    onEnterHomeLayoutEdit?: () => void;
    onLogout?: () => void;
    onOpenProfile?: () => void;
    onOpenPrivacy?: () => void;
    onShellReset?: () => void;
    userId?: string | null;
    /** false مع keep-alive — الإعدادات مخفية لكن mounted */
    open?: boolean;
}

export const HamiSettings = ({
    onClose,
    onEnterHomeLayoutEdit,
    onLogout,
    onOpenProfile,
    onOpenPrivacy,
    onShellReset,
    userId,
    open = true,
}: HamiSettingsProps) => {
    const [activeSection, setActiveSection] = useState<SettingsSectionId>(readPersistedSettingsSection);

    useSettingsLifecycle(open, activeSection, userId);

    useLayoutEffect(() => {
        if (!open) return;
        void loadSettingsSection(activeSection).catch(() => undefined);
    }, [activeSection, open]);

    useEffect(() => {
        persistSettingsSection(activeSection);
    }, [activeSection]);

    const handleSectionChange = useCallback((sectionId: SettingsSectionId) => {
        prefetchSettingsSection(sectionId);
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
                >
                    <SettingsSectionRouter
                        activeSection={activeSection}
                        onClose={onClose}
                        onEnterHomeLayoutEdit={onEnterHomeLayoutEdit}
                        open={open}
                        accountProps={{ onLogout, onOpenProfile, onOpenPrivacy }}
                    />
                </SettingsShell>
            </EnsureLawyerSettingsProvider>
        </SettingsErrorBoundary>
    );
};
