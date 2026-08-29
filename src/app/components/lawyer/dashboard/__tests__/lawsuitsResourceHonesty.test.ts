import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isSensitiveStorageKey, shouldEncryptValue } from '@/app/services/secureStorageKeys';
import { LAWSUIT_DOSSIER_TOMBSTONES_KEY } from '@/app/utils/lawsuitDossierTombstones';
import { PROTECTED_WARM_KEYS } from '@/app/services/dossierPersistence/protectedStorageKeys';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('lawsuits resource honesty', () => {
    it('الأرشيف يبقى مركّباً أثناء keep-alive حتى لا يتكرر هيكل التحميل', () => {
        const host = read('src/app/components/lawyer/dashboard/LawsuitsWorkspaceHost.tsx');
        expect(host).toContain('{(tab) =>');
        expect(host).toContain('mountLawsuitTrees');
        expect(host).toContain('active || retainArchive');
        expect(host).toContain('<ArchivePortalHost');
        expect(host).toContain(') : null');
        expect(host).toContain('clearSecondaryLawsuitWarm');
        expect(host).toContain('window.clearTimeout');
        expect(host).toContain('if (!active)');
        const entry = read(
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardLawsuitsOverlayEntry.tsx',
        );
        expect(entry).toContain('retainArchive={retainArchive || overlays.lawsuitsHostMounted}');
        expect(entry).toContain('newCase.isNewCaseModalOpen');
        expect(entry).toContain('overlays.criminalDashboardCaseId');
        expect(entry).not.toContain('beginHubLayerExit');
        const urgent = read(
            'src/app/components/lawyer/dashboard/LawsuitsWorkspaceUrgentTab.tsx',
        );
        expect(urgent).toContain('if (!armed)');
        expect(urgent).toContain('createLazyUrgentDashboard');
    });

    it('التسخين الخلفي لمحتوى الأرشيف يحترم سياسة الأقسام', () => {
        const overlays = read('src/app/hooks/useLawyerDashboardOverlays.ts');
        expect(overlays).toContain('isSectionBackgroundPrefetchAllowed');
        expect(overlays).toContain('prefetchLawsuitArchiveHubModule');
        expect(overlays).toContain('primeLawsuitsWorkspaceChunks');
        expect(overlays).toContain('prefetchLawsuitsWorkspaceHost');
        expect(overlays).toMatch(
            /if \(isSectionBackgroundPrefetchAllowed\(\)\) \{\s*void import\('@\/app\/runtime\/hubArchiveLoader'\)/,
        );
        expect(overlays).toContain('useKeepAliveIdleRelease(showLawsuitsWorkspace');
    });

    it('الطبقة المغلقة inert مع قفل التمرير فقط عند الفتح', () => {
        const shell = read('src/app/components/lawyer/dashboard/LawsuitsWorkspaceShell.tsx');
        expect(shell).toContain('inertProps(!open)');
        expect(shell).toContain('motion-safe:animate-pulse');
        expect(shell).not.toMatch(/bg-white\/\[0\.04\] animate-pulse/);
        expect(shell).toContain('addCaseFab');
        expect(shell).not.toMatch(
            /pointer-events-none fixed inset-0 z-\[235\][\s\S]{0,280}aria-hidden/,
        );
    });

    it('هيكل التحميل يقلّل الحركة ويرفع منطقة التمرير فوق لوحة المفاتيح', () => {
        const instant = read(
            'src/app/components/lawyer/dashboard/LawsuitsCivilArchiveInstantShell.tsx',
        );
        expect(instant).toContain('useMobileKeyboardInset');
        expect(instant).toContain('جاري تجهيز الإضابير');
        expect(instant).not.toContain('LawsuitVaultSnapshotGrid');
        expect(instant).not.toContain('motion-safe:animate-pulse');
        expect(instant).not.toMatch(/min-h-\[120px\] animate-pulse/);
    });

    it('مفتاح tombstones الدعاوى حسّاس — يُفكّ عند المزامنة لا عند تسخين مقاطع الدعوى', () => {
        expect(LAWSUIT_DOSSIER_TOMBSTONES_KEY).toBe('hami:lawsuit:dossier-tombstones:v1');
        expect(isSensitiveStorageKey(LAWSUIT_DOSSIER_TOMBSTONES_KEY)).toBe(true);
        expect(shouldEncryptValue(LAWSUIT_DOSSIER_TOMBSTONES_KEY, '["id-1"]')).toBe(true);
        expect([...PROTECTED_WARM_KEYS]).toContain(LAWSUIT_DOSSIER_TOMBSTONES_KEY);
        const keys = read('src/app/services/secureStorageKeys.ts');
        expect(keys).toContain("'hami:lawsuit:dossier-tombstones:v1'");
        const ready = read('src/app/services/SecureStoreService.ts');
        const lawsuitReady = ready.slice(
            ready.indexOf('static async ensureLawsuitKeysReady'),
            ready.indexOf('static async ensureExecutionIndexReady'),
        );
        expect(lawsuitReady).not.toContain('hami:lawsuit:dossier-tombstones:v1');
        const engine = read('src/app/services/cloudSyncEngine.ts');
        expect(engine).toContain('ensureLawsuitDossierTombstonesReadable');
    });

    it('حد ENCRYPT_MAX_BYTES لا يدّعي plaintext لكل المفاتيح — استثناء الدعاوى/التنفيذ معلن', () => {
        const keys = read('src/app/services/secureStorageKeys.ts');
        const start = keys.indexOf('حد حجم التشفير الافتراضي');
        const end = keys.indexOf('export const ENCRYPT_MAX_BYTES = 512 * 1024');
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThan(start);
        const comment = keys.slice(start, end);
        expect(comment).toContain('fallsBackToPlaintextBySize');
        expect(comment).toContain('تُشفَّر أو تفشل');
        expect(keys).toContain('isLawsuitEncryptAlwaysKey');
        expect(keys).toContain('isWarmEncryptAlwaysKey');
        // التنفيذ خرج من التشفير المحلي: استثناؤه plaintext لا encrypt-always
        expect(keys).toContain('isExecutionLocalPlaintextKey');
        expect(keys).not.toContain('isExecutionEncryptAlwaysKey');
    });

    it('محور E2E الدعاوى على ويندوز هو Vite :8080 ما لم يُطلب preview صراحة', () => {
        const gate = read('scripts/lawsuits-production-gate.mjs');
        expect(gate).toContain("LAWSUITS_E2E_USE_PREVIEW === '1'");
        expect(gate).toContain('E2E axis: Vite :8080');
        expect(gate).toContain("E2E_USE_PREVIEW: '0'");

        const ci = read('scripts/run-lawsuits-ci-e2e.mjs');
        expect(ci).toContain('civil-lawsuit-lifecycle.spec.ts');
        expect(ci).toContain("LAWSUITS_E2E_USE_PREVIEW === '1'");
        expect(ci).toContain('runPlaywrightVite');

        const mobile = read('scripts/run-civil-lawsuits-mobile-e2e.mjs');
        expect(mobile).toContain("LAWSUITS_E2E_USE_PREVIEW === '1'");
        expect(mobile).toContain("E2E_USE_PREVIEW: '0'");

        const perf = read('scripts/lawsuits-perf-gate.mjs');
        expect(perf).toContain('--url=http://localhost:8080');

        const probe = read('scripts/lawsuits-dossier-ttfi-probe.mjs');
        expect(probe).toContain('[data-testid="lawsuits-add-new"]:visible');
        expect(probe).toContain('[data-testid="lawsuits-workspace"][data-open="true"]:visible');
        expect(probe).not.toContain("openWorkspace.getByTestId('lawsuits-add-new')");
        expect(probe).toContain('hubClicks');
        expect(probe).toContain('lawsuits-workspace-exit');
        expect(probe).toContain('4_000');
        expect(probe).toContain(
            'openWorkspace.locator(`[data-testid="lawsuit-file-${E2E_CIVIL_FILE_ID}"]`)',
        );
        expect(probe).toContain('dossierDeadline');
        expect(probe).toContain("click({ force: true, timeout: 3_000 })");
        expect(probe).toContain('waitForTimeout(80)');

        const host = read('src/app/components/lawyer/dashboard/LawsuitsWorkspaceHost.tsx');
        expect(host).toContain('prepareLawsuitDossierChromeOnce');
        expect(host).not.toContain('prepareLawsuitDossierOpen');
        expect(host).toContain(', 200)');
        expect(host).not.toContain('1_800');
        expect(host).toContain('lawsuits-jurisdiction-picker');
        expect(host).not.toContain('12_000');

        const release = read('scripts/release-check-lawsuits.mjs');
        expect(release).toContain("E2E_USE_PREVIEW: '0'");
        expect(release).toContain("LAWSUITS_E2E_USE_PREVIEW: '0'");
        expect(release).toContain("E2E_SKIP_WEBSERVER: process.env.E2E_SKIP_WEBSERVER ?? '1'");

        const worldclass = read('scripts/release-check-lawsuits-worldclass.mjs');
        expect(worldclass).toContain("E2E_USE_PREVIEW: '0'");
        expect(worldclass).toContain("LAWSUITS_E2E_USE_PREVIEW: '0'");
        expect(worldclass).toContain("E2E_SKIP_WEBSERVER: process.env.E2E_SKIP_WEBSERVER ?? '1'");
    });
});
