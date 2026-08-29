import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    beginHubLayerExit,
    clearHubLayerClosing,
    HUB_LAYER_EXIT_MS,
    HUB_LAYER_EXIT_PAD_MS,
} from '@/app/runtime/overlayHubLayerMotion';
import { FORUM_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';

describe('overlayHubLayerMotion', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.documentElement.removeAttribute(FORUM_HUB_LAYER.openAttr);
        document.documentElement.removeAttribute(FORUM_HUB_LAYER.closingAttr);
        document.documentElement.removeAttribute(FORUM_HUB_LAYER.enterAttr);
        delete document.documentElement.dataset.hamiReduceMotion;
        vi.useFakeTimers();
    });

    afterEach(() => {
        clearHubLayerClosing(FORUM_HUB_LAYER);
        vi.useRealTimers();
    });

    it('مع تقليل الحركة يُغلق فوراً', () => {
        document.documentElement.dataset.hamiReduceMotion = '1';
        const onDone = vi.fn();
        beginHubLayerExit(FORUM_HUB_LAYER, onDone);
        expect(onDone).toHaveBeenCalledTimes(1);
        expect(document.documentElement.hasAttribute(FORUM_HUB_LAYER.closingAttr)).toBe(false);
    });

    it('بدون طبقة يغلق فوراً', () => {
        const onDone = vi.fn();
        beginHubLayerExit(FORUM_HUB_LAYER, onDone);
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('يتلاشى ثم ينهي بعد المهلة', () => {
        document.documentElement.setAttribute(FORUM_HUB_LAYER.openAttr, '1');
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'forum-overlay-host');
        document.body.appendChild(layer);

        const onDone = vi.fn();
        beginHubLayerExit(FORUM_HUB_LAYER, onDone);
        expect(onDone).not.toHaveBeenCalled();
        expect(document.documentElement.getAttribute(FORUM_HUB_LAYER.closingAttr)).toBe('1');
        expect(document.documentElement.hasAttribute(FORUM_HUB_LAYER.openAttr)).toBe(false);

        vi.advanceTimersByTime(HUB_LAYER_EXIT_MS + HUB_LAYER_EXIT_PAD_MS);
        expect(onDone).toHaveBeenCalledTimes(1);
        expect(document.documentElement.hasAttribute(FORUM_HUB_LAYER.closingAttr)).toBe(false);
    });

    it('clear يلغي الخروج المعلق', () => {
        document.documentElement.setAttribute(FORUM_HUB_LAYER.openAttr, '1');
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'forum-overlay-host');
        document.body.appendChild(layer);

        const onDone = vi.fn();
        beginHubLayerExit(FORUM_HUB_LAYER, onDone);
        clearHubLayerClosing(FORUM_HUB_LAYER);
        vi.advanceTimersByTime(HUB_LAYER_EXIT_MS + HUB_LAYER_EXIT_PAD_MS);
        expect(onDone).not.toHaveBeenCalled();
    });
});
