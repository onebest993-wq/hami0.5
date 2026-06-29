/** إزالة هيكل الإقلاع الثابت (HTML/CSS) بعد جاهزية اللوحة */
export const STATIC_BOOT_SHELL_ID = 'hami-static-boot';

export function removeStaticBootShell(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(STATIC_BOOT_SHELL_ID)?.remove();
    document.documentElement.classList.remove('hami-boot-static-active');
}
