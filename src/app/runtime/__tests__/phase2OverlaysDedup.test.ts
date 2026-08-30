import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('Phase 2 — lawyer overlays de-dupe (after Phase 4)', () => {
    it('MainView يركّب execution/lawsuits/criminal خارج Host مع keep-alive للدعاوى', () => {
        const src = readLawyerDashboardMainViewSurface();
        expect(src).toContain('LazyExecutionOverlayEntry');
        expect(src).toContain('LazyLawsuitsOverlayEntry');
        expect(src).toContain('LazyCriminalOverlayEntry');
        expect(src).toContain('lawsuitsLive');
        expect(src).toContain('lawsuitsHostMounted');
        expect(src).toContain('criminalLive');
        expect(src).toContain('criminalDashboardCaseId');
    });

    it('OverlaysHost محذوف بالكامل', () => {
        expect(() =>
            readFileSync(
                join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardOverlaysHost.tsx'),
                'utf8',
            ),
        ).toThrow();
    });

    it('CaseOverlays محذوف بالكامل', () => {
        expect(() =>
            readFileSync(
                join(
                    root,
                    'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCaseOverlays.tsx',
                ),
                'utf8',
            ),
        ).toThrow();
    });

    it('notesBootSettled لا يُمرَّر إلى overlays — الخلاصة لا تعتمد عليه', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardOverlaysBundleProps.ts'),
            'utf8',
        );
        expect(src).not.toContain('notesBootSettled');
    });
});
