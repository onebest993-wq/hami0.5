/** عتبة قائمة التثبيت الافتراضية */
const HOME_HUB_PINS_VIRTUAL_THRESHOLD = 7;

/** صفوف مرئية قبل التمرير — 1/2/3 تتكيّف، الرابع+ يُمرَّر */
export const HOME_HUB_PINS_VISIBLE_MAX = 3;

export const HOME_HUB_PIN_ROW_ESTIMATE_PX = 52;

export function shouldVirtualizeHomeHubPins(pinCount: number): boolean {
    return pinCount >= HOME_HUB_PINS_VIRTUAL_THRESHOLD;
}
