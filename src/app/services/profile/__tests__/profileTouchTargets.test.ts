import { describe, expect, it } from 'vitest';
import {
    PROFILE_BACK_BUTTON_MIN_PX,
    PROFILE_HEADER_CHIP_MIN_HEIGHT_PX,
    PROFILE_MIN_TOUCH_TARGET_PX,
    meetsProfileTouchTarget,
} from '@/app/services/profile/profileTouchTargets';

describe('profileTouchTargets', () => {
    it('يُعرّف حد اللمس 44px وفق HIG', () => {
        expect(PROFILE_MIN_TOUCH_TARGET_PX).toBe(44);
        expect(meetsProfileTouchTarget(43)).toBe(false);
        expect(meetsProfileTouchTarget(44)).toBe(true);
    });

    it('شارة الهيدر وزر الرجوع يتجاوزان الحد الأدنى', () => {
        expect(meetsProfileTouchTarget(PROFILE_HEADER_CHIP_MIN_HEIGHT_PX)).toBe(true);
        expect(meetsProfileTouchTarget(PROFILE_BACK_BUTTON_MIN_PX)).toBe(true);
    });
});
