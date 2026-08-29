/**
 * تحميل قشرة المقر — منفصل عن قشرة المحامي حتى لا يدخل ثنائي اليد.
 */

type HqRuntimeShellModule = typeof import('@/app/HqRuntimeShell');

let shellModulePromise: Promise<HqRuntimeShellModule> | null = null;
let cachedShellModule: HqRuntimeShellModule | null = null;

export function resetHqRuntimeShellModuleCacheForTests(): void {
    shellModulePromise = null;
    cachedShellModule = null;
}

export function getHqRuntimeShellModuleSync(): HqRuntimeShellModule | null {
    return cachedShellModule;
}

function createShellModuleImport(): Promise<HqRuntimeShellModule> {
    return import('@/app/HqRuntimeShell').then((mod) => {
        cachedShellModule = mod;
        return mod;
    });
}

export function loadHqRuntimeShellModule(): Promise<HqRuntimeShellModule> {
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
