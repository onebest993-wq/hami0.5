/** حدود اللمس لمسار الملف — مرجع Capacitor / iOS HIG */
export const PROFILE_MIN_TOUCH_TARGET_PX = 44;
export const PROFILE_HEADER_CHIP_MIN_HEIGHT_PX = 56;
export const PROFILE_BACK_BUTTON_MIN_PX = 44;

export function meetsProfileTouchTarget(px: number): boolean {
    return px >= PROFILE_MIN_TOUCH_TARGET_PX;
}
