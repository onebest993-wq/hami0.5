/**
 * عقد طباعة الإقلاع/البوابة.
 *
 * - html rem دائماً 16px (لا يُربط بمقياس القراءة).
 * - أثناء #hami-static-boot أو بوابة الدخول: لا نغيّر --hami-font-size من الإعدادات.
 * - الإقلاع سطح لوني صامت؛ البوابة عنوان إجرائي بلا wordmark.
 */

export function isBootTypographyLocked(root: HTMLElement = document.documentElement): boolean {
    return (
        root.classList.contains('hami-boot-static-active') ||
        root.getAttribute('data-hami-auth-gate-active') === '1'
    );
}

/** يثبت متغيرات القراءة على 16px أثناء القفل — لا يمسّ سرعة الإقلاع. */
export function lockBootTypographyVars(root: HTMLElement = document.documentElement): void {
    root.style.setProperty('--hami-font-size', '16px');
    root.style.setProperty('--hami-user-font-scale', '1');
}
