import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('Phase 4 — CaseOverlays/Host full lift', () => {
    it('MainView يركّب NewCase + Consolidation + NonExecArchive', () => {
        const src = readLawyerDashboardMainViewSurface();
        expect(src).toContain('LawyerDashboardNewCaseOverlayEntry');
        expect(src).toContain('LawyerDashboardConsolidationNavOverlayEntry');
        expect(src).toContain('LawyerDashboardNonExecArchiveOverlayEntry');
        expect(src).toContain('newCaseLive');
        expect(src).toContain('consolidationNavLive');
        expect(src).toContain('nonExecArchiveLive');
        expect(src).not.toContain('LazyLawyerDashboardOverlaysHost');
        expect(src).not.toContain('overlaysVisible');
        expect(src).not.toContain('CaseArchiveInstantFallback');
    });

    it('CaseOverlays و OverlaysHost محذوفان', () => {
        expect(() =>
            readFileSync(
                join(
                    root,
                    'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCaseOverlays.tsx',
                ),
                'utf8',
            ),
        ).toThrow();
        expect(() =>
            readFileSync(
                join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardOverlaysHost.tsx'),
                'utf8',
            ),
        ).toThrow();
    });

    it('entries الجديدة لا تسجّل Escape التنفيذ', () => {
        for (const rel of [
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardNewCaseOverlayEntry.tsx',
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardConsolidationNavOverlayEntry.tsx',
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardNonExecArchiveOverlayEntry.tsx',
        ]) {
            const src = readFileSync(join(root, rel), 'utf8');
            expect(src).not.toContain('useLawyerExecutionOverlayEscape');
        }
    });
});
