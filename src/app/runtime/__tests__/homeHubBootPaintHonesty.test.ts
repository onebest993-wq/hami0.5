import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('home hub boot paint honesty', () => {
    it('الهيكل يستخدم كروم التبويبات الحي لا صنفاً موازياً', () => {
        const skeleton = src('src/app/components/lawyer/dashboard/HomeHubCardSkeleton.tsx');
        const critical = src('src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css');
        const shell = src('src/app/components/lawyer/LawyerHomeHubCard/homeHubCardFx.css');

        expect(skeleton).toContain('data-hami-block="alerts"');
        expect(skeleton).toContain('data-hub-boot-settling="1"');
        expect(skeleton).toContain('peekHomeHubBootHasItems');
        expect(skeleton).toContain("data-hub-has-items={hasItems ? '1' : '0'}");
        expect(skeleton).toContain('className="hami-hub-tabs"');
        expect(skeleton).toContain('hami-hub-tab__pill');
        expect(skeleton).toContain('hami-hub-readable-panels');
        expect(skeleton).not.toContain('hami-hub-skeleton-tabs');
        expect(skeleton).not.toContain('hami-hub-skeleton-body');

        expect(critical).toContain('.hami-hub-tab__pill');
        expect(critical).toContain('background: rgba(255, 255, 255, 0.08)');
        expect(critical).not.toContain('color-mix(in srgb, #e6c673 38%, transparent)');
        expect(shell).not.toContain('.hami-hub-tab__pill');
        expect(shell).toContain(
            "[data-hub-has-items='1'][data-hub-boot-settling='0'][data-hub-layout-mode='feed'] .hami-hub-card-body--feed",
        );
        expect(shell).not.toContain("\n[data-hub-layout-mode='feed'] .hami-hub-card-body--feed {");
    });

    it('كتلة التنبيهات فوق الطية تطابق أرضية الفارغة ولا تقدّر 16rem', () => {
        const appScreen = src('src/styles/app-screen.css');
        const alertsFx = src('src/app/components/lawyer/LawyerHomeHubCard/homeHubAlertsFx.css');
        expect(appScreen).toMatch(
            /\[data-hami-block='alerts'\]\s*\{[^}]*content-visibility:\s*visible/s,
        );
        expect(appScreen).toContain('contain-intrinsic-size: auto var(--hami-home-hub-empty-slot-h, 6.75rem)');
        expect(appScreen).not.toMatch(
            /\[data-hami-block='alerts'\][^{]*\{[^}]*contain-intrinsic-size:\s*auto 16rem/s,
        );
        expect(alertsFx).toContain('min-height: 44px');
        expect(alertsFx).toMatch(/\.hami-hub-alerts-feed[\s\S]*contain:\s*layout style/);
        expect(alertsFx).not.toContain('min-height: 40px');
        expect(alertsFx).not.toContain('linear-gradient');
    });
});
