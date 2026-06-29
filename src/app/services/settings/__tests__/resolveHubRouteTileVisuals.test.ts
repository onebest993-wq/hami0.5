import { describe, expect, it } from 'vitest';
import { resolveHubRouteTileVisuals } from '@/app/services/settings/resolveHubRouteTileVisuals';

describe('resolveHubRouteTileVisuals', () => {
    it('يُرجع أنماط العنوان والأيقونة من accent', () => {
        const visuals = resolveHubRouteTileVisuals({ accent: '#B8A066', size: 'normal' });
        expect(visuals.titleStyle.backgroundImage).toContain('#B8A066');
        expect(visuals.iconStyle.color).toBe('#B8A066');
        expect(visuals.iconWrapStyle.width).toContain('calc(');
    });
});
