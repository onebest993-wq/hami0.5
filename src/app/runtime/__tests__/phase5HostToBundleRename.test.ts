import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('Phase 5 — Host→Bundle rename + consolidation lazy', () => {
    it('لا تبقى رموز OverlaysHostProps / overlaysHostProps في المسار الحي', () => {
        const samples = [
            'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx',
            'src/app/components/lawyer/dashboard/LawyerDashboardMainViewOverlayHosts.tsx',
            'src/app/components/lawyer/dashboard/LawyerDashboardMainView.lazyEntries.ts',
            'src/app/components/lawyer/dashboard/useLawyerDashboardMainViewChrome.ts',
            'src/app/hooks/lawyerDashboard/assembleLawyerDashboardReadyView.ts',
            'src/app/hooks/lawyerDashboard/useLawyerDashboardCore.types.ts',
            'src/app/hooks/lawyerDashboard/buildLawyerDashboardOverlaysBundleProps.ts',
            'src/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles.ts',
        ];
        for (const rel of samples) {
            const src = readFileSync(join(root, rel), 'utf8');
            expect(src).not.toContain('LawyerDashboardOverlaysHostProps');
            expect(src).not.toContain('overlaysHostProps');
            expect(src).not.toContain('buildLawyerDashboardOverlaysHostProps');
            expect(src).not.toContain('lawyerDashboardOverlaysHostBundles');
        }
    });

    it('الملفات القديمة Host محذوفة والجديدة Bundle موجودة', () => {
        expect(() =>
            readFileSync(
                join(root, 'src/app/components/lawyer/dashboard/lawyerDashboardOverlaysHostBundles.ts'),
                'utf8',
            ),
        ).toThrow();
        expect(() =>
            readFileSync(
                join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardOverlaysHostProps.ts'),
                'utf8',
            ),
        ).toThrow();
        const bundles = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles.ts'),
            'utf8',
        );
        const builder = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardOverlaysBundleProps.ts'),
            'utf8',
        );
        expect(bundles).toContain('LawyerDashboardOverlaysBundleProps');
        expect(builder).toContain('buildLawyerDashboardOverlaysBundleProps');
    });

    it('MainView يستخدم overlaysBundle ويمكّن ConsolidationNav lazy', () => {
        const src = readLawyerDashboardMainViewSurface();
        expect(src).toContain('overlaysBundle');
        expect(src).toContain('LazyConsolidationNavOverlayEntry');
        expect(src).not.toMatch(
            /import \{ LawyerDashboardConsolidationNavOverlayEntry \} from/,
        );
    });
});
