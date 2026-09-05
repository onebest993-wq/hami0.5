import { useCallback, useEffect, useRef, useState } from 'react';
import type { SettingsSectionId } from '@/app/services/settings/types';
import { isSettingsSectionId } from '@/app/services/settings/nav';
import {
    persistSettingsSection,
    readPersistedSettingsSection,
} from '@/app/services/settings/settingsSectionPersistence';
import { dismissSettingsSmartDialogs } from '@/app/components/ui/smartDialogBus';
import { SETTINGS_INSTANT_SECTION_EVENT } from '@/app/runtime/settingsShellEvents';

export function useSettingsActiveSection(open: boolean): {
    activeSection: SettingsSectionId;
    handleSectionChange: (sectionId: SettingsSectionId) => void;
} {
    const [activeSection, setActiveSection] = useState<SettingsSectionId>(readPersistedSettingsSection);
    const activeSectionRef = useRef(activeSection);
    activeSectionRef.current = activeSection;

    useEffect(() => {
        if (!open) return;
        persistSettingsSection(activeSection);
    }, [activeSection, open]);

    const handleSectionChange = useCallback((sectionId: SettingsSectionId) => {
        if (activeSectionRef.current === sectionId) return;
        dismissSettingsSmartDialogs();
        setActiveSection(sectionId);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onInstantSection = (event: Event) => {
            const id = (event as CustomEvent<unknown>).detail;
            if (!isSettingsSectionId(id)) return;
            handleSectionChange(id);
        };
        window.addEventListener(SETTINGS_INSTANT_SECTION_EVENT, onInstantSection);
        return () => window.removeEventListener(SETTINGS_INSTANT_SECTION_EVENT, onInstantSection);
    }, [handleSectionChange]);

    return { activeSection, handleSectionChange };
}
