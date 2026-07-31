import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('execution dossier instant open — archive warm + sync Entry', () => {
    it('MainView يركّب Dossier Entry بشكل sync بلا Suspense InstantChrome', () => {
        const main = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toMatch(
            /import \{ LawyerDashboardExecutionDossierOverlayEntry \} from/,
        );
        expect(main).not.toContain('LazyExecutionDossierOverlayEntry');
        expect(main).toContain('executionDossierHostFile');
        expect(main).toContain('EXECUTION_DOSSIER_PRIME_HOST_EVENT');
        expect(main).not.toMatch(
            /executionDossierLive[\s\S]{0,200}ExecutionDossierInstantChrome/,
        );
    });

    it('OverlayEntry يستخدم نفس preloadable Portal ويتخطى Suspense عند الجاهزية', () => {
        const entry = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionDossierOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).toContain('executionDashboardPortalLazy');
        expect(entry).toContain('isPreloaded()');
        expect(entry).toContain('open={open}');
        expect(entry).not.toContain('lazyWithRetry');
    });

    it('Portal يخفي keep-alive على جذر createPortal (لا يفلت من غلاف Entry)', () => {
        const portal = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ExecutionDashboardPortal.tsx'),
            'utf8',
        );
        expect(portal).toContain('open = true');
        expect(portal).toContain('execution-dashboard-portal-keepalive');
        expect(portal).toContain('pointerEvents: open ? \'auto\' : \'none\'');
        expect(portal).toContain('createPortal(layer, document.body)');
    });

    it('مخزن التنفيذ يسخّن سلسلة الإضبارة فوراً (includeSecondary)', () => {
        const chrome = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/ArchivePortalChrome.tsx'),
            'utf8',
        );
        expect(chrome).toMatch(
            /type === 'executions'[\s\S]{0,200}includeSecondary:\s*true/,
        );
    });

    it('ensureFirstPaint ينتظر preload البوابة + مكوّن الإضبارة', () => {
        const loader = readFileSync(
            join(root, 'src/app/runtime/executionDashboardLoader.ts'),
            'utf8',
        );
        const ensureFn = loader.slice(
            loader.indexOf('export function ensureExecutionDossierFirstPaintReady'),
            loader.indexOf('export function primeExecutionDossierSurface'),
        );
        expect(ensureFn).toContain('LazyExecutionDashboardPortal.preload()');
        expect(ensureFn).toContain('prefetchExecutionDashboardComponent');
    });
});
