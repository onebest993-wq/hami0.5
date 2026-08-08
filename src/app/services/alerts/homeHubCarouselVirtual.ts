/** عتبة تفعيل windowing — قوائم قصيرة لا تحتاج placeholder slides */
export const HOME_HUB_CAROUSEL_WINDOW_THRESHOLD = 4;

/** عدد الشرائح المرئية ± المركز (1 = السابق + الحالي + التالي) */
export const HOME_HUB_CAROUSEL_WINDOW_RADIUS = 1;

export const HOME_HUB_CAROUSEL_SLIDE_CLASS = 'flex-[0_0_100%] min-w-0 px-0.5 relative';

export function shouldWindowHomeHubCarousel(slideCount: number): boolean {
    return slideCount >= HOME_HUB_CAROUSEL_WINDOW_THRESHOLD;
}

export function shouldRenderHomeHubCarouselSlide(
    index: number,
    activeIndex: number,
    slideCount: number,
): boolean {
    if (!shouldWindowHomeHubCarousel(slideCount)) return true;
    return Math.abs(index - activeIndex) <= HOME_HUB_CAROUSEL_WINDOW_RADIUS;
}

/** عتبة قائمة التثبيت الافتراضية */
export const HOME_HUB_PINS_VIRTUAL_THRESHOLD = 7;

/** صفوف مرئية قبل التمرير — 1/2/3 تتكيّف، الرابع+ يُمرَّر */
export const HOME_HUB_PINS_VISIBLE_MAX = 3;

export const HOME_HUB_PIN_ROW_ESTIMATE_PX = 52;

export const HOME_HUB_PIN_ROW_GAP_PX = 4;

export function shouldVirtualizeHomeHubPins(pinCount: number): boolean {
    return pinCount >= HOME_HUB_PINS_VIRTUAL_THRESHOLD;
}

export type HomeDockStickyMeasure = {
    contentHeight: number;
    chromeHeight: number;
    viewportHeight: number;
    scrollHeight: number;
};

export function resolveHomeDockSticky(measure: HomeDockStickyMeasure): boolean {
    const flowH = measure.contentHeight + measure.chromeHeight;
    return flowH > measure.viewportHeight + 4 || measure.scrollHeight > measure.viewportHeight + 4;
}
