import { afterEach, describe, expect, it } from 'vitest';
import { resolveThemeMode } from '../resolveThemeMode';

describe('resolveThemeMode', () => {
    afterEach(() => {
        document.documentElement.removeAttribute('data-hami-native');
    });

    it('يحترم الوضع الصريح', () => {
        expect(resolveThemeMode('light')).toBe('light');
        expect(resolveThemeMode('dark')).toBe('dark');
    });

    it('على الغلاف الأصلي auto يبقى داكناً حتى لو النظام فاتح', () => {
        document.documentElement.setAttribute('data-hami-native', '1');
        expect(resolveThemeMode('auto')).toBe('dark');
    });
});
