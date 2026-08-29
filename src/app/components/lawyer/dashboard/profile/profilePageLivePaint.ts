const LIVE_TREE = '[data-profile-live-tree]';
const LIVE_BODY = '[data-profile-page-body]';
const LIVE_BLOCKED = '[data-testid="lawyer-profile-access-blocked"]';
const LIVE_ERROR = '[data-testid="lawyer-profile-load-error"]';

export const PROFILE_ROYAL_LIVE_PAINT_SETTLE_FRAMES = 1;

export function hasProfileLiveTree(): boolean {
    if (typeof document === 'undefined') return false;
    const live = document.querySelector(LIVE_TREE);
    return live instanceof HTMLElement;
}

/**
 * الشجرة الحية جاهزة للاعتماد.
 * الكتل المعلّقة لا تمنع الاعتماد: الغطاء أصلاً بلا كتل، وظهورها إضافة.
 */
export function isProfileRoyalLivePaintReady(): boolean {
    if (typeof document === 'undefined') return false;
    const live = document.querySelector(LIVE_TREE);
    if (!(live instanceof HTMLElement)) return false;
    return Boolean(
        live.querySelector(LIVE_BODY) ||
            live.querySelector(LIVE_BLOCKED) ||
            live.querySelector(LIVE_ERROR),
    );
}
