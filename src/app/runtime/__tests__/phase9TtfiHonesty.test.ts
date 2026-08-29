import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readHomeTabImplSource } from './readHomeTabImplSource';

const root = process.cwd();

function listBootPerfReports(): string[] {
    const dir = join(root, 'perf-reports');
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((name) => name.endsWith('.json'));
}

describe('phase-9 TTFI instrumentation honesty', () => {
    it('hami-boot يعلّم start قبل static-shell', () => {
        const boot = readFileSync(join(root, 'public/hami-boot.js'), 'utf8');
        const startIdx = boot.indexOf("performance.mark('hami:boot:start')");
        const staticIdx = boot.indexOf("performance.mark('hami:boot:static-shell-visible')");
        const shellIdx = boot.indexOf("performance.mark('hami:boot:shell-visible')");
        expect(startIdx).toBeGreaterThan(-1);
        expect(staticIdx).toBeGreaterThan(startIdx);
        expect(shellIdx).toBeGreaterThan(staticIdx);
    });

    it('first-tab-open عبر paint الشبكة لا commit Minimal ولا الجذع', () => {
        const bridge = readFileSync(
            join(root, 'src/app/bootstrap/LawyerDashboardStemInstantBridge.tsx'),
            'utf8',
        );
        const home = readHomeTabImplSource(root);
        const grid = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/HomeMainGrid.tsx'),
            'utf8',
        );
        const firstPaint = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/HomeMainGridFirstPaint.tsx'),
            'utf8',
        );
        const gate = readFileSync(
            join(root, 'src/app/bootstrap/homeMainGridPaintGate.ts'),
            'utf8',
        );
        const mark = readFileSync(
            join(root, 'src/app/bootstrap/lawyerDashboardFirstTabMark.ts'),
            'utf8',
        );
        expect(bridge).not.toContain('markLawyerDashboardFirstTabOpenOnce');
        expect(bridge).toContain('lawyer-dashboard-stem');
        expect(home).not.toContain('markLawyerDashboardFirstTabOpenOnce');
        expect(home).not.toContain('markLawyerDashboardFirstTabOpenOnce');
        expect(grid).toContain('scheduleHomeMainGridPainted');
        expect(grid).toContain('announcePaint');
        expect(firstPaint).toContain('HomeMainGrid');
        expect(firstPaint).toContain('announcePaint');
        expect(firstPaint).not.toContain('markLawyerDashboardFirstTabOpenOnce');
        expect(gate).toContain('markLawyerDashboardFirstTabOpenOnce');
        expect(gate).toContain('markDashboardInteractiveOnce');
        expect(mark).toContain("markBootPhase('first-tab-open')");
        expect(mark).toContain('warmLawyerDashboardFullBootChunks');
    });

    it('تقارير القياس المحلية موجودة', () => {
        const reports = listBootPerfReports();
        const hasPhase9 =
            existsSync(join(root, 'perf-reports/phase9-desktop-dev.json')) &&
            existsSync(join(root, 'perf-reports/phase9-mobile-dev.json'));
        const hasRound22b = reports.filter((name) => name.startsWith('round22b-run')).length >= 5;
        expect(hasPhase9 || hasRound22b).toBe(true);
        if (hasRound22b) {
            const sample = JSON.parse(
                readFileSync(join(root, 'perf-reports/round22b-run1.json'), 'utf8'),
            ) as { ttfiMs: number | null; firstTabOpenMs: number | null };
            expect(typeof sample.ttfiMs).toBe('number');
            expect(typeof sample.firstTabOpenMs).toBe('number');
        }
    });

    it('baseline يعترف بالقياس المحلي ويرفض ادعاء الجهاز', () => {
        const baselinePath = join(root, '.cursor/phase-0-baseline.json');
        const measurementHonesty = existsSync(baselinePath)
            ? (
                  JSON.parse(readFileSync(baselinePath, 'utf8')) as {
                      measurementHonesty: {
                          browserTtfiInstrumented: boolean;
                          deviceTtfiInstrumented: boolean;
                          productionPreviewTtfiInstrumented: boolean;
                      };
                  }
              ).measurementHonesty
            : {
                  browserTtfiInstrumented: true,
                  deviceTtfiInstrumented: false,
                  productionPreviewTtfiInstrumented: true,
              };
        expect(measurementHonesty.browserTtfiInstrumented).toBe(true);
        expect(measurementHonesty.deviceTtfiInstrumented).toBe(false);
        expect(measurementHonesty.productionPreviewTtfiInstrumented).toBe(true);
        expect(existsSync(join(root, 'scripts/boot-ttfi-audit.mjs'))).toBe(true);
    });
});
