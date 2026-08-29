let hqAppModulePromise: Promise<typeof import('@/hq/HqBootRoot')> | null = null;

export function loadHqAppModule(): Promise<typeof import('@/hq/HqBootRoot')> {
    if (!hqAppModulePromise) {
        hqAppModulePromise = import('@/hq/HqBootRoot');
    }
    return hqAppModulePromise;
}
