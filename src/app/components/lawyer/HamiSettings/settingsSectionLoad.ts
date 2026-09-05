import type { SettingsSectionId } from '@/app/services/settings/types';
import { prefetchSettingsDialogs } from '@/app/components/lawyer/HamiSettings/settingsDialogPrefetch';

let appearanceLoader: Promise<{
    default: (typeof import('./appearance/AppearanceSection'))['AppearanceSection'];
}> | null = null;
let dataLoader: Promise<{
    default: (typeof import('./data/DataSection'))['DataSection'];
}> | null = null;
let accountLoader: Promise<{
    default: (typeof import('./account/AccountSection'))['AccountSection'];
}> | null = null;

export function loadAppearanceSection() {
    appearanceLoader ??= import('./appearance/AppearanceSection').then((m) => ({
        default: m.AppearanceSection,
    }));
    return appearanceLoader;
}

export function loadDataSection() {
    dataLoader ??= import('./data/DataSection').then((m) => ({
        default: m.DataSection,
    }));
    return dataLoader;
}

export function loadAccountSection() {
    accountLoader ??= import('./account/AccountSection').then((m) => ({
        default: m.AccountSection,
    }));
    return accountLoader;
}

/**
 * الأمن sync على جذع الفتح؛ المنظر/البيانات/الحساب كسولة عند نية التبويب فقط.
 * الحوارات الثقيلة تُسخَّن فقط عند طلب تبويب البيانات أو الحساب.
 * خمول المنزل لا يستدعي هذه الدالة — فقط نية تبويب أو مركز مفتوح.
 */
export function prefetchSettingsSection(id: SettingsSectionId): void {
    if (typeof window === 'undefined') return;
    switch (id) {
        case 'security':
            return;
        case 'appearance':
            void loadAppearanceSection();
            return;
        case 'data':
            void loadDataSection();
            prefetchSettingsDialogs();
            return;
        case 'account':
            void loadAccountSection();
            prefetchSettingsDialogs();
            return;
    }
}

/** بعد فتح المركز — لا من خمول المنزل. يجعل تبديل التبويب بلا شاشة فارغة. */
export function prefetchSettingsOpenTabChunks(): void {
    if (typeof window === 'undefined') return;
    void loadAppearanceSection();
    void loadDataSection();
    void loadAccountSection();
    prefetchSettingsDialogs();
}
