import { describe, expect, it } from 'vitest';
import {
    resolveHomeDockSticky,
    shouldRenderHomeHubCarouselSlide,
    shouldVirtualizeHomeHubPins,
    shouldWindowHomeHubCarousel,
} from '@/app/services/alerts/homeHubCarouselVirtual';

describe('homeHubCarouselVirtual', () => {
    it('يفعّل windowing عند 4+ شرائح', () => {
        expect(shouldWindowHomeHubCarousel(3)).toBe(false);
        expect(shouldWindowHomeHubCarousel(4)).toBe(true);
    });

    it('يُظهر الشرائح القريبة فقط من الفهرس النشط', () => {
        expect(shouldRenderHomeHubCarouselSlide(0, 2, 8)).toBe(false);
        expect(shouldRenderHomeHubCarouselSlide(1, 2, 8)).toBe(true);
        expect(shouldRenderHomeHubCarouselSlide(2, 2, 8)).toBe(true);
        expect(shouldRenderHomeHubCarouselSlide(3, 2, 8)).toBe(true);
        expect(shouldRenderHomeHubCarouselSlide(4, 2, 8)).toBe(false);
    });

    it('يفعّل virtualization للتثبيت عند 7+ عناصر', () => {
        expect(shouldVirtualizeHomeHubPins(6)).toBe(false);
        expect(shouldVirtualizeHomeHubPins(7)).toBe(true);
    });

    it('يحسب dock sticky بدقة', () => {
        expect(
            resolveHomeDockSticky({
                contentHeight: 400,
                chromeHeight: 200,
                viewportHeight: 500,
                scrollHeight: 620,
            }),
        ).toBe(true);

        expect(
            resolveHomeDockSticky({
                contentHeight: 200,
                chromeHeight: 100,
                viewportHeight: 500,
                scrollHeight: 320,
            }),
        ).toBe(false);
    });
});
