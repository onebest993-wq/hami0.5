/**
 * تحميل موحّد لـ AppRuntimeShell — prefetch حرج + bypass لـ Suspense عند الجاهزية.
 */

type AppRuntimeShellModule = typeof import('@/app/AppRuntimeShell');

let shellModulePromise: Promise<AppRuntimeShellModule> | null = null;
let cachedShellModule: AppRuntimeShellModule | null = null;

export function resetAppRuntimeShellModuleCacheForTests(): void {
    shellModulePromise = null;
    cachedShellModule = null;
}

export function getAppRuntimeShellModuleSync(): AppRuntimeShellModule | null {
    return cachedShellModule;
}

function createShellModuleImport(): Promise<AppRuntimeShellModule> {
    return import('@/app/AppRuntimeShell').then((mod) => {
        cachedShellModule = mod;
        return mod;
    });
}

export function loadAppRuntimeShellModule(): Promise<AppRuntimeShellModule> {
    if (cachedShellModule) return Promise.resolve(cachedShellModule);
    if (!shellModulePromise) {
        shellModulePromise = createShellModuleImport().catch((err) => {
            shellModulePromise = null;
            cachedShellModule = null;
            throw err;
        });
    }
    return shellModulePromise;
}

export function prefetchAppRuntimeShellModule(): void {
    if (typeof window === 'undefined') return;
    void loadAppRuntimeShellModule().catch(() => undefined);
}
