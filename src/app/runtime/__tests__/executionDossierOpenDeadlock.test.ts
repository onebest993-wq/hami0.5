import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('execution dossier open — no circular first-paint await', () => {
    it('prefetchExecutionDashboardComponent لا يستدعي ensureExecutionDossierFirstPaintReady', () => {
        const portalSrc = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/dashboard/ExecutionDashboardPortal.tsx'),
            'utf8',
        );
        const start = portalSrc.indexOf('export function prefetchExecutionDashboardComponent');
        expect(start).toBeGreaterThanOrEqual(0);
        const prefetchFn = portalSrc.slice(start);
        expect(prefetchFn).not.toContain('ensureExecutionDossierFirstPaintReady');
        // التحميل عبر LazyExecutionDashboard.preload (المصنع يستدعي loadExecutionDashboardModule)
        expect(prefetchFn).toContain('LazyExecutionDashboard.preload');
        expect(portalSrc).toContain('loadExecutionDashboardModule');
    });

    it('ensureExecutionDossierFirstPaintReady لا ينتظر ensureExecutionDashboardPortalReady', () => {
        const loaderSrc = readFileSync(
            join(process.cwd(), 'src/app/runtime/executionDashboardLoader.ts'),
            'utf8',
        );
        const ensureFn = loaderSrc.slice(
            loaderSrc.indexOf('export function ensureExecutionDossierFirstPaintReady'),
            loaderSrc.indexOf('export function primeExecutionDossierSurface'),
        );
        expect(ensureFn).not.toMatch(/\.ensureExecutionDashboardPortalReady\s*\(/);
        expect(ensureFn).not.toMatch(/portalLazy\.ensureExecutionDashboardPortalReady/);
    });
});
