import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cs = path.join(root, 'src/app/components/lawyer/criminal-system');

describe('wave7j score max honesty', () => {
    it('caseOps يركّب referral + cassation', () => {
        const t = fs.readFileSync(path.join(cs, 'criminalStoreCaseOpsActions.ts'), 'utf8');
        expect(t).toContain('createCriminalCaseReferralActions');
        expect(t).toContain('createCriminalCaseCassationOpsActions');
        expect(t).not.toContain('applyInvestigationReferral:');
        expect(t).not.toContain('initiateCassationProceeding:');
        expect(t.split(/\r?\n/).length).toBeLessThan(400);
    });

    it('header preload بعد content-ready لا أثناء تحميل stem', () => {
        const t = fs.readFileSync(path.join(root, 'src/app/bootstrap/lawyerDashboardChunk.ts'), 'utf8');
        expect(t).toContain('armHeaderShellWarmAfterContentReady');
        expect(t).toContain('onBootContentReady');
        expect(t).toMatch(
            /markChunkLoadedOnce\(\);\s*armHeaderShellWarmAfterContentReady\(\);/,
        );
        expect(t).not.toMatch(
            /preloadLawyerDashboardHeaderShellChunks\(\);\s*return loadLawyerDashboardModule/,
        );
        expect(t).not.toMatch(
            /markChunkLoadedOnce\(\);\s*preloadLawyerDashboardHeaderShellChunks\(\);/,
        );
    });

    it('push sync ديناميكي من hooks اللوحة', () => {
        const alerts = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardAppAlerts.ts'),
            'utf8',
        );
        const nav = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardNavigation.ts'),
            'utf8',
        );
        expect(alerts).not.toMatch(/import \{ markAlertSeenForPush \}/);
        expect(nav).not.toMatch(/import \{ markAlertSeenForPush \}/);
        expect(alerts).toContain("import('@/app/services/appAlertPushSync')");
        expect(nav).toContain("import('@/app/services/appAlertPushSync')");
    });
});
