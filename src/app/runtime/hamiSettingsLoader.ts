import { SETTINGS_SHELL_HYDRATED_EVENT } from '@/app/runtime/settingsShellEvents';

type HamiSettingsModule = typeof import('@/app/components/lawyer/HamiSettings/index');
type HamiSettingsComponent = HamiSettingsModule['HamiSettings'];

let settingsModulePromise: Promise<HamiSettingsModule> | null = null;
let settingsModuleResolved = false;
let settingsModuleCached: HamiSettingsModule | null = null;
let cachedHamiSettings: HamiSettingsComponent | null = null;

export function isHamiSettingsModuleResolved(): boolean {
    return settingsModuleResolved;
}

/** قراءة متزامنة بعد اكتمال التحميل — لتجنب وميض fallback عند الفتح */
export function getHamiSettingsModuleIfResolved(): HamiSettingsModule | null {
    return settingsModuleCached;
}

export function getCachedHamiSettingsComponent(): HamiSettingsComponent | null {
    return cachedHamiSettings;
}

/** للاختبارات */
export function resetHamiSettingsModuleCacheForTests(): void {
    settingsModulePromise = null;
    settingsModuleResolved = false;
    settingsModuleCached = null;
    cachedHamiSettings = null;
}

function dispatchSettingsShellHydrated(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(SETTINGS_SHELL_HYDRATED_EVENT));
}

function adoptSettingsModule(mod: HamiSettingsModule): HamiSettingsModule {
    if (typeof mod?.HamiSettings !== 'function') {
        throw new Error('HamiSettings export missing');
    }
    settingsModuleResolved = true;
    settingsModuleCached = mod;
    cachedHamiSettings = mod.HamiSettings;
    dispatchSettingsShellHydrated();
    return mod;
}

function ensureSettingsModulePromise(): Promise<HamiSettingsModule> {
    if (!settingsModulePromise) {
        settingsModulePromise = import('@/app/components/lawyer/HamiSettings/index')
            .then(adoptSettingsModule)
            .catch((err: unknown) => {
                settingsModulePromise = null;
                settingsModuleResolved = false;
                settingsModuleCached = null;
                cachedHamiSettings = null;
                throw err;
            });
    }
    return settingsModulePromise;
}

export function prefetchHamiSettingsModule(): void {
    if (typeof window === 'undefined') return;
    void ensureSettingsModulePromise().catch(() => undefined);
}

export function loadHamiSettingsModule(): Promise<HamiSettingsModule> {
    return ensureSettingsModulePromise();
}
