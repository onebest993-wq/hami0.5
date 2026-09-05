import { SETTINGS_DEFAULT_SECTION, isSettingsSectionId, type SettingsSectionId } from './nav';

export const SETTINGS_SECTION_STORAGE_KEY = 'hami:settings-active-section';

export function readPersistedSettingsSection(): SettingsSectionId {
    if (typeof window === 'undefined') return SETTINGS_DEFAULT_SECTION;
    try {
        const stored = sessionStorage.getItem(SETTINGS_SECTION_STORAGE_KEY);
        if (isSettingsSectionId(stored)) return stored;
    } catch {
        /* ignore */
    }
    return SETTINGS_DEFAULT_SECTION;
}

export function persistSettingsSection(section: SettingsSectionId): void {
    try {
        sessionStorage.setItem(SETTINGS_SECTION_STORAGE_KEY, section);
    } catch {
        /* ignore */
    }
}
