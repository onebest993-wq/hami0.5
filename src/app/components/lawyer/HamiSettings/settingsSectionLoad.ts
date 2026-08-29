import type { SettingsSectionId } from '@/app/services/settings';
import { prefetchSettingsDialogs } from '@/app/components/lawyer/HamiSettings/settingsDialogPrefetch';

/**
 * الأمن sync على جذع الفتح؛ المنظر/البيانات/الحساب كسولة.
 */
export function prefetchSettingsSection(id: SettingsSectionId): void {
    if (typeof window === 'undefined') return;
    switch (id) {
        case 'security':
            return;
        case 'appearance':
            void import('./appearance/AppearanceSection');
            return;
        case 'data':
            void import('./data/DataSection');
            prefetchSettingsDialogs();
            return;
        case 'account':
            void import('./account/AccountSection');
            prefetchSettingsDialogs();
            return;
    }
}

export function prefetchSecondarySettingsSections(): void {
    prefetchSettingsSection('appearance');
    prefetchSettingsSection('data');
    prefetchSettingsSection('account');
}
