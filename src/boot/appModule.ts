/** تحميل جذر التطبيق من مدخل مستقل لتفادي ذوبانه داخل chunks feature ثقيلة. */
let appModulePromise: Promise<typeof import('@/app/AppBootRoot')> | null = null;

export function loadAppModule(): Promise<typeof import('@/app/AppBootRoot')> {
    if (!appModulePromise) {
        appModulePromise = import('@/app/AppBootRoot');
    }
    return appModulePromise;
}
