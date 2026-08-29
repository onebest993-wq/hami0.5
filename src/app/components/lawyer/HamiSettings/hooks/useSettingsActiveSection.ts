import { useCallback, useEffect, useState } from 'react';
import type { SettingsSectionId } from '@/app/services/settings/types';
import {
    persistSettingsSection,
    readPersistedSettingsSection,
} from '@/app/services/settings/settingsSectionPersistence';

export function useSettingsActiveSection(open: boolean): {
    activeSection: SettingsSectionId;
    handleSectionChange: (sectionId: SettingsSectionId) => void;
} {
    const [activeSection, setActiveSection] = useState<SettingsSectionId>(readPersistedSettingsSection);

    useEffect(() => {
        if (!open) return;
        persistSettingsSection(activeSection);
    }, [activeSection, open]);

    const handleSectionChange = useCallback((sectionId: SettingsSectionId) => {
        setActiveSection((current) => (current === sectionId ? current : sectionId));
    }, []);

    return { activeSection, handleSectionChange };
}
