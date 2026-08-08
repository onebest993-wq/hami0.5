import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';
import {
    dismissAllHomeHubOverlayBack,
    getHomeHubOverlayBackStackDepthForTests,
    popHomeHubOverlayBack,
    pushHomeHubOverlayBack,
    requestCloseHomeHubOverlay,
    resetHomeHubOverlayBackStackForTests,
} from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubOverlayBackStack';

const nativeBackHandlers: Array<() => boolean> = [];

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
    registerNativeBackHandler: (handler: () => boolean) => {
        nativeBackHandlers.push(handler);
        return () => {
            const idx = nativeBackHandlers.lastIndexOf(handler);
            if (idx >= 0) nativeBackHandlers.splice(idx, 1);
        };
    },
}));

vi.mock('@/app/runtime/overlaySnapClose', () => ({
    executeOverlaySnapClose: ({ commit }: { commit?: () => void }) => {
        commit?.();
    },
}));

function consumeNativeBack(): boolean {
    for (let i = nativeBackHandlers.length - 1; i >= 0; i -= 1) {
        if (nativeBackHandlers[i]?.()) return true;
    }
    return false;
}

describe('homeHubOverlayBackStack', () => {
    beforeEach(() => {
        resetHomeHubOverlayBackStackForTests();
        nativeBackHandlers.length = 0;
    });

    it('يغلق آخر واجهة أولاً (LIFO)', () => {
        const closeA = vi.fn();
        const closeB = vi.fn();
        pushHomeHubOverlayBack('home-hub-urgent-more', closeA);
        pushHomeHubOverlayBack('home-hub-alerts-more', closeB);

        expect(popHomeHubOverlayBack()).toBe(true);
        expect(closeB).toHaveBeenCalledTimes(1);
        expect(closeA).not.toHaveBeenCalled();
        expect(getHomeHubOverlayBackStackDepthForTests()).toBe(1);

        expect(popHomeHubOverlayBack()).toBe(true);
        expect(closeA).toHaveBeenCalledTimes(1);
        expect(getHomeHubOverlayBackStackDepthForTests()).toBe(0);
    });

    it('زر الرجوع الأصلي يغلق آخر واجهة', () => {
        const close = vi.fn();
        pushHomeHubOverlayBack('home-hub-secretary-more', close);

        expect(consumeNativeBack()).toBe(true);
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('Escape يغلق آخر واجهة', () => {
        const close = vi.fn();
        pushHomeHubOverlayBack('home-hub-radar-more', close);

        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        const preventDefault = vi.spyOn(event, 'preventDefault');
        window.dispatchEvent(event);

        expect(close).toHaveBeenCalledTimes(1);
        expect(preventDefault).toHaveBeenCalled();
    });

    it('requestClose يغلق واجهة محددة (سحب/خلفية)', () => {
        const closeA = vi.fn();
        const closeB = vi.fn();
        pushHomeHubOverlayBack('home-hub-urgent-more', closeA);
        pushHomeHubOverlayBack('home-hub-alerts-more', closeB);

        expect(requestCloseHomeHubOverlay('home-hub-urgent-more')).toBe(true);
        expect(closeA).toHaveBeenCalledTimes(1);
        expect(closeB).not.toHaveBeenCalled();
        expect(getHomeHubOverlayBackStackDepthForTests()).toBe(1);
    });

    it('dismiss-transient-overlays يُفرغ المكدس', () => {
        const closeA = vi.fn();
        const closeB = vi.fn();
        pushHomeHubOverlayBack('home-hub-urgent-more', closeA);
        pushHomeHubOverlayBack('home-hub-alerts-more', closeB);

        window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: {} }));

        expect(closeA).toHaveBeenCalledTimes(1);
        expect(closeB).toHaveBeenCalledTimes(1);
        expect(getHomeHubOverlayBackStackDepthForTests()).toBe(0);
    });
});
