import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('phase-17 ArchivePortal content first-paint', () => {
    it('مسار الدعاوى منفصل — LawsuitArchiveChrome بلا ExecutionArchiveFileGrid', () => {
        const portal = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal.tsx'),
            'utf8',
        );
        const lawsuitChrome = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/LawsuitArchiveChrome.tsx'),
            'utf8',
        );
        const lawsuitSurface = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/ArchivePortalLawsuitSurface.tsx'),
            'utf8',
        );
        expect(portal).not.toMatch(
            /import\s*\{[^}]*ArchivePortalExecutionSurface[^}]*\}\s*from/,
        );
        expect(portal).toContain('LazyArchivePortalExecutionSurface');
        expect(portal).toContain('ArchivePortalLawsuitSurface');
        expect(lawsuitSurface).not.toContain('useArchivePortalController');
        expect(lawsuitSurface).not.toContain('executionArchiveEnrichment');
        expect(lawsuitSurface).toContain('LawsuitArchiveChrome');
        expect(lawsuitChrome).not.toContain('ExecutionArchiveFileGrid');
        expect(lawsuitChrome).not.toContain('ExecutionArchiveToolbar');
        expect(lawsuitChrome).toContain('LawsuitArchiveGridFallback');
        expect(lawsuitChrome).toMatch(
            /Suspense fallback=\{LawsuitArchiveGridFallback\}[\s\S]{0,80}LazyLawsuitArchiveFileGrid/,
        );
    });

    it('hubArchiveLoader يسخّن LawsuitArchiveFileGrid مع مسار الدعاوى', () => {
        const src = readFileSync(join(root, 'src/app/runtime/hubArchiveLoader.ts'), 'utf8');
        expect(src).toContain('prefetchLawsuitArchiveContent');
        expect(src).toContain('LawsuitArchiveFileGrid');
        expect(src).toContain('ArchivePortalLawsuitEntry');
        expect(src).toMatch(
            /export function loadLawsuitArchiveHubModule[\s\S]{0,200}prefetchLawsuitArchiveContent/,
        );
    });

    it('LawsuitArchiveFileGrid لا يسحب ExecutionSmartCard', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveFileGrid.tsx'),
            'utf8',
        );
        expect(src).not.toContain("from './ExecutionSmartCard'");
        expect(src).not.toContain('useExecutionArchiveCardLiveRevision');
        expect(src).toContain('testId="lawsuit-archive-grid"');
        expect(src).toContain('data-testid="lawsuit-archive-empty"');
        expect(src).toContain('testIdPrefix="lawsuit-card"');
    });

    it('lawsuitWorkspaceWarm يستدعي prefetch المحتوى بلا جسر جزائي فوري', () => {
        const src = readFileSync(join(root, 'src/app/runtime/lawsuitWorkspaceWarm.ts'), 'utf8');
        expect(src).toContain('prefetchLawsuitArchiveContent');
        expect(src).not.toMatch(
            /export function warmLawsuitWorkspace[\s\S]{0,500}requestCriminalDashboardBridgeActivate\(\)/,
        );
    });

    it('LawsuitArchiveFileGrid/Controller لا يستوردان lazyComponents barrel', () => {
        const grid = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveFileGrid.tsx'),
            'utf8',
        );
        const lawsuitController = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/hooks/useLawsuitArchivePortalController.ts'),
            'utf8',
        );
        const executionController = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/hooks/useArchivePortalController.ts'),
            'utf8',
        );
        const utils = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/criminalArchiveUtils.ts'),
            'utf8',
        );
        expect(grid).not.toContain("from '@/app/utils/lazyComponents'");
        expect(executionController).not.toContain("from '@/app/utils/lazyComponents'");
        expect(lawsuitController).not.toContain("from '@/app/utils/lazyComponents'");
        expect(grid).toContain("from '@/app/utils/lazyComponentsIntent'");
        const dossierState = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/hooks/useLawsuitArchivePortalDossierState.ts'),
            'utf8',
        );
        expect(dossierState).toContain("from '@/app/utils/lazyComponentsIntent'");
        expect(lawsuitController).not.toContain("from '@/app/utils/lazyComponentsIntent'");
        expect(executionController).not.toContain("from '@/app/utils/lazyComponentsIntent'");
        expect(utils).not.toContain('criminalStageUtils');
        expect(utils).toContain('criminalStagePresentationCore');
        expect(utils).toContain('criminalStageRuntimeCore');
    });

    it('vite يعزل lawsuit-archive-portal و lawsuit-archive-grid', () => {
        const src = readFileSync(join(root, 'vite.config.mts'), 'utf8');
        expect(src).toContain("return 'archive-portal-lite'");
        expect(src).toContain("return 'lawsuit-archive-portal'");
        expect(src).toContain("return 'lawsuit-archive-grid'");
        expect(src).toContain('/ArchivePortal/LawsuitArchiveChrome');
        expect(src).toContain('/ArchivePortal/components/LawsuitArchiveFileGrid');
    });
});
