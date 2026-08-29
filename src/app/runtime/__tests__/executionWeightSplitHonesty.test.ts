import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('execution weight / split honesty', () => {
    it('سجل الـ overlays لا يسحب قانون التنفيذ عند تقييم الوحدة', () => {
        const overlays = read(
            'src/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryOverlays.ts',
        );
        const lawLazy = read(
            'src/app/components/lawyer/ExecutionDashboard/executionLawReferenceLazy.tsx',
        );
        expect(overlays).not.toMatch(/from\s+['"]@\/data\/executionLawsLoader['"]/);
        expect(overlays).not.toMatch(/from\s+['"]@\/app\/utils\/executionLawRemoteCache['"]/);
        expect(overlays).not.toMatch(/from\s+['"]react['"]/);
        expect(overlays).toContain('createPreloadableLazyComponent');
        expect(overlays).toContain('prefetchLawReferencePanel');
        expect(lawLazy).toContain("import('@/app/utils/executionLawRemoteCache')");
        expect(lawLazy).toContain("import('@/data/executionLawsLoader')");
        expect(lawLazy).not.toMatch(/from\s+['"]@\/data\/executionLawsLoader['"]/);
        expect(lawLazy).not.toMatch(/from\s+['"]@\/app\/utils\/executionLawRemoteCache['"]/);
    });

    it('executionLaws لا يعيد تصدير البذور أو محمل المواد', () => {
        const src = read('src/data/executionLaws.ts');
        expect(src).not.toMatch(/from\s+['"]\.\/executionLawsSeeds['"]/);
        expect(src).not.toMatch(/from\s+['"]\.\/executionLawsLoader['"]/);
        expect(src).toContain("from './executionLawSearchNormalize'");
    });

    it('أدوات تمييز المواد لا تسحب وحدة الفلاتر كقيمة', () => {
        const utils = read('src/app/utils/executionLawArticleUtils.ts');
        expect(utils).toContain("from '@/data/executionLawSearchNormalize'");
        expect(utils).not.toMatch(/import\s+(?!type)[^;]*from\s+['"]@\/data\/executionLaws['"]/);
        expect(utils).toMatch(/import\s+type\s+\{[^}]*ExecutionLawArticle/);
    });

    it('بلاط القانون لا يستورد سجل overlays بشكل ثابت', () => {
        const actionGrid = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ActionGridSection.tsx',
        );
        expect(actionGrid).not.toMatch(
            /from\s+['"][^'"]*executionDashboardLazyRegistryOverlays['"]/,
        );
        expect(actionGrid).toContain('prefetchExecutionActionGridTile');
        expect(actionGrid).toContain('prefetchLawReferencePanel');
        expect(actionGrid).not.toMatch(
            /from\s+['"]@\/app\/components\/lawyer\/ExecutionDashboard\/executionDashboardLazyRegistry['"]/,
        );
    });

    it('ملفات الإنتاج لا تستورد البرميل الموحّد — فقط lazyShell يعيد تصديره', () => {
        const dash = path.join(
            root,
            'src/app/components/lawyer/ExecutionDashboard',
        );
        const allow = new Set([
            path.join(dash, 'executionDashboardLazyRegistry.ts'),
            path.join(dash, 'executionDashboardLazyShell.tsx'),
        ]);
        const barrelFrom = /from\s+['"][^'"]*executionDashboardLazyRegistry['"]/;
        const leftover: string[] = [];
        const walk = (dir: string) => {
            for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, ent.name);
                if (ent.isDirectory()) {
                    if (ent.name === '__tests__' || ent.name === 'node_modules') continue;
                    walk(p);
                    continue;
                }
                if (!/\.(ts|tsx)$/.test(ent.name) || allow.has(p)) continue;
                const src = fs.readFileSync(p, 'utf8');
                if (barrelFrom.test(src)) leftover.push(path.relative(root, p));
            }
        };
        walk(dash);
        expect(leftover).toEqual([]);
    });

    it('رأس الإضبارة وموجات الـ mount لا تستورد overlays بشكل ثابت', () => {
        const header = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyHeader.tsx',
        );
        const stages = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardPhoneBodyMountStages.ts',
        );
        expect(header).not.toMatch(/from\s+['"][^'"]*executionDashboardLazyRegistryOverlays['"]/);
        expect(header).toContain("import('../executionDashboardLazyRegistryOverlays')");
        expect(stages).not.toMatch(/from\s+['"][^'"]*executionDashboardLazyRegistryOverlays['"]/);
        expect(stages).not.toContain("import('../executionDashboardLazyRegistryOverlays')");
        expect(stages).toContain("import('../executionDashboardOverlayPrefetch')");
    });

    it('نطاق first-paint لا يسحب overlays أو prefetch تبويبات المحضر', async () => {
        const build = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/buildExecutionDashboardChunkScopeSources.ts',
        );
        const base = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardCoreScopeSourcesBaseLazy.ts',
        );
        const shellScope = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardLazyChunkScopeShell.ts',
        );
        const fallback = read(
            'src/app/components/lawyer/ExecutionDashboard/components/executionDashboardPhoneBodyScopeFallback.ts',
        );
        const barrel = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardLazyChunkScope.ts',
        );
        const overlayBuilder = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardCoreScopeSourcesOverlayLazy.ts',
        );

        const barrelMod = await import(
            '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardLazyChunkScope'
        );
        expect(typeof barrelMod.EXECUTION_DASHBOARD_LAZY_CHUNK_SCOPE).toBe('object');
        expect(typeof barrelMod.spreadExecutionDashboardLazyChunkScope).toBe('function');
        expect(barrelMod).not.toHaveProperty('spreadExecutionDashboardLazyChunkScopeOverlays');

        expect(build).toContain('spreadExecutionDashboardLazyChunkScopeShell');
        expect(build).not.toMatch(/LazyRegistryOverlays|executionFollowupTabPrefetch/);
        expect(base).not.toMatch(/LazyRegistryOverlays|executionDashboardLazyChunkScopeOverlays/);
        expect(shellScope).not.toMatch(/executionDashboardLazyRegistryOverlays|executionFollowupTabPrefetch/);
        expect(fallback).not.toMatch(/executionDashboardLazyRegistryOverlays/);
        expect(fallback).toContain('executionDashboardLazyRegistryShell');
        expect(barrel).not.toMatch(/executionDashboardLazyRegistryOverlays/);
        expect(overlayBuilder).toContain('spreadExecutionDashboardLazyChunkScopeOverlays');
    });

    it('رأس بيانات الإضبارة يلتقط شريحة مفاتيح مكتوبة', () => {
        const header = read(
            'src/app/components/lawyer/ExecutionDashboard/components/PhoneBodyPrimaryHeaderSection.tsx',
        );
        expect(header).toContain('pickExecutionPhoneBodyPrimaryHeaderScope');
        expect(header).not.toContain('} = s as Record<string, unknown>');
    });

    it('القسم الأساسي لا يستورد سجل overlays بشكل ثابت', () => {
        const primary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyPrimarySectionsReady.tsx',
        );
        expect(primary).not.toMatch(/from\s+['"][^'"]*executionDashboardLazyRegistryOverlays['"]/);
        expect(primary).toContain('executionDashboardDossierActionsModalLazy');
        expect(primary).toContain('PreloadableOverlayGate');
    });

    it('القسم الثانوي وprefetch overlays لا يستوردان سجل overlays بشكل ثابت', () => {
        const secondary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodySecondarySections.tsx',
        );
        const overlayPrefetch = read(
            'src/app/components/lawyer/ExecutionDashboard/executionDashboardOverlayPrefetch.ts',
        );
        const finance = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/usePhoneBodySafeFinanceHandlers.ts',
        );
        const boot = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardDossierBootLifecycle.ts',
        );
        const handlerPrefetch = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreHandlerPrefetchEffects.ts',
        );
        expect(secondary).not.toMatch(/from\s+['"][^'"]*executionDashboardLazyRegistryOverlays['"]/);
        expect(secondary).toContain('ExecutionLawOverlayEntry');
        expect(overlayPrefetch).not.toMatch(
            /from\s+['"][^'"]*executionDashboardLazyRegistryOverlays['"]/,
        );
        expect(overlayPrefetch).toContain("import('./executionDashboardLazyRegistryOverlays')");
        expect(finance).not.toMatch(/from\s+['"][^'"]*executionDashboardLazyRegistryOverlays['"]/);
        expect(finance).toContain("import('../executionDashboardLazyRegistryOverlays')");
        expect(boot).not.toMatch(/executionDashboardLazyRegistryOverlays/);
        expect(handlerPrefetch).not.toMatch(
            /from\s+['"][^'"]*executionDashboardLazyRegistryOverlays['"]/,
        );
        expect(handlerPrefetch).toContain("import('../../executionDashboardLazyRegistryOverlays')");
    });

    it('قسم المدينين يلتقط شريحة مفاتيح مكتوبة', () => {
        const debtors = read(
            'src/app/components/lawyer/ExecutionDashboard/components/buildPhoneBodyDebtorsSectionProps.ts',
        );
        expect(debtors).toContain('pickExecutionPhoneBodyDebtorsScope');
        expect(debtors).not.toContain('const s = source as Record<string, unknown>');
        const debtorsScope = read(
            'src/app/components/lawyer/ExecutionDashboard/components/executionPhoneBodyDebtorsScope.ts',
        );
        const headerScope = read(
            'src/app/components/lawyer/ExecutionDashboard/components/executionPhoneBodyPrimaryHeaderScope.ts',
        );
        expect(debtorsScope).toContain('Record<ExecutionPhoneBodyDebtorsScopeKey, unknown>');
        expect(debtorsScope).not.toMatch(/\bany\b/);
        expect(headerScope).toContain('Record<ExecutionPhoneBodyPrimaryHeaderScopeKey, unknown>');
        expect(headerScope).not.toMatch(/\bany\b/);
    });

    it('الطبقة الثالثة والرابعة لا تستوردان سجل overlays بشكل ثابت', () => {
        const tertiaryHubs = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyTertiaryHubs.tsx',
        );
        const tertiarySeizure = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyTertiarySeizureSubjectModals.tsx',
        );
        const quaternary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyQuaternaryLatePanels.tsx',
        );
        expect(tertiaryHubs).not.toMatch(/from\s+['"][^'"]*executionDashboardLazyRegistryOverlays['"]/);
        expect(tertiaryHubs).toContain("from '../executionFinancialHubPortalLazy'");
        expect(tertiaryHubs).toContain('ExecutionFinancialHubInstantFrame');
        expect(tertiaryHubs).toContain('ExecutionSeizureLogInstantFrame');
        expect(tertiaryHubs).toContain('PreloadableOverlayGate');
        expect(tertiaryHubs).toContain('import type { ExecutionDashboardPhoneBodyDeferredScope }');
        expect(tertiarySeizure).not.toMatch(/from\s+['"][^'"]*executionDashboardLazyRegistryOverlays['"]/);
        expect(tertiarySeizure).toContain('LazySeizureRequestSubjectModal');
        expect(tertiarySeizure).toContain('PreloadableOverlayGate');
        expect(quaternary).not.toMatch(/from\s+['"][^'"]*executionDashboardLazyRegistryOverlays['"]/);
        expect(quaternary).toContain('executionJudicialCustodianMenuLazy');
    });
});
