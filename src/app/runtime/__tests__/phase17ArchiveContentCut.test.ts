import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('phase-17 ArchivePortal content first-paint', () => {
    it('ArchivePortal dispatcher رفيع — مسار التنفيذ sync؛ الدعاوى تبقى lazy FileGrid', () => {
        const portal = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal.tsx'),
            'utf8',
        );
        const chrome = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/ArchivePortalChrome.tsx'),
            'utf8',
        );
        const lawsuitSurface = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/ArchivePortalLawsuitSurface.tsx'),
            'utf8',
        );
        expect(portal).not.toMatch(
            /import\s*\{[^}]*ExecutionArchiveFileGrid[^}]*\}\s*from\s*['"]\.\/ArchivePortal\/components\/ExecutionArchiveFileGrid['"]/,
        );
        expect(portal).not.toContain('useArchivePortalController');
        expect(portal).toContain('ArchivePortalExecutionSurface');
        expect(lawsuitSurface).not.toContain('useArchivePortalController');
        expect(lawsuitSurface).not.toContain('executionArchiveEnrichment');
        expect(chrome).toMatch(/import \{ ExecutionArchiveFileGrid \}/);
        expect(chrome).toMatch(/import \{ ExecutionArchiveToolbar \}/);
        expect(chrome).toContain('LawsuitArchiveGridFallback');
        expect(chrome).toMatch(
            /Suspense fallback=\{LawsuitArchiveGridFallback\}[\s\S]{0,80}LazyArchivePortalFileGrid/,
        );
    });

    it('hubArchiveLoader يسخّن FileGrid مع مسار الدعاوى', () => {
        const src = readFileSync(join(root, 'src/app/runtime/hubArchiveLoader.ts'), 'utf8');
        expect(src).toContain('prefetchLawsuitArchiveContent');
        expect(src).toContain(
            "import('@/app/components/lawyer/ArchivePortal/components/ArchivePortalFileGrid')",
        );
        expect(src).toMatch(
            /export function loadLawsuitArchiveHubModule[\s\S]{0,200}prefetchLawsuitArchiveContent/,
        );
    });

    it('ArchivePortalFileGrid لا يسحب ExecutionSmartCard على مسار الدعاوى', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/components/ArchivePortalFileGrid.tsx'),
            'utf8',
        );
        expect(src).not.toContain("from './ExecutionSmartCard'");
        expect(src).not.toContain('useExecutionArchiveCardLiveRevision');
        expect(src).toContain('data-testid="lawsuit-archive-grid"');
        expect(src).toContain("data-testid={type === 'lawsuits' ? 'lawsuit-archive-empty'");
        expect(src).toContain('testIdPrefix="lawsuit-card"');
    });

    it('lawsuitWorkspaceWarm يستدعي prefetch المحتوى بلا جسر جزائي فوري', () => {
        const src = readFileSync(join(root, 'src/app/runtime/lawsuitWorkspaceWarm.ts'), 'utf8');
        expect(src).toContain('prefetchLawsuitArchiveContent');
        expect(src).not.toMatch(
            /export function warmLawsuitWorkspace[\s\S]{0,500}requestCriminalDashboardBridgeActivate\(\)/,
        );
    });

    it('ArchivePortalFileGrid/Controller لا يستوردان lazyComponents barrel', () => {
        const grid = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/components/ArchivePortalFileGrid.tsx'),
            'utf8',
        );
        const controller = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/hooks/useArchivePortalController.ts'),
            'utf8',
        );
        const utils = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/criminalArchiveUtils.ts'),
            'utf8',
        );
        expect(grid).not.toContain("from '@/app/utils/lazyComponents'");
        expect(controller).not.toContain("from '@/app/utils/lazyComponents'");
        expect(grid).toContain("from '@/app/utils/lazyComponentsIntent'");
        expect(controller).toContain("from '@/app/utils/lazyComponentsIntent'");
        expect(utils).not.toContain('criminalStageUtils');
        expect(utils).toContain('criminalStagePresentationCore');
        expect(utils).toContain('criminalStageRuntimeCore');
    });

    it('vite يعزل شريط الأرشيف وcriminalArchiveUtils خارج LawyerDashboard', () => {
        const src = readFileSync(join(root, 'vite.config.mts'), 'utf8');
        expect(src).toContain("return 'archive-portal-lite'");
        expect(src).toContain('/ArchivePortal/components/ArchivePortalLifecycleBars');
        expect(src).toContain('/ArchivePortal/components/ArchiveDossierToolbar');
        expect(src).toContain('/ArchivePortal/criminalArchiveUtils');
        expect(src).toContain('/src/app/utils/executionStateMachine');
    });

    it('vite يسمي ArchivePortal كـ app-archive-portal', () => {
        const src = readFileSync(join(root, 'vite.config.mts'), 'utf8');
        expect(src).toContain("return 'app-archive-portal'");
        expect(src).toContain('/components/lawyer/ArchivePortal.tsx');
    });
});
