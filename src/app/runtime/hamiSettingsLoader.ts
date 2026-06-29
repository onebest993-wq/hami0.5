type HamiSettingsModule = typeof import('@/app/components/lawyer/HamiSettings/index');

let settingsModulePromise: Promise<HamiSettingsModule> | null = null;
let settingsModuleResolved = false;

export function isHamiSettingsModuleResolved(): boolean {
    return settingsModuleResolved;
}

/** للاختبارات */
export function resetHamiSettingsModuleCacheForTests(): void {
    settingsModulePromise = null;
    settingsModuleResolved = false;
}

function ensureSettingsModulePromise(): Promise<HamiSettingsModule> {
    if (!settingsModulePromise) {
        settingsModulePromise = import('@/app/components/lawyer/HamiSettings/index').then((mod) => {
            settingsModuleResolved = true;
            return mod;
        });
    }
    return settingsModulePromise;
}

export function prefetchHamiSettingsModule(): void {
    if (typeof window === 'undefined') return;
    void ensureSettingsModulePromise();
}

export function loadHamiSettingsModule(): Promise<HamiSettingsModule> {
    return ensureSettingsModulePromise();
}
