import type { SettingsSectionId } from '@/app/services/settings';
import { AppearanceSection } from './appearance/AppearanceSection';
import { SecuritySection } from './security/SecuritySection';
import { DataSection } from './data/DataSection';
import { AccountSection } from './account/AccountSection';
import { readPersistedSettingsSection } from './settingsSectionPersistence';

type SectionModule = {
    AppearanceSection?: typeof AppearanceSection;
    SecuritySection?: typeof SecuritySection;
    DataSection?: typeof DataSection;
    AccountSection?: typeof AccountSection;
};

const SECTION_MODULES: Record<SettingsSectionId, SectionModule> = {
    appearance: { AppearanceSection },
    security: { SecuritySection },
    data: { DataSection },
    account: { AccountSection },
};

/** تحميل فوري — الأقسام مُضمَّنة مع shell الإعدادات */
export function loadSettingsSection(id: SettingsSectionId): Promise<SectionModule> {
    return Promise.resolve(SECTION_MODULES[id] ?? {});
}

/** تحميل مسبق لقسم — عند hover/لمس التبويب */
export function prefetchSettingsSection(_id: SettingsSectionId): void {
    /* sync — لا عمل */
}

/** تحميل مسبق للتبويب المحفوظ — قبل فتح الإعدادات */
export function prefetchPersistedSettingsSection(): void {
    readPersistedSettingsSection();
}

export function prefetchAllSettingsSections(): void {
    /* sync — لا عمل */
}
