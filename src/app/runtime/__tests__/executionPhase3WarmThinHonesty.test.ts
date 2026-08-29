import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

function deepWarmBody(loaderSrc: string): string {
    const start = loaderSrc.indexOf('function prefetchExecutionDeepWarmChunks');
    const firstPaint = loaderSrc.indexOf('export function prefetchExecutionDashboardCore');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(firstPaint).toBeGreaterThan(start);
    return loaderSrc.slice(start, firstPaint);
}

function firstPaintBody(loaderSrc: string): string {
    const start = loaderSrc.indexOf('function prefetchExecutionFirstPaintChunks');
    const deep = loaderSrc.indexOf('function prefetchExecutionDeepWarmChunks');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(deep).toBeGreaterThan(start);
    return loaderSrc.slice(start, deep);
}

describe('execution Phase 3 warm-thin honesty', () => {
    it('deep-warm لا يُحمّل مسبقاً PCFP / FinancialHub / LawReference', () => {
        const loader = read('src/app/runtime/executionDashboardLoader.ts');
        const deep = deepWarmBody(loader);

        expect(deep).not.toContain('prefetchFollowupMemoPanels');
        expect(deep).not.toContain('prefetchLawReferencePanel');
        expect(deep).not.toContain('prefetchExecutionFinancialHubPortal');
        expect(deep).not.toContain('prefetchExecutionOverlayModals');
        expect(deep).not.toContain('prefetchExecutionFollowupModalPortal');
        expect(deep).not.toContain('prefetchExecutionModalContainers');
        expect(deep).not.toContain('prefetchExecutionDashboardShellOverlays');
        expect(deep).not.toContain('executionDashboardLazyShell');
        expect(deep).not.toContain('executionDashboardCoreScopeSourcesOverlayLazy');
        expect(loader).not.toContain('prefetchExecutionFollowupFullWarm');
        expect(loader).not.toContain('prefetchAllExecutionFollowupTabs');
    });

    it('مسار first-paint يبقى PhoneBody + base scope (+ portal)', () => {
        const loader = read('src/app/runtime/executionDashboardLoader.ts');
        const firstPaint = firstPaintBody(loader);

        expect(firstPaint).toContain('prefetchExecutionDashboardPhoneBody');
        expect(firstPaint).toContain('executionDashboardCoreScopeSourcesBaseLazy');
        expect(firstPaint).toContain('prefetchExecutionDashboardPortal');
        expect(firstPaint).toContain('preloadExecutionDashboardFirstViewportSections');
        expect(firstPaint).toContain('executionDashboardLazyRegistryShell');
        expect(firstPaint).not.toContain('prefetchFollowupMemoPanels');
        expect(firstPaint).not.toContain('prefetchLawReferencePanel');
        expect(firstPaint).not.toContain('prefetchExecutionFinancialHubPortal');
    });

    it('نية تبويب المحضر تحمّل PCFP وFinancialHub؛ القانون عند بلاط القانون', () => {
        const tabPrefetch = read(
            'src/app/components/lawyer/ExecutionDashboard/executionFollowupTabPrefetch.ts',
        );
        expect(tabPrefetch).toContain('prefetchFollowupMemoPanels');
        expect(tabPrefetch).toContain('prefetchExecutionFinancialHubPortal');
        expect(tabPrefetch).toMatch(/personal:\s*\(\)\s*=>[\s\S]*prefetchFollowupMemoPanels/);
        expect(tabPrefetch).toMatch(/financial:\s*\(\)\s*=>[\s\S]*prefetchExecutionFinancialHubPortal/);

        const overlay = read(
            'src/app/components/lawyer/ExecutionDashboard/executionDashboardOverlayPrefetch.ts',
        );
        expect(overlay).toContain('prefetchFollowupMemoPanels');
        expect(overlay).toContain("case 'finance':");
        expect(overlay).toContain('prefetchExecutionFinancialHubPortal');
        expect(overlay).toContain("case 'law':");
        expect(overlay).toContain('prefetchLawReferencePanel');

        const actionGrid = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ActionGridSection.tsx',
        );
        const lawRow = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ActionGridSectionTiles.tsx',
        );
        expect(actionGrid).toContain('prefetchLawReferencePanel');
        expect(actionGrid).toContain('<ActionGridLawReferenceRow');
        expect(actionGrid).not.toContain('onPointerEnter={() => prefetchLawReferencePanel()}');
        expect(lawRow).toContain('onPointerEnter={() => prefetchLawReferencePanel()}');
    });

    it('فتح المحضر لا يسخّن كل التبويبات عند الخمول — التبويب النشط فقط', () => {
        // Prefetch lives in tab-navigation slice (split from portal controller).
        const tabNav = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionFollowupModalTabNavigation.ts',
        );
        const portal = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionFollowupModalPortalController.ts',
        );
        expect(tabNav).toContain('prefetchExecutionFollowupTab(activePanelKey)');
        expect(tabNav).not.toContain('prefetchAllExecutionFollowupTabs');
        expect(portal).not.toContain('prefetchAllExecutionFollowupTabs');
    });
});
