import type { ComponentType } from 'react';
import type { SettingsSectionId } from '@/app/services/settings';
import { AppearanceSection } from './appearance/AppearanceSection';
import { SecuritySection } from './security/SecuritySection';
import { DataSection } from './data/DataSection';
import { AccountSection } from './account/AccountSection';

type SettingsSectionComponent = ComponentType<object>;

const resolved = new Map<SettingsSectionId, SettingsSectionComponent>();

/* كل التبويبات sync — فتح لحظي بلا skeleton */
resolved.set('appearance', AppearanceSection as SettingsSectionComponent);
resolved.set('security', SecuritySection as SettingsSectionComponent);
resolved.set('data', DataSection as SettingsSectionComponent);
resolved.set('account', AccountSection as SettingsSectionComponent);

export function getResolvedSettingsSection(id: SettingsSectionId): SettingsSectionComponent | null {
    return resolved.get(id) ?? null;
}

export async function resolveSettingsSectionComponent(
    id: SettingsSectionId,
): Promise<SettingsSectionComponent | null> {
    return resolved.get(id) ?? null;
}

export async function preloadAllSettingsSectionComponents(): Promise<void> {
    /* كل الأقسام مُسجَّلة مسبقاً — لا عمل غير متزامن */
}

export function resetSettingsSectionRegistryForTests(): void {
    resolved.clear();
    resolved.set('appearance', AppearanceSection as SettingsSectionComponent);
    resolved.set('security', SecuritySection as SettingsSectionComponent);
    resolved.set('data', DataSection as SettingsSectionComponent);
    resolved.set('account', AccountSection as SettingsSectionComponent);
}
