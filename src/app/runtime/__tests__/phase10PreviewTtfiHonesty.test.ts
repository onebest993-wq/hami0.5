import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expectJsonOrRetired } from './retiredCursorArtifact';

const root = process.cwd();

describe('phase-10 preview TTFI honesty', () => {
    it('تقارير preview + warm موجودة — أو متقاعدة', () => {
        expectJsonOrRetired('perf-reports/phase10-desktop-preview.json', () => undefined);
        expectJsonOrRetired('perf-reports/phase10-mobile-preview.json', () => undefined);
        expectJsonOrRetired('perf-reports/phase10-warm.json', () => undefined);
        expectJsonOrRetired('.cursor/phase-10-ttfi-preview-close.json', () => undefined);
    });

    it('baseline يعترف بـ preview ويرفض الجهاز — أو متقاعد', () => {
        expectJsonOrRetired<{
            measurementHonesty: {
                productionPreviewTtfiInstrumented: boolean;
                deviceTtfiInstrumented: boolean;
            };
        }>('.cursor/phase-0-baseline.json', (baseline) => {
            expect(baseline.measurementHonesty.productionPreviewTtfiInstrumented).toBe(true);
            expect(baseline.measurementHonesty.deviceTtfiInstrumented).toBe(false);
        });
    });

    it('أهداف warm/cold ما زالت OPEN في تقرير warm — أو متقاعد', () => {
        expectJsonOrRetired<{ targetWarm150: string; targetCold220: string; warmMedianMs: number }>(
            'perf-reports/phase10-warm.json',
            (warm) => {
                expect(warm.targetWarm150).toBe('OPEN');
                expect(warm.targetCold220).toBe('OPEN');
                expect(warm.warmMedianMs).toBeGreaterThan(150);
            },
        );
    });

    it('__hamiTtfiMs يُعرَّض خارج DEV فقط عبر markDashboardInteractiveOnce', () => {
        const src = readFileSync(join(root, 'src/app/bootstrap/dashboardInteractiveMark.ts'), 'utf8');
        expect(src).toContain('__hamiTtfiMs');
        expect(src).toContain('exposeTtfiProbe');
        expect(src).not.toMatch(
            /if \(import\.meta\.env\.DEV\) \{\s*\(window as Window[^\n]*__hamiTtfiMs/,
        );
    });
});
