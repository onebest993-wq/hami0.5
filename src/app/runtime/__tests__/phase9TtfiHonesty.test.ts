import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('phase-9 TTFI instrumentation honesty', () => {
    it('hami-boot يعلّم start قبل static-shell', () => {
        const boot = readFileSync(join(root, 'public/hami-boot.js'), 'utf8');
        const startIdx = boot.indexOf("performance.mark('hami:boot:start')");
        const staticIdx = boot.indexOf("performance.mark('hami:boot:static-shell-visible')");
        expect(startIdx).toBeGreaterThan(-1);
        expect(staticIdx).toBeGreaterThan(startIdx);
    });

    it('first-tab-open يأتي بعد interactive عبر onDashboardInteractive', () => {
        const home = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        expect(home).toContain('onDashboardInteractive');
        expect(home).toContain("markBootPhase('first-tab-open')");
        expect(home).not.toMatch(/markDashboardInteractiveOnce\(\)/);
    });

    it('تقارير القياس المحلية موجودة', () => {
        expect(existsSync(join(root, 'perf-reports/phase9-desktop-dev.json'))).toBe(true);
        expect(existsSync(join(root, 'perf-reports/phase9-mobile-dev.json'))).toBe(true);
        expect(existsSync(join(root, '.cursor/phase-9-ttfi-measure-close.json'))).toBe(true);
    });

    it('baseline يعترف بالقياس المحلي ويرفض ادعاء الجهاز', () => {
        const baseline = JSON.parse(
            readFileSync(join(root, '.cursor/phase-0-baseline.json'), 'utf8'),
        ) as {
            measurementHonesty: {
                browserTtfiInstrumented: boolean;
                deviceTtfiInstrumented: boolean;
                productionPreviewTtfiInstrumented: boolean;
            };
        };
        expect(baseline.measurementHonesty.browserTtfiInstrumented).toBe(true);
        expect(baseline.measurementHonesty.deviceTtfiInstrumented).toBe(false);
        expect(baseline.measurementHonesty.productionPreviewTtfiInstrumented).toBe(true);
    });
});
