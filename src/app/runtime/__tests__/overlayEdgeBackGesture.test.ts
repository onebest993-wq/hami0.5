import { afterEach, describe, expect, it, vi } from 'vitest';

const dispatchNativeBack = vi.fn(() => false);
const isAndroidNativeShell = vi.fn(() => false);

vi.mock('@/app/runtime/nativeBackStack', () => ({
    dispatchNativeBack: () => dispatchNativeBack(),
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isAndroidNativeShell: () => isAndroidNativeShell(),
}));

describe('overlayEdgeBackGesture', () => {
    afterEach(async () => {
        document.documentElement.removeAttribute('data-hami-tasks-manager-open');
        document.documentElement.setAttribute('dir', 'rtl');
        const { resetOverlayEdgeBackGestureForTests } = await import(
            '@/app/runtime/overlayEdgeBackGesture'
        );
        resetOverlayEdgeBackGestureForTests();
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('isHamiFullOverlayOpen يقرأ أعلام html', async () => {
        const { isHamiFullOverlayOpen } = await import('@/app/runtime/overlayEdgeBackGesture');
        expect(isHamiFullOverlayOpen()).toBe(false);
        document.documentElement.setAttribute('data-hami-tasks-manager-open', '1');
        expect(isHamiFullOverlayOpen()).toBe(true);
    });

    it('isOverlayInlineStartEdge يحترم RTL', async () => {
        const { isOverlayInlineStartEdge } = await import('@/app/runtime/overlayEdgeBackGesture');
        expect(isOverlayInlineStartEdge(390, 400, true)).toBe(true);
        expect(isOverlayInlineStartEdge(10, 400, true)).toBe(false);
        expect(isOverlayInlineStartEdge(10, 400, false)).toBe(true);
        expect(isOverlayInlineStartEdge(390, 400, false)).toBe(false);
    });

    it('لا يُربَط على أندرويد الأصلي', async () => {
        isAndroidNativeShell.mockReturnValue(true);
        const { wireOverlayEdgeBackGesture } = await import('@/app/runtime/overlayEdgeBackGesture');
        expect(() => wireOverlayEdgeBackGesture()).not.toThrow();
        expect(isAndroidNativeShell).toHaveBeenCalled();
    });
});
