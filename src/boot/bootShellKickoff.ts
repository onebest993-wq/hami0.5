/** مفاتيح إقلاع الواجهة — بلا SecureStore/Crypto على المسار الحرج */
const BOOT_SHELL_WARM_KEYS = ['lawyer_settings', 'lawyer_theme'] as const;

let bootShellSyncDone = false;

/** قراءة متزامنة من localStorage فقط — للتحقق قبل IndexedDB */
export function getBootShellItemSync(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

/** تهيئة فورية خفيفة — يُستدعى من entry قبل أي chunk ثقيل */
export function kickoffBootShellSyncLite(): void {
    if (typeof localStorage === 'undefined' || bootShellSyncDone) return;
    bootShellSyncDone = true;
    for (const key of BOOT_SHELL_WARM_KEYS) {
        getBootShellItemSync(key);
    }
}

export function resetBootShellKickoffForTests(): void {
    bootShellSyncDone = false;
}
