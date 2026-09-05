import { HAMI_OVERLAY_SAFE_INSETS_CLASS } from '@/app/utils/overlayPortal';

export const REPOSITORY_INSTANT_CHROME_ID = 'hami-repository-instant-chrome';
export const REPOSITORY_INSTANT_DISMISS_EVENT = 'hami:repository-instant-dismiss';

/**
 * تحت المودال الحي (z-220). pointer-events-none على الجذر:
 * اللمسات تصل للخلاصة الحية حتى لو بقيت القشرة إطاراً فوقها.
 * زر الإغلاق وحده pointer-events-auto.
 */
export const REPOSITORY_INSTANT_CHROME_ROOT_CLASS =
    `pointer-events-none fixed inset-0 z-[219] flex flex-col overscroll-contain hami-repository-overlay ${HAMI_OVERLAY_SAFE_INSETS_CLASS}`;

const PANEL =
    'hami-repository-panel relative flex h-[100dvh] max-h-[100dvh] w-full max-w-none min-h-0 flex-col overflow-hidden rounded-none border-0 shadow-none hami-overlay-safe-insets';

const HEADER =
    'hami-repository-header relative isolate z-[20] shrink-0 px-3 py-1.5';

const CLOSE_BTN =
    'hami-repository-back-btn pointer-events-auto inline-flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-white/55 touch-manipulation';

function stem(inner: string, size: number): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

/**
 * قشرة انتظار صادقة: رأس + إغلاق فقط.
 * لا بحث/إضافة/عام وهمية — كانت تُلمَس وهي ميتة حتى يصل Host.
 */
export function buildRepositoryInstantChromeInnerHtml(): string {
    return (
        `<div class="${PANEL}" role="dialog" aria-modal="true" aria-label="المستودع">` +
        `<div class="${HEADER}" style="border-bottom:1px solid rgba(255,255,255,0.06);background:#0a0f1c;">` +
        '<div class="flex min-w-0 items-center gap-2">' +
        `<button type="button" class="${CLOSE_BTN}" data-testid="repository-instant-close" aria-label="إغلاق">` +
        stem('<path d="m15 18-6-6 6-6"/>', 18) +
        '</button>' +
        '<h2 class="truncate text-[15px] font-medium text-[#F4F4F5]">المستودع</h2>' +
        '</div></div>' +
        '<div class="flex min-h-0 flex-1" data-testid="repository-instant-feed" aria-hidden="true" style="pointer-events:none;background:#0a0f1c;"></div>' +
        '</div>'
    );
}
