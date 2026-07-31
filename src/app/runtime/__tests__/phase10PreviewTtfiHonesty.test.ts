import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('phase-10 preview TTFI honesty', () => {
    it('تقارير preview + warm موجودة', () => {
        expect(existsSync(join(root, 'perf-reports/phase10-desktop-preview.json'))).toBe(true);
        expect(existsSync(join(root, 'perf-reports/phase10-mobile-preview.json'))).toBe(true);
        expect(existsSync(join(root, 'perf-reports/phase10-warm.json'))).toBe(true);
        expect(existsSync(join(root, '.cursor/phase-10-ttfi-preview-close.json'))).toBe(true);
    });

    it('baseline يعترف بـ preview ويرفض الجهاز', () => {
        const baseline = JSON.parse(
            readFileSync(join(root, '.cursor/phase-0-baseline.json'), 'utf8'),
        ) as {
            measurementHonesty: {
                productionPreviewTtfiInstrumented: boolean;
                deviceTtfiInstrumented: boolean;
            };
        };
        expect(baseline.measurementHonesty.productionPreviewTtfiInstrumented).toBe(true);
        expect(baseline.measurementHonesty.deviceTtfiInstrumented).toBe(false);
    });

    it('أهداف warm/cold ما زالت OPEN في تقرير warm', () => {
        const warm = JSON.parse(
            readFileSync(join(root, 'perf-reports/phase10-warm.json'), 'utf8'),
        ) as { targetWarm150: string; targetCold220: string; warmMedianMs: number };
        expect(warm.targetWarm150).toBe('OPEN');
        expect(warm.targetCold220).toBe('OPEN');
        expect(warm.warmMedianMs).toBeGreaterThan(150);
    });

    it('__hamiTtfiMs يُعرَّض خارج DEV فقط عبر markDashboardInteractiveOnce', () => {
        const src = readFileSync(join(root, 'src/app/bootstrap/bootMetrics.ts'), 'utf8');
        expect(src).toContain('__hamiTtfiMs');
        expect(src).not.toMatch(
            /if \(import\.meta\.env\.DEV\) \{\s*\(window as Window[^\n]*__hamiTtfiMs/,
        );
    });
});
