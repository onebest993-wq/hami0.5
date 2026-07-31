type HamiSettingsModule = typeof import('@/app/components/lawyer/HamiSettings/index');

let settingsModulePromise: Promise<HamiSettingsModule> | null = null;
let settingsModuleResolved = false;
let settingsModuleCached: HamiSettingsModule | null = null;

export function isHamiSettingsModuleResolved(): boolean {
    return settingsModuleResolved;
}

/** قراءة متزامنة بعد اكتمال التحميل — لتجنب وميض fallback عند الفتح */
export function getHamiSettingsModuleIfResolved(): HamiSettingsModule | null {
    return settingsModuleCached;
}

/** للاختبارات */
export function resetHamiSettingsModuleCacheForTests(): void {
    settingsModulePromise = null;
    settingsModuleResolved = false;
    settingsModuleCached = null;
}

function ensureSettingsModulePromise(): Promise<HamiSettingsModule> {
    if (!settingsModulePromise) {
        settingsModulePromise = import('@/app/components/lawyer/HamiSettings/index').then((mod) => {
            settingsModuleResolved = true;
            settingsModuleCached = mod;
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
