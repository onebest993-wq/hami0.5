import type { SettingsSectionId } from '@/app/services/settings';
import { readPersistedSettingsSection } from './settingsSectionPersistence';

type SectionModule = {
    AppearanceSection?: typeof import('./appearance/AppearanceSection').AppearanceSection;
    SecuritySection?: typeof import('./security/SecuritySection').SecuritySection;
    DataSection?: typeof import('./data/DataSection').DataSection;
    AccountSection?: typeof import('./account/AccountSection').AccountSection;
};

const sectionPromises = new Map<SettingsSectionId, Promise<SectionModule>>();

function loadSectionModule(id: SettingsSectionId): Promise<SectionModule> {
    const cached = sectionPromises.get(id);
    if (cached) return cached;

    const promise = (() => {
        switch (id) {
            case 'appearance':
                return import('./appearance/AppearanceSection');
            case 'security':
                return import('./security/SecuritySection');
            case 'data':
                return import('./data/DataSection');
            case 'account':
                return import('./account/AccountSection');
            default:
                return Promise.resolve({} as SectionModule);
        }
    })();

    sectionPromises.set(id, promise);
    return promise;
}

/** تحميل مسبق لقسم — عند hover/لمس التبويب */
export function prefetchSettingsSection(id: SettingsSectionId): void {
    if (typeof window === 'undefined') return;
    void loadSectionModule(id);
}

/** تحميل مسبق للتبويب المحفوظ — قبل فتح الإعدادات */
export function prefetchPersistedSettingsSection(): void {
    prefetchSettingsSection(readPersistedSettingsSection());
}

export function prefetchAllSettingsSections(): void {
    (['appearance', 'security', 'data', 'account'] as const).forEach((id) => {
        prefetchSettingsSection(id);
    });
}

export async function loadSettingsSection(id: SettingsSectionId): Promise<SectionModule> {
    return loadSectionModule(id);
}
