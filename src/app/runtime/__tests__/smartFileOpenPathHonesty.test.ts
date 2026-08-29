import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('smart-file open-path delay honesty', () => {
    it('OverlayHosts keeps the vault visible until the dossier paints', () => {
        const hosts = read(
            'src/app/components/lawyer/dashboard/LawyerDashboardMainViewOverlayHosts.tsx',
        );
        expect(hosts).not.toContain('setShowLawsuitsWorkspace(false)');
        expect(hosts).toContain('useLayoutEffect');
        expect(hosts).toContain('SmartFileModalBootChrome');
        expect(hosts).not.toContain('LazySmartFileModalBootChrome');
        expect(hosts).toContain('showLawsuitsWorkspace ? null');
        expect(hosts).toContain('smartFileSurfaceLive');
        expect(hosts).not.toMatch(
            /smartFileLive \? \(\s*<Suspense fallback=\{null\}>/,
        );
    });

    it('SmartFile overlay entry hides the vault only after paint and keeps the last file', () => {
        const entry = read(
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardSmartFileOverlayEntry.tsx',
        );
        expect(entry).toContain('SmartFileModalBootChrome');
        expect(entry).toContain('LazySmartFileModalPortal');
        expect(entry).toContain('hideVaultAfterPaint');
        expect(entry).toContain('setShowLawsuitsWorkspace(false)');
        expect(entry).toContain('surfaceActive');
        expect(entry).toContain('coverWhilePending');
        expect(entry).toContain('heldFileRef');
        expect(entry).not.toContain('useLayoutEffect');
    });

    it('opening a dossier from the lawsuits workspace does not play hub-exit animation', () => {
        const lawsuits = read(
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardLawsuitsOverlayEntry.tsx',
        );
        expect(lawsuits).toContain('markLawsuitDossierOpenedFromWorkspace');
        expect(lawsuits).not.toMatch(
            /onOpenFile[\s\S]{0,280}closeLawsuitsWorkspace\(\)/,
        );
    });

    it('open contract kicks overlay/portal/modal prefetch in the same tick', () => {
        const open = read('src/app/runtime/lawsuitOpenContract.ts');
        expect(open).toContain("from '@/app/runtime/smartFileOverlayEntryLoader'");
        expect(open).toContain("from '@/app/components/lawyer/dashboard/smartFileModalPortalLazy'");
        expect(open).toContain("from '@/app/runtime/smartFileModalLoader'");
        expect(open).toContain('prefetchSmartFileOverlayEntry()');
        expect(open).toContain('prefetchSmartFileModalPortal()');
        expect(open).toContain('prefetchSmartFileModalPhased()');
        expect(open).toContain('prefetchPersonalStatusDossierSurface()');
        expect(open).not.toMatch(
            /void import\('@\/app\/runtime\/smartFileOverlayEntryLoader'\)/,
        );
    });

    it('portal catches modal Suspense internally and merges disk identity', () => {
        const portal = read('src/app/components/lawyer/dashboard/SmartFileModalPortal.tsx');
        expect(portal).toContain('<Suspense');
        expect(portal).toContain('SmartFileModalBootChrome');
        expect(portal).toContain('coverWhilePending');
        expect(portal).toContain('onPainted');
        expect(portal).toContain('dossierPainted');
        expect(portal).toContain('showBootCover');
        expect(portal).toContain('return { ...file, ...(fresh as SmartFileModalProps[\'file\']) }');
    });

    it('personal-status chrome/body share preloadable identity with the open contract', () => {
        const lazy = read(
            'src/app/components/lawyer/personal-status/personalStatusDossierLazy.ts',
        );
        const content = read('src/app/components/lawyer/smart-modal/SmartFileModalContent.tsx');
        const panel = read('src/app/components/lawyer/smart-modal/layout/SmartFileMainPanel.tsx');
        const loader = read('src/app/runtime/smartFileModalLoader.ts');
        expect(lazy).toContain('createPreloadableLazyComponent');
        expect(lazy).toContain('prefetchPersonalStatusDossierSurface');
        expect(content).toContain('personalStatusDossierLazy');
        expect(content).toContain('LazyPersonalStatusDossierSurface');
        expect(content).toContain('dossierRevealed');
        expect(content).toContain('personalReady');
        expect(panel).toContain('personalStatusDossierLazy');
        expect(panel).toContain('LazyPersonalStatusDossierBody');
        expect(loader).toContain('prefetchPersonalStatusDossierSurface');
    });

    it('cards start chrome on pointerdown, not only hover-once', () => {
        const card = read(
            'src/app/components/lawyer/ArchivePortal/components/UnifiedDossierCard.tsx',
        );
        const grid = read(
            'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveFileGrid.tsx',
        );
        expect(card).toContain('onPointerDown');
        expect(card).toContain('prepareLawsuitDossierChrome()');
        expect(grid).toContain('onPointerDown');
        expect(grid).toContain('prepareLawsuitDossierChrome()');
    });
});
