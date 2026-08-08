import { describe, expect, it } from 'vitest';
import { resolveThemeSwatchSurface, resolveThemeSwatchStyle } from '../themeSwatchStyle';

describe('appearanceThemeSwatch', () => {
    it('يستخدم اللون الأساسي للمعاينة', () => {
        const surface = resolveThemeSwatchSurface({ primary: '#C5CDD8', bg: '#151922' });
        expect(surface).toBe('#C5CDD8');
    });

    it('يُرجع خلفية مرئية للمعاينة', () => {
        const style = resolveThemeSwatchStyle('silver');
        expect(style.backgroundColor).toBe('#151922');
        expect(String(style.backgroundImage)).toContain('#C5CDD8');
        expect(String(style.backgroundImage)).toContain('linear-gradient');
    });
});
