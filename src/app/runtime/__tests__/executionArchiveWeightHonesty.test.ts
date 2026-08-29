import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('execution archive weight — chrome vs cards', () => {
    it('شريط المخزن لا يسحب محرّك الفلترة ولا SecureStore', () => {
        const toolbar = read(
            'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveToolbar.tsx',
        );
        const presentation = read(
            'src/app/components/lawyer/ArchivePortal/executionArchiveFilterPresentation.ts',
        );
        const instantFrame = read(
            'src/app/components/lawyer/dashboard/ExecutionArchiveInstantFrame.tsx',
        );
        const instantBody = read(
            'src/app/components/lawyer/dashboard/ExecutionArchiveInstantBody.tsx',
        );
        expect(toolbar).toContain('executionArchiveFilterPresentation');
        expect(toolbar).not.toContain('executionArchiveFilterUtils');
        expect(toolbar).not.toContain('readExecutionFileLiveSnapshot');
        expect(presentation).not.toContain('SecureStoreService');
        expect(presentation).not.toContain('readExecutionFileLiveSnapshot');
        expect(presentation).not.toContain('executionFormUtils');
        expect(instantFrame).toContain('EXECUTION_ARCHIVE_SEARCH_SHELL');
        expect(instantFrame).not.toContain('ExecutionArchiveToolbar');
        expect(instantFrame).not.toContain('ExecutionArchiveLifecycleBars');
        expect(instantFrame).not.toContain('executionArchiveFilterUtils');
        expect(instantFrame).not.toContain('ExecutionSmartCard');
        expect(instantFrame).not.toContain("from '@/app/components/ui/icons/");
        expect(instantFrame).not.toContain('homeStemIcons');
        expect(instantFrame).toContain('executionArchiveMarks');
        expect(instantBody).toContain('ExecutionArchiveInstantFrame');
        expect(instantBody).not.toContain('ExecutionArchiveToolbar');
    });

    it('سطح المخزن لا يفك بلوب ولا يسحب SecureStore عند أول تقييم', () => {
        const surface = read(
            'src/app/components/lawyer/ArchivePortal/ArchivePortalExecutionSurface.tsx',
        );
        const controller = read(
            'src/app/components/lawyer/ArchivePortal/hooks/useArchivePortalController.ts',
        );
        const filters = read(
            'src/app/components/lawyer/ArchivePortal/executionArchiveFilterUtils.ts',
        );
        const cardView = read(
            'src/app/components/lawyer/ArchivePortal/executionArchiveCardView.ts',
        );
        expect(surface).not.toContain("from './utils'");
        expect(surface).not.toContain('storageCache');
        expect(controller).not.toContain('executionArchivePreviewTimeline');
        expect(controller).not.toContain('SecureStoreService');
        expect(controller).not.toContain("from '../utils'");
        expect(controller).not.toContain('storageCache');
        expect(filters).not.toContain("from './utils'");
        expect(filters).not.toContain('executionFormUtils');
        expect(filters).not.toContain('executionModuleStrategies');
        expect(cardView).not.toContain("from '@/app/utils/storageCache'");
        expect(cardView).not.toContain("from '@/app/services/SecureStoreService'");
        expect(cardView).not.toContain('archiveFinancialSync');
        expect(cardView).not.toContain('LawyerDashboardParts/utils');
        expect(cardView).not.toContain('executionModuleStrategies');
    });

    it('مدخل المخزن لا يسحب برميل دعاوى ولا بذرة أرشيف الدعاوى', () => {
        const entry = read(
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry.tsx',
        );
        const controller = read(
            'src/app/components/lawyer/ArchivePortal/hooks/useArchivePortalController.ts',
        );
        const chrome = read(
            'src/app/components/lawyer/ArchivePortal/ExecutionArchiveChrome.tsx',
        );
        expect(entry).not.toContain('LawyerDashboardParts/utils');
        expect(entry).toContain('isArchiveClickRecord');
        expect(controller).not.toContain('LAWSUIT_PORTAL_STUB');
        expect(controller).not.toContain('lawsuitJurisdiction');
        expect(controller).not.toContain('hasExecutionLifecycle');
        expect(controller).not.toContain('executionTrashedCountForFilter');
        expect(controller).toContain("setDossierStatusFilter('all')");
        expect(chrome).not.toContain('hasExecutionLifecycle');
        expect(chrome).not.toContain("import('./components/ExecutionArchiveToolbar')");
    });

    it('الشبكة تُقيّم FileGrid ثابتاً في الكروم وتؤجّل SmartCard', () => {
        const chrome = read(
            'src/app/components/lawyer/ArchivePortal/ExecutionArchiveChrome.tsx',
        );
        const grid = read(
            'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveFileGrid.tsx',
        );
        expect(chrome).not.toContain("from '@/app/utils/lazyComponentsIntent'");
        expect(chrome).toContain("import('@/app/runtime/executionWorkspaceWarm')");
        expect(chrome).not.toContain("from '@/app/components/ui/icons/");
        expect(grid).not.toContain('جاري تحميل الإضابير');
        expect(grid).toContain('ExecutionArchiveCardPaintSlot');
        expect(chrome).toMatch(/import \{ ExecutionArchiveFileGrid \}/);
        expect(chrome).not.toContain('LazyExecutionArchiveFileGrid');
        expect(chrome).not.toContain('executionArchiveFilterUtils');
        expect(grid).not.toContain('executionArchiveFilterUtils');
        expect(grid).toContain("lazy(() => import('./ExecutionSmartCard'))");
        expect(grid).not.toMatch(/import ExecutionSmartCard from/);
        expect(grid).toContain('<Suspense fallback={<ExecutionArchiveCardPaintSlot />}>');
        expect(grid).not.toContain('<Suspense fallback={null}>');
        expect(grid).not.toMatch(/<Suspense fallback=\{null\}>\s*<ArchiveVirtualGrid/);
        expect(grid).not.toContain('setExecutionViewMode');
        expect(grid).not.toContain("from '@/app/components/ui/icons/Clock'");
        expect(chrome).toMatch(/import \{ ExecutionArchiveFileGrid \}/);
        expect(chrome).toContain('ExecutionArchivePortalState');
        expect(chrome).not.toContain('Record<string, unknown>');
        expect(chrome).toContain('ExecutionArchivePreviewPaintSlot');
        expect(chrome).not.toContain('<Suspense fallback={null}>');
        expect(chrome).toContain('hasExecutionArchivePreviewLayer');
        expect(chrome).toContain('registerNativeBackHandler');
    });

    it('البطاقة لا تسحب برميل lazyComponentsIntent', () => {
        const card = read(
            'src/app/components/lawyer/ArchivePortal/components/ExecutionSmartCard.tsx',
        );
        const body = read(
            'src/app/components/lawyer/ArchivePortal/components/ExecutionSmartCardBody.tsx',
        );
        expect(card).not.toContain("from '@/app/utils/lazyComponentsIntent'");
        expect(body).not.toContain("from '@/app/utils/lazyComponentsIntent'");
        expect(card).toContain('warmExecutionDossierFromArchiveCard');
        expect(body).toContain('warmExecutionDossierFromArchiveCard');
        expect(card).toContain("from '../executionArchiveCardView'");
        expect(card).toContain("from '@/app/workspace/executionWorkspacePin'");
        expect(card).not.toContain('workspacePinBuilders');
        expect(card).not.toContain("from '../utils'");
        expect(card).not.toContain("from '@/app/utils/storageCache'");
        expect(card).not.toContain("from '@/app/services/SecureStoreService'");
        expect(card).not.toContain('executionDossierHeaderFields');
        expect(card).not.toContain('executionModuleStrategies');
        expect(card).not.toContain('archiveFinancialSync');
        expect(body).not.toContain("from '../utils'");
        expect(body).not.toContain("from '@/app/components/ui/icons/");
        expect(body).toContain("from './ExecutionArchiveCardPin'");
        const pin = read(
            'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveCardPin.tsx',
        );
        expect(pin).toContain("import('@/app/stores/workspaceStore')");
        expect(pin).toContain('peekPinned');
        expect(pin).not.toContain('WorkspacePinButton');
        expect(pin).not.toContain('requestIdleCallback');
        expect(pin).toContain('aria-pressed={pinned}');
    });

    it('prefetch المخزن يسخّن البطاقات مع السطح', () => {
        const loader = read('src/app/runtime/hubArchiveLoader.ts');
        expect(loader).toContain('function ensureExecutionSmartCardPromise');
        expect(loader).toContain('function ensureExecutionArchiveLitePromise');
        expect(loader).toContain('function ensureExecutionArchivePinPromise');
        expect(loader).toContain('function ensureExecutionArchivePreviewPromise');
        expect(loader).toContain("import('@/app/components/lawyer/ArchivePortal/components/ExecutionSmartCard')");
        expect(loader).toContain('ArchivePortal/components/ExecutionArchiveToolbar');
        expect(loader).toContain("import('@/app/components/lawyer/ArchivePortal/components/ExecutionArchiveCardPin')");
        expect(loader).toContain('ArchivePortal/components/ArchivePortalExecutionPreviewModal');
        expect(loader).toContain('prefetchExecutionArchivePinStore');
        expect(loader).not.toContain('WorkspacePinButton');
        const fn = loader.slice(loader.indexOf('export function prefetchExecutionArchiveContent'));
        const body = fn.slice(0, fn.indexOf('export function prefetchLawsuitArchiveHubModule'));
        expect(body).toContain('ensureExecutionSurfacePromise');
        expect(body).toContain('ensureExecutionFileGridPromise');
        expect(body).toContain('ensureExecutionSmartCardPromise');
        expect(body).toContain('ensureExecutionArchiveLitePromise');
        expect(body).toContain('ensureExecutionArchivePinPromise');
        expect(body).toContain('ensureExecutionArchivePreviewPromise');
    });

    it('vite يعزل البطاقات عن شريط المخزن', () => {
        const vite = read('vite.config.mts');
        const fn = vite.slice(vite.indexOf('function resolveArchivePortalChunk'));
        const fnBody = fn.slice(0, fn.indexOf('function isBenignBuildNoise'));
        expect(fnBody).toContain("return 'archive-execution-cards'");
        expect(fnBody).toContain('/ArchivePortal/executionArchiveCardView');
        expect(fnBody).toContain('/workspace/executionWorkspacePin');
        expect(fnBody).toContain('/ArchivePortal/components/ExecutionArchiveCardPin');
        expect(fnBody).not.toContain('executionArchiveMarks');
        expect(fnBody).toContain('/ArchivePortal/executionArchiveListLabels');
        expect(fnBody).toContain('/ArchivePortal/executionArchiveFilterPresentation');
        expect(fnBody.indexOf("return 'archive-execution-cards'")).toBeLessThan(
            fnBody.indexOf("return 'archive-portal-execution'"),
        );
        expect(fnBody.indexOf('ExecutionArchiveToolbar')).toBeGreaterThan(
            fnBody.indexOf("return 'archive-portal-execution'"),
        );
        expect(fnBody.indexOf('ExecutionArchiveFileGrid')).toBeLessThan(
            fnBody.indexOf('ExecutionArchiveToolbar'),
        );
    });
});
