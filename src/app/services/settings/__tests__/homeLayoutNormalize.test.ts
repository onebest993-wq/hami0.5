import { describe, expect, it } from 'vitest';
import { normalizeHomeLayout } from '@/app/services/settings/homeLayout';
import {
    buildDefaultPlacements,
    getWidgetsInZone,
} from '@/app/services/settings/homeWidgetPlacements';

describe('normalizeHomeLayout home surface', () => {
    it('يعيد الترتيب الكنسي ويسطح span المنتدى/البطاقة', () => {
        const next = normalizeHomeLayout({
            placements: {
                ...buildDefaultPlacements(),
                alerts: { zone: 'main', order: 0 },
                forum: { zone: 'main', order: 5 },
            },
            overrides: {
                alerts: { span: 2 },
                forum: { span: 2, accentColor: '#E6C673' },
            },
            dockVisible: false,
        });
        const main = getWidgetsInZone(next.placements, 'main');
        expect(main.indexOf('alerts')).toBeLessThan(main.indexOf('forum'));
        expect(next.overrides.alerts?.span).toBe(2);
        expect(next.overrides.forum?.span).toBeUndefined();
        expect(next.overrides.forum?.accentColor).toBe('#E6C673');
    });
});
