import type { ComponentType } from 'react';
import type { SettingsSectionId } from '@/app/services/settings';
import { loadSettingsSection } from './settingsSectionLoader';

type SectionModule = Awaited<ReturnType<typeof loadSettingsSection>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resolved = new Map<SettingsSectionId, ComponentType<any>>();

function pickSectionComponent(id: SettingsSectionId, mod: SectionModule): ComponentType<any> | null {
    switch (id) {
        case 'appearance':
            return mod.AppearanceSection ?? null;
        case 'security':
            return mod.SecuritySection ?? null;
        case 'data':
            return mod.DataSection ?? null;
        case 'account':
            return mod.AccountSection ?? null;
        default:
            return null;
    }
}

export function getResolvedSettingsSection(id: SettingsSectionId): ComponentType<any> | null {
    return resolved.get(id) ?? null;
}

export async function resolveSettingsSectionComponent(
    id: SettingsSectionId,
): Promise<ComponentType<any> | null> {
    const cached = resolved.get(id);
    if (cached) return cached;

    const mod = await loadSettingsSection(id);
    const component = pickSectionComponent(id, mod);
    if (component) {
        resolved.set(id, component);
    }
    return component;
}

/** تحميل كل أقسام الإعدادات — قبل الفتح أو عند pointerdown */
export async function preloadAllSettingsSectionComponents(): Promise<void> {
    const ids: SettingsSectionId[] = ['appearance', 'security', 'data', 'account'];
    await Promise.all(ids.map((id) => resolveSettingsSectionComponent(id)));
}

export function resetSettingsSectionRegistryForTests(): void {
    resolved.clear();
}
