import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('execution archive inline chrome honesty', () => {
    it('المسار الحي لا يرسم ArchiveHubInstantShell فوق InstantChrome', () => {
        const entry = read(
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry.tsx',
        );
        const host = read('src/app/components/lawyer/dashboard/ArchivePortalHost.tsx');
        const chrome = read(
            'src/app/components/lawyer/dashboard/ExecutionArchiveInstantChrome.tsx',
        );
        expect(entry).toContain('ArchivePortalExecutionSurface');
        expect(entry).toContain("lazy(() =>");
        expect(entry).not.toMatch(/import \{ ArchivePortalExecutionSurface \}/);
        expect(entry).toContain('ExecutionArchiveInstantBody');
        expect(entry).toContain('hideHeader');
        expect(entry).toContain('embedded');
        expect(entry).not.toContain('ArchiveHubInstantShell');
        expect(entry).not.toContain('archive-hub-loading');
        expect(chrome).toContain('data-testid="execution-archive-shell"');
        expect(chrome).toContain('مخزن الأضابير التنفيذية');
        expect(chrome).toContain('ExecutionArchiveInstantBody');
        expect(chrome).toContain('<Suspense fallback=');
        const hosts = read(
            'src/app/components/lawyer/dashboard/LawyerDashboardMainViewOverlayHosts.tsx',
        );
        expect(hosts).not.toMatch(
            /LazyExecutionOverlayEntry[\s\S]{0,80}fallback=\{null\}/,
        );
        expect(hosts).toContain('ExecutionArchiveInstantPaintCover');
        expect(hosts).toMatch(/executionArchiveOpen \? \(/);
        expect(hosts).toMatch(
            /ExecutionArchiveInstantPaintCover[\s\S]{0,220}onAddNew=/,
        );
        expect(hosts).not.toMatch(
            /LazyExecutionArchiveInstantChrome[\s\S]{0,120}fallback=\{null\}/,
        );
        expect(hosts).toContain('ExecutionDossierInstantPaintCover');
        expect(hosts).not.toMatch(
            /LazyExecutionDossierOverlayEntry[\s\S]{0,80}fallback=\{null\}/,
        );
        expect(host).toContain("const inlineFrame = resolvedLoadingVariant === 'inline'");
        expect(host).toMatch(/if \(inlineFrame\) \{\s*return null;/);
    });

    it('نية البلاطة تسلّح Host حتى على lite؛ الجلوس يسخّن المقطع دون تركيب', () => {
        const overlays = read('src/app/hooks/useLawyerDashboardOverlays.ts');
        const prime = overlays.slice(overlays.indexOf('const onPrimeExecution'));
        const primeBody = prime.slice(0, prime.indexOf('window.addEventListener'));
        expect(primeBody).toContain('armExecutionArchiveHost()');
        expect(primeBody).not.toContain('isLitePerformanceActive()');
        expect(overlays).toContain('prefetchExecutionArchiveOpen()');

        const sit = overlays.slice(
            overlays.indexOf('return onDashboardInteractive'),
            overlays.indexOf('}, [armLawsuitsHost]'),
        );
        expect(sit).not.toContain('armExecutionArchiveHost()');
        expect(sit).not.toContain('prefetchExecutionArchiveOpen');

        const afterHome = read('src/app/runtime/hubArchiveAfterHomePaint.ts');
        expect(afterHome).toContain('prefetchExecutionArchiveOpen');
        expect(afterHome).toContain("isSectionBackgroundPrefetchAllowed({ allowOnLite: true })");
        expect(afterHome).not.toContain('armExecutionArchiveHost');
        expect(afterHome).not.toContain('BOOT_REVEAL_DONE');

        const main = read('src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx');
        expect(main).toContain('hubArchiveAfterHomePaint');
        expect(main).toContain('prefetchHubArchivesAfterHomePaint');
        expect(main).toContain('onBootContentReady');
        expect(main).toContain('BOOT_REVEAL_DONE_EVENT');
        const hubPrefetch = main.slice(main.indexOf('hubArchiveAfterHomePaint') - 80);
        expect(hubPrefetch.indexOf('onBootContentReady')).toBeLessThan(
            hubPrefetch.indexOf('overlayEntryChunks'),
        );

        const gate = read('src/app/bootstrap/homeMainGridPaintGate.ts');
        expect(gate).not.toContain('hubArchiveAfterHomePaint');
        expect(gate).not.toContain('prefetchExecutionArchiveOpen');

        const chunks = read('src/app/runtime/overlayEntryChunks.ts');
        expect(chunks.indexOf('prefetchHubArchivesAfterHomePaint')).toBeGreaterThan(0);
        expect(chunks.indexOf('prefetchHubArchivesAfterHomePaint')).toBeLessThan(
            chunks.indexOf('profile/ProfileTabHost'),
        );
    });
});
