import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

describe('SmartFile lift — خارج Host (Phase 4)', () => {
    it('MainView يركّب LawyerDashboardSmartFileOverlayEntry', () => {
        const src = readLawyerDashboardMainViewSurface();
        expect(src).toContain('LazySmartFileOverlayEntry');
        expect(src).toContain('loadSmartFileOverlayEntry');
        expect(src).toContain('smartFileLive');
    });

    it('CaseOverlays و OverlaysHost محذوفان', () => {
        expect(() =>
            readFileSync(
                join(
                    process.cwd(),
                    'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCaseOverlays.tsx',
                ),
                'utf8',
            ),
        ).toThrow();
        expect(() =>
            readFileSync(
                join(process.cwd(), 'src/app/components/lawyer/dashboard/LawyerDashboardOverlaysHost.tsx'),
                'utf8',
            ),
        ).toThrow();
    });
});
