import { describe, expect, it } from 'vitest';
import { resolveHorizontalTabSwipe } from '@/app/utils/horizontalTabSwipe';

const ORDER = ['a', 'b', 'c'] as const;

describe('resolveHorizontalTabSwipe', () => {
    it('يتجاهل السحب العمودي', () => {
        expect(resolveHorizontalTabSwipe(ORDER, 'b', 0, 80)).toBeNull();
    });

    it('سحب لليسار → التبويب التالي', () => {
        expect(resolveHorizontalTabSwipe(ORDER, 'a', -72, 4)).toBe('b');
        expect(resolveHorizontalTabSwipe(ORDER, 'b', -72, 4)).toBe('c');
    });

    it('سحب لليمين → التبويب السابق', () => {
        expect(resolveHorizontalTabSwipe(ORDER, 'c', 72, 4)).toBe('b');
        expect(resolveHorizontalTabSwipe(ORDER, 'b', 72, 4)).toBe('a');
    });

    it('لا يتجاوز أطراف القائمة', () => {
        expect(resolveHorizontalTabSwipe(ORDER, 'a', 72, 4)).toBeNull();
        expect(resolveHorizontalTabSwipe(ORDER, 'c', -72, 4)).toBeNull();
    });
});
