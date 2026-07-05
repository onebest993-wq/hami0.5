import { describe, expect, it } from 'vitest';
import {
    isSmartFileInlineOverlayOpen,
    registerSmartFileInlineOverlay,
    resetSmartFileInlineOverlayRegistry,
} from '../smartFileInlineOverlayRegistry';

describe('smartFileInlineOverlayRegistry', () => {
    it('tracks nested inline overlays', () => {
        expect(isSmartFileInlineOverlayOpen()).toBe(false);
        const release = registerSmartFileInlineOverlay();
        expect(isSmartFileInlineOverlayOpen()).toBe(true);
        release();
        expect(isSmartFileInlineOverlayOpen()).toBe(false);
    });

    it('reset clears stuck overlay count', () => {
        registerSmartFileInlineOverlay();
        registerSmartFileInlineOverlay();
        expect(isSmartFileInlineOverlayOpen()).toBe(true);
        resetSmartFileInlineOverlayRegistry();
        expect(isSmartFileInlineOverlayOpen()).toBe(false);
    });
});
