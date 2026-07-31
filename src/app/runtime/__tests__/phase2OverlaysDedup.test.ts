import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Phase 2 — lawyer overlays de-dupe (after Phase 4)', () => {
    it('MainView يركّب execution/lawsuits/criminal خارج Host مع keep-alive للدعاوى', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(src).toContain('LawyerDashboardExecutionOverlayEntry');
        expect(src).toContain('LawyerDashboardLawsuitsOverlayEntry');
        expect(src).toContain('LawyerDashboardCriminalOverlayEntry');
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

    it('notesBootSettled يُمرَّر من workspace إلى data bundle', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardOverlaysBundleProps.ts'),
            'utf8',
        );
        expect(src).toContain('notesBootSettled: workspace.notesBootSettled');
    });
});
