import { isBootRevealDone } from '@/app/bootstrap/bootReveal';

/** إزالة هيكل الإقلاع الثابت (HTML/CSS) بعد جاهزية اللوحة */
export const STATIC_BOOT_SHELL_ID = 'hami-static-boot';

export function hasStaticBootShell(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(document.getElementById(STATIC_BOOT_SHELL_ID));
}

/**
 * أثناء وجود #hami-static-boot: ممنوع تركيب React splash مكرر.
 * الشعار الوحيد = الطبقة الثابتة حتى القطع اللحظي للرئيسية.
 */
export function shouldMountReactBootOverlay(): boolean {
    if (isBootRevealDone()) return false;
    if (hasStaticBootShell()) return false;
    return true;
}

export function removeStaticBootShell(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(STATIC_BOOT_SHELL_ID)?.remove();
    document.documentElement.classList.remove('hami-boot-static-active');
}
