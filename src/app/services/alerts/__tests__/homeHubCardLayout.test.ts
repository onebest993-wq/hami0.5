import { describe, expect, it } from 'vitest';
import { resolveHomeHubCardLayout, resolveStableHubHasItems } from '@/app/services/alerts/homeHubCardLayout';

describe('resolveHomeHubCardLayout', () => {
    it('تبويب التثبيت بدون عناصر — ارتفاع متكيّف بلا حد تنبيهات', () => {
        const layout = resolveHomeHubCardLayout({ activePanel: 'pins', pinCount: 0 });
        expect(layout.mode).toBe('pins');
        expect(layout.sectionMinHeightClass).toBe('min-h-0');
        expect(layout.bodyRegionClass).toBe('hami-hub-card-body--pins');
    });

    it('تبويب التثبيت — بلا ارتفاع تمرير ثابت (معاينة + البقية)', () => {
        for (const pinCount of [1, 3, 8]) {
            const layout = resolveHomeHubCardLayout({ activePanel: 'pins', pinCount });
            expect(layout.mode).toBe('pins');
            expect(layout.sectionMinHeightClass).toBe('min-h-0');
        }
    });

    it('تبويب التنبيهات — ارتفاع feed عند وجود محتوى', () => {
        const alerts = resolveHomeHubCardLayout({
            activePanel: 'alerts',
            pinCount: 0,
            blockSize: 'normal',
            hasFeedContent: true,
        });
        expect(alerts.mode).toBe('feed');
        expect(alerts.sectionMinHeightClass).toBe('min-h-[240px]');
        expect(alerts.bodyRegionClass).toBe('hami-hub-card-body--feed');
    });

    it('تبويب التنبيهات فارغ — ارتفاع متكيّف بلا حد 240px', () => {
        const empty = resolveHomeHubCardLayout({
            activePanel: 'alerts',
            pinCount: 0,
            blockSize: 'normal',
            hasFeedContent: false,
        });
        expect(empty.mode).toBe('feed');
        expect(empty.sectionMinHeightClass).toBe('min-h-0');
    });

    it('أثناء الإقلاع لا يتراجع has-items بعد أول ظهور', () => {
        const latch = { current: false };
        expect(resolveStableHubHasItems(false, true, latch)).toBe(false);
        expect(resolveStableHubHasItems(true, true, latch)).toBe(true);
        expect(resolveStableHubHasItems(false, true, latch)).toBe(true);
        expect(resolveStableHubHasItems(false, false, latch)).toBe(false);
        expect(resolveStableHubHasItems(true, false, latch)).toBe(true);
    });
});
