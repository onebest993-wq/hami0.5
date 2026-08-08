import { describe, expect, it } from 'vitest';
import { resolveHomeHubCardLayout } from '@/app/services/alerts/homeHubCardLayout';

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

    it('تبويب التنبيهات/السكرتير — ارتفاع feed القياسي', () => {
        const alerts = resolveHomeHubCardLayout({ activePanel: 'alerts', pinCount: 0, blockSize: 'normal' });
        expect(alerts.mode).toBe('feed');
        expect(alerts.sectionMinHeightClass).toBe('min-h-[240px]');
        expect(alerts.bodyRegionClass).toBe('hami-hub-card-body--feed');

        const secretary = resolveHomeHubCardLayout({ activePanel: 'secretary', pinCount: 2, blockSize: 'compact' });
        expect(secretary.sectionMinHeightClass).toBe('min-h-[180px]');
    });
});
