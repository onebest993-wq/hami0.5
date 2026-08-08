import { describe, expect, it } from 'vitest';
import {
    applyOverlayThemeChrome,
    isOverlayThemeActive,
} from '@/app/runtime/overlayController';

describe('overlayController', () => {
    it('يطبّق ويزيل theme-color وسم html', () => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        meta.setAttribute('content', '#111111');
        document.head.appendChild(meta);

        const config = { htmlAttr: 'data-test-overlay', themeColor: '#050810' } as const;

        applyOverlayThemeChrome(config, true);
        expect(isOverlayThemeActive(config)).toBe(true);
        expect(meta.getAttribute('content')).toBe('#050810');

        applyOverlayThemeChrome(config, false);
        expect(isOverlayThemeActive(config)).toBe(false);
        expect(meta.getAttribute('content')).toBe('#111111');

        meta.remove();
    });
});
