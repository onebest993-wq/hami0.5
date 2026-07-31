import type { ComponentType } from 'react';
import type { SettingsSectionId } from '@/app/services/settings';
import { loadSettingsSection } from './settingsSectionLoader';
import { AppearanceSection } from './appearance/AppearanceSection';

type SectionModule = Awaited<ReturnType<typeof loadSettingsSection>>;
type SettingsSectionComponent = ComponentType<object>;

const resolved = new Map<SettingsSectionId, SettingsSectionComponent>();

/* المظهر sync — بلا pulse تحميل داخلي عند فتح مركز الإعدادات */
resolved.set('appearance', AppearanceSection as SettingsSectionComponent);

function pickSectionComponent(id: SettingsSectionId, mod: SectionModule): SettingsSectionComponent | null {
    switch (id) {
        case 'appearance':
            return (mod.AppearanceSection as SettingsSectionComponent | undefined) ?? null;
        case 'security':
            return (mod.SecuritySection as SettingsSectionComponent | undefined) ?? null;
        case 'data':
            return (mod.DataSection as SettingsSectionComponent | undefined) ?? null;
        case 'account':
            return (mod.AccountSection as SettingsSectionComponent | undefined) ?? null;
        default:
            return null;
    }
}

export function getResolvedSettingsSection(id: SettingsSectionId): SettingsSectionComponent | null {
    return resolved.get(id) ?? null;
}

export async function resolveSettingsSectionComponent(
    id: SettingsSectionId,
): Promise<SettingsSectionComponent | null> {
    const cached = resolved.get(id);
    if (cached) return cached;

    const mod = await loadSettingsSection(id);
    const component = pickSectionComponent(id, mod);
    if (component) {
        resolved.set(id, component);
    }
    return component;
}

export async function preloadAllSettingsSectionComponents(): Promise<void> {
    const ids: SettingsSectionId[] = ['appearance', 'security', 'data', 'account'];
    await Promise.all(ids.map((id) => resolveSettingsSectionComponent(id)));
}

export function resetSettingsSectionRegistryForTests(): void {
    resolved.clear();
    resolved.set('appearance', AppearanceSection as SettingsSectionComponent);
}
