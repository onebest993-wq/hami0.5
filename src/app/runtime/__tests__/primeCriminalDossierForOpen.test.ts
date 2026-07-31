import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../../..');

describe('primeCriminalDossierForOpen', () => {
    it('openCriminalCase يفتح مباشرة مع prefetch (بدون تأخير setTimeout)', () => {
        const overlaysPath = path.join(root, 'src/app/hooks/useLawyerDashboardOverlays.ts');
        const source = fs.readFileSync(overlaysPath, 'utf8');
        expect(source).toContain('setCriminalDashboardCaseId');
        expect(source).toContain('prefetchCriminalDashboard');
        expect(source).not.toContain('setTimeout(openLayer, 180)');
    });

    it('criminal dossier mounts on MainView؛ OverlaysHost محذوف', () => {
        const mainPath = path.join(
            root,
            'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx',
        );
        const mainSource = fs.readFileSync(mainPath, 'utf8');
        expect(mainSource).toContain('LawyerDashboardCriminalOverlayEntry');
        expect(mainSource).toContain('criminalLive');
        expect(() =>
            fs.readFileSync(
                path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardOverlaysHost.tsx'),
                'utf8',
            ),
        ).toThrow();
    });

    it('prime helper waits for hydrate then injects before module settle', () => {
        const primePath = path.join(root, 'src/app/runtime/primeCriminalDossierForOpen.ts');
        const source = fs.readFileSync(primePath, 'utf8');
        expect(source).toContain('waitForCriminalStoreHydration');
        expect(source).toContain('loadCriminalCaseRecordByIdSync');
        expect(source).toContain('loadCriminalDashboardModule');
        expect(source).toContain('PRIME_BUDGET_MS');
    });
});
