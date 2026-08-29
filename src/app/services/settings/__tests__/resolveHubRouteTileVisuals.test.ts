import { describe, expect, it } from 'vitest';
import { resolveHubRouteTileVisuals } from '@/app/services/settings/resolveHubRouteTileVisuals';

describe('resolveHubRouteTileVisuals', () => {
    it('يُرجع أنماط العنوان والأيقونة من accent', () => {
        const visuals = resolveHubRouteTileVisuals({ accent: '#B8A066', size: 'normal' });
        expect(visuals.titleStyle['--hami-hub-title-accent']).toBe('#B8A066');
        expect(visuals.titleStyle['--hami-hub-title-size']).toBeTruthy();
        expect(visuals.titleStyle.fontSize).toContain('calc(');
        expect(visuals.iconStyle.color).toBe('#B8A066');
        expect(visuals.iconWrapStyle.width).toContain('calc(');
    });

    it('البلاطة النصفية — fontSize احتياطي + لون accent', () => {
        const visuals = resolveHubRouteTileVisuals({
            accent: '#B08AD4',
            size: 'normal',
            layoutSpan: 1,
        });
        expect(visuals.titleStyle['--hami-hub-title-accent']).toBe('#B08AD4');
        expect(visuals.titleStyle['--hami-hub-title-size']).toBe('2.05rem');
        expect(visuals.titleStyle.fontSize).toBeUndefined();
    });
});
