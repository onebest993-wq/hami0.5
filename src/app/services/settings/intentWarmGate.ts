/**
 * بوابة تسخين intent من DOM فقط — بلا settingsRuntime / migrate.
 * يفترض أن applySettingsToDom (أو hami-boot) ضبط data-hami-lite / data-hami-prefetch.
 */
export function shouldAllowIntentWarmFromDom(): boolean {
    if (typeof document === 'undefined') return true;
    const root = document.documentElement;
    if (root.dataset.hamiLite === '1') return false;
    if (root.dataset.hamiPrefetch === '0') return false;
    return true;
}
