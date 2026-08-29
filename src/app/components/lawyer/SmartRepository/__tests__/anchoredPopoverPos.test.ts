import { describe, expect, it } from 'vitest';
import {
    computeAnchoredPopoverPos,
    computeRepositoryMoveMenuPos,
    subscribeVisualViewportLayout,
} from '@/app/components/lawyer/SmartRepository/anchoredPopoverPos';

function stubViewport(width: number, height: number, visualHeight = height) {
    const prev = {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        visualViewport: window.visualViewport,
    };
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
    Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: {
            width,
            height: visualHeight,
            offsetTop: 0,
            offsetLeft: 0,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
        },
    });
    return () => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: prev.innerWidth });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: prev.innerHeight });
        Object.defineProperty(window, 'visualViewport', {
            configurable: true,
            value: prev.visualViewport,
        });
    };
}

describe('computeAnchoredPopoverPos', () => {
    it('يحاذي الحافة اليمنى داخل الشاشة', () => {
        const restore = stubViewport(1024, 768);
        try {
            const pos = computeAnchoredPopoverPos(
                {
                    getBoundingClientRect: () => ({
                        top: 80,
                        bottom: 120,
                        left: 200,
                        right: 320,
                        width: 120,
                        height: 40,
                        x: 200,
                        y: 80,
                        toJSON: () => undefined,
                    }),
                } as HTMLElement,
                {
                    width: 272,
                    maxHeightCap: 320,
                    minPanel: 140,
                    preferBelowMin: 180,
                    gap: 8,
                    viewportPad: 10,
                    heightFraction: 0.48,
                },
            );
            expect(pos.width).toBeLessThanOrEqual(272);
            expect(pos.left).toBeGreaterThanOrEqual(10);
            expect(pos.top).toBeGreaterThanOrEqual(120);
            expect(pos.maxHeight).toBeGreaterThan(0);
        } finally {
            restore();
        }
    });

    it('قائمة النقل تبقى داخل الشاشة القصيرة (موبايل)', () => {
        const restore = stubViewport(390, 664);
        try {
            const pos = computeRepositoryMoveMenuPos({
                getBoundingClientRect: () => ({
                    top: 520,
                    bottom: 564,
                    left: 300,
                    right: 344,
                    width: 44,
                    height: 44,
                    x: 300,
                    y: 520,
                    toJSON: () => undefined,
                }),
            } as HTMLElement);
            expect(pos.left).toBeGreaterThanOrEqual(8);
            expect(pos.left + pos.width).toBeLessThanOrEqual(390 - 8);
            expect(pos.top).toBeGreaterThanOrEqual(8);
            expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(664);
        } finally {
            restore();
        }
    });

    it('يحصر اللوحة في visualViewport عند تقلص الارتفاع بلوحة المفاتيح', () => {
        const restore = stubViewport(390, 844, 420);
        try {
            const pos = computeAnchoredPopoverPos(
                {
                    getBoundingClientRect: () => ({
                        top: 72,
                        bottom: 116,
                        left: 48,
                        right: 342,
                        width: 294,
                        height: 44,
                        x: 48,
                        y: 72,
                        toJSON: () => undefined,
                    }),
                } as HTMLElement,
                {
                    width: 272,
                    maxHeightCap: 320,
                    minPanel: 140,
                    preferBelowMin: 180,
                    gap: 8,
                    viewportPad: 10,
                    heightFraction: 0.48,
                },
            );
            expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(420);
            expect(pos.maxHeight).toBeLessThanOrEqual(320);
        } finally {
            restore();
        }
    });

    it('يشترك في visualViewport.resize لإعادة التخطيط', () => {
        const listeners: Array<{ type: string; fn: () => void }> = [];
        const restore = stubViewport(390, 844, 420);
        Object.defineProperty(window, 'visualViewport', {
            configurable: true,
            value: {
                width: 390,
                height: 420,
                offsetTop: 0,
                offsetLeft: 0,
                addEventListener: (type: string, fn: () => void) => {
                    listeners.push({ type, fn });
                },
                removeEventListener: (type: string, fn: () => void) => {
                    const idx = listeners.findIndex((item) => item.type === type && item.fn === fn);
                    if (idx >= 0) listeners.splice(idx, 1);
                },
            },
        });
        try {
            const onLayout = () => undefined;
            const unsub = subscribeVisualViewportLayout(onLayout);
            expect(listeners.some((item) => item.type === 'resize')).toBe(true);
            unsub();
            expect(listeners).toHaveLength(0);
        } finally {
            restore();
        }
    });
});
