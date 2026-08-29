import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    GOOGLE_FONTS_CRITICAL_HREF,
    resetDeferredGoogleFontsForTests,
    scheduleCriticalGoogleFonts,
    scheduleDeferredGoogleFonts,
} from '@/app/runtime/deferredGoogleFonts';

describe('deferredGoogleFonts', () => {
    afterEach(() => {
        resetDeferredGoogleFontsForTests();
        document.head.querySelectorAll('link[data-hami-google-fonts-critical], link[data-hami-google-fonts-full], link[rel="preconnect"]').forEach((n) => n.remove());
        vi.unstubAllGlobals();
    });

    it('يحقن ورقة Tajawal/Cairo الحرجة مرة واحدة بـ display=optional', async () => {
        scheduleCriticalGoogleFonts();
        scheduleCriticalGoogleFonts();
        await Promise.resolve();
        const sheets = document.head.querySelectorAll('link[data-hami-google-fonts-critical]');
        expect(sheets).toHaveLength(1);
        expect(sheets[0]?.getAttribute('href')).toBe(GOOGLE_FONTS_CRITICAL_HREF);
        expect(GOOGLE_FONTS_CRITICAL_HREF).toContain('display=optional');
        expect(GOOGLE_FONTS_CRITICAL_HREF).not.toContain('display=swap');
    });

    it('يحقن العائلات الكاملة بشكل منفصل بعد الحرجة', async () => {
        scheduleDeferredGoogleFonts();
        await Promise.resolve();
        expect(document.head.querySelector('link[data-hami-google-fonts-critical]')).toBeTruthy();
        expect(document.head.querySelector('link[data-hami-google-fonts-full]')).toBeTruthy();
    });
});
