import { describe, expect, it } from 'vitest';
import {
    isProfileMetaFieldVisible,
    shouldApplyVisitorPrivacy,
} from '@/app/services/profile/profilePageAppearance';

describe('shouldApplyVisitorPrivacy', () => {
    it('للمالك خارج الاستوديو: لا يطبّق خصوصية الزائر', () => {
        expect(shouldApplyVisitorPrivacy(false, false)).toBe(false);
    });

    it('أثناء الاستوديو أو للزائر: يطبّق الخصوصية', () => {
        expect(shouldApplyVisitorPrivacy(false, true)).toBe(true);
        expect(shouldApplyVisitorPrivacy(true, false)).toBe(true);
        expect(shouldApplyVisitorPrivacy(true, true)).toBe(true);
    });
});

describe('isProfileMetaFieldVisible', () => {
    it('يخفي الحقل الفارغ دائماً', () => {
        expect(isProfileMetaFieldVisible('', true, false, false)).toBe(false);
        expect(isProfileMetaFieldVisible(undefined, true, true, false)).toBe(false);
    });

    it('المالك خارج الاستوديو يرى الحقل حتى مع show=false', () => {
        expect(isProfileMetaFieldVisible('0750', false, false, false)).toBe(true);
    });

    it('معاينة الاستوديو تحترم العلم', () => {
        expect(isProfileMetaFieldVisible('0750', false, false, true)).toBe(false);
        expect(isProfileMetaFieldVisible('0750', true, false, true)).toBe(true);
    });

    it('الزائر يحترم العلم', () => {
        expect(isProfileMetaFieldVisible('بغداد', false, true, false)).toBe(false);
        expect(isProfileMetaFieldVisible('بغداد', true, true, false)).toBe(true);
    });
});
