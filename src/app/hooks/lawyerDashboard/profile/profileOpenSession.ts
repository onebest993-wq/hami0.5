/**
 * نية فتح الملف في دورة الصفحة الحالية — لا تُحفظ في sessionStorage.
 * بعد F5 تكون false حتى لو بقي activeTab=profile من حالة خاطئة.
 *
 * المصدر المشترك بين المقاطع: html[data-hami-profile-opened-page]
 * (علم الوحدة وحده ينقسم إن وُزّع الملف على أكثر من chunk).
 */

const OPENED_PAGE_ATTR = 'data-hami-profile-opened-page';
const STUDIO_OPEN_ATTR = 'data-hami-profile-studio-open';

function writeHtmlFlag(attr: string, open: boolean): void {
    if (typeof document === 'undefined') return;
    if (open) document.documentElement.setAttribute(attr, '1');
    else document.documentElement.removeAttribute(attr);
}

let openedThisPage = false;

export function markProfileOpenedThisPage(): void {
    openedThisPage = true;
    writeHtmlFlag(OPENED_PAGE_ATTR, true);
}

export function clearProfileOpenedThisPage(): void {
    openedThisPage = false;
    writeHtmlFlag(OPENED_PAGE_ATTR, false);
    writeHtmlFlag(STUDIO_OPEN_ATTR, false);
}

export function wasProfileOpenedThisPage(): boolean {
    if (typeof document !== 'undefined' && document.documentElement.getAttribute(OPENED_PAGE_ATTR) === '1') {
        return true;
    }
    return openedThisPage;
}

export function markProfileStudioOpen(): void {
    writeHtmlFlag(STUDIO_OPEN_ATTR, true);
}

export function clearProfileStudioOpen(): void {
    writeHtmlFlag(STUDIO_OPEN_ATTR, false);
}

export function isProfileStudioMarkedOpen(): boolean {
    return (
        typeof document !== 'undefined' &&
        document.documentElement.getAttribute(STUDIO_OPEN_ATTR) === '1'
    );
}

function isElementVisiblyMounted(el: HTMLElement): boolean {
    if (el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('hidden')) return false;
    if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return true;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const opacity = Number.parseFloat(style.opacity);
    return !(Number.isFinite(opacity) && opacity === 0);
}

export function isProfileStudioSheetVisible(): boolean {
    if (typeof document === 'undefined') return false;
    const sheet = document.querySelector(
        '[data-testid="profile-settings-sheet"], [data-testid="profile-settings-sheet-loading"]',
    );
    return sheet instanceof HTMLElement && isElementVisiblyMounted(sheet);
}

/**
 * استوديو ظاهر للمستخدم — ورقة مخفية في الـ DOM بعد الإغلاق لا تمنع مغادرة الملف.
 */
export function isProfileStudioChromeVisible(): boolean {
    return isProfileStudioMarkedOpen() || isProfileStudioSheetVisible();
}

/** للاختبارات */
export function resetProfileOpenedThisPageForTests(): void {
    openedThisPage = false;
    writeHtmlFlag(OPENED_PAGE_ATTR, false);
    writeHtmlFlag(STUDIO_OPEN_ATTR, false);
}
