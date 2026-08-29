import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('execution live inner paint honesty', () => {
    it('شارات المدين preloadable وتُسخَّن مع أول viewport بلا استيراد ثابت في الشِل', () => {
        const row = read(
            'src/app/components/lawyer/ExecutionDashboard/components/DebtorCardRowCollapsed.tsx',
        );
        const lazy = read(
            'src/app/components/lawyer/ExecutionDashboard/debtorCardRowBadgesClusterLazy.ts',
        );
        const shell = read(
            'src/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryShell.ts',
        );
        expect(lazy).toContain('createPreloadableLazyComponent');
        expect(row).toContain('PreloadableOverlayGate');
        expect(row).toContain('LazyDebtorCardRowBadgesCluster');
        expect(row).toContain('debtor-badges-paint-slot');
        expect(row).not.toContain('React.lazy');
        expect(shell).toContain("import('./debtorCardRowBadgesClusterLazy')");
        expect(shell).not.toMatch(/from\s+['"]\.\/debtorCardRowBadgesClusterLazy['"]/);
    });

    it('تبويب الطلبات يسخّن السجل مع التبويب ويُبقي الطلبات المخفية على hover', () => {
        const tab = read(
            'src/app/components/lawyer/ExecutionDashboard/components/RequestsTab.tsx',
        );
        const inner = read(
            'src/app/components/lawyer/ExecutionDashboard/requestsTabInnerLazy.ts',
        );
        const prefetch = read(
            'src/app/components/lawyer/ExecutionDashboard/executionFollowupTabPrefetch.ts',
        );
        expect(inner).toContain('LazyRequestsTabDecisionLog');
        expect(inner).toContain('prefetchRequestsTabInnerSurfaces');
        expect(tab).toContain('PreloadableOverlayGate');
        expect(tab).toContain('prefetchHiddenFollowupRequestOptions');
        expect(tab).toContain('min-h-[44px]');
        expect(tab).toContain('touch-manipulation');
        expect(tab).not.toContain('React.lazy');
        expect(prefetch).toContain('prefetchRequestsTabInnerSurfaces');
    });

    it('سجل الطرف الآخر اليدوي preloadable ويُسخَّن مع نية تبويب other_party', () => {
        const panel = read(
            'src/app/components/lawyer/ExecutionDashboard/components/OtherPartyEffectiveRequestsPanel.tsx',
        );
        const lazy = read(
            'src/app/components/lawyer/ExecutionDashboard/otherPartyManualLogBlockLazy.ts',
        );
        const prefetch = read(
            'src/app/components/lawyer/ExecutionDashboard/executionFollowupTabPrefetch.ts',
        );
        expect(lazy).toContain('LazyManualOtherPartyLogBlock');
        expect(panel).toContain('PreloadableOverlayGate');
        expect(panel).toContain('otherPartyManualLogBlockLazy');
        expect(panel).not.toContain('React.lazy');
        expect(panel).not.toMatch(/from ['"]react['"].*lazy/);
        expect(prefetch).toContain('prefetchManualOtherPartyLogBlock');
        expect(panel).not.toMatch(/from ['"][^'"]*executionDashboardLazyRegistryOverlays['"]/);
    });

    it('هيكل تبويب المحضر صامت بلا مسرح aria', () => {
        const keepAlive = read(
            'src/app/components/lawyer/ExecutionDashboard/components/FollowupTabKeepAlivePanel.tsx',
        );
        expect(keepAlive).toContain('execution-followup-tab-paint-slot');
        expect(keepAlive).not.toContain('جاري تجهيز محتوى التبويب');
        expect(keepAlive).not.toContain('aria-busy');
        expect(keepAlive).not.toContain('animate-pulse');
    });

    it('المركز المالي الحي يمر بالبوابة ويُسخَّن الدفتر مع بوابة المركز', () => {
        const focCenter = read(
            'src/app/components/lawyer/ExecutionDashboard/components/executionFinancialHub/ExecutionFinancialHubFocCenter.tsx',
        );
        const hubLazy = read(
            'src/app/components/lawyer/ExecutionDashboard/executionFinancialHubPortalLazy.tsx',
        );
        const tertiary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyTertiaryHubs.tsx',
        );
        const focFallback = read(
            'src/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShellUi.tsx',
        );
        expect(focCenter).toContain('PreloadableOverlayGate');
        expect(focCenter).not.toContain('Suspense');
        expect(hubLazy).toContain('prefetchFinancialOperationsCenter');
        expect(tertiary).toContain('PreloadableOverlayGate');
        expect(tertiary).toContain('ExecutionFinancialHubInstantFrame');
        expect(focFallback).not.toContain('جاري تجهيز المركز المالي');
    });

    it('persist الدفتر ينشر المتبقي على فهرس المخزن بلا فك إضبارة', () => {
        const store = read(
            'src/app/components/lawyer/FinancialOperationsCenter/useFocLedgerStore.ts',
        );
        const publish = read(
            'src/app/components/lawyer/FinancialOperationsCenter/publishFocLedgerRemainingToIndex.ts',
        );
        const indexHint = read('src/app/utils/syncExecutionIndexRemainingHint.ts');
        expect(store).toContain('publishFocLedgerRemainingToIndex');
        expect(publish).toContain('syncExecutionIndexRemainingHint');
        expect(publish).not.toContain('readExecutionDossierBlob');
        expect(indexHint).not.toContain('readExecutionDossierBlob');
        expect(indexHint).not.toContain('SecureStoreService');
    });

    it('مواد القانون تُقرأ من الكاش المتزامن عند أول رسم', () => {
        const panel = read('src/app/components/lawyer/execution/ExecutionLawReferencePanel.tsx');
        const cache = read('src/app/utils/executionLawRemoteCache.ts');
        expect(cache).toContain('export function peekExecutionLawArticlesCached');
        expect(cache).toContain('peekExecutionLawSeedDataCached');
        expect(panel).toContain('peekExecutionLawArticlesCached');
        expect(panel).toContain('min-h-[44px]');
        expect(panel).toContain('touch-manipulation');
        expect(panel).not.toContain('useState<ExecutionLawArticle[]>([])');
    });

    it('التبويبات الثقيلة تستخدم البوابة بعد التسخين وهدف لمس 44px للمركز', () => {
        const personal = read(
            'src/app/components/lawyer/ExecutionDashboard/components/PersonalTab.tsx',
        );
        const otherParty = read(
            'src/app/components/lawyer/ExecutionDashboard/components/OtherPartyTab.tsx',
        );
        const eviction = read(
            'src/app/components/lawyer/ExecutionDashboard/components/CoerciveTabEvictionPanel.tsx',
        );
        const coerciveReady = read(
            'src/app/components/lawyer/ExecutionDashboard/components/CoerciveTabReady.tsx',
        );
        const financial = read(
            'src/app/components/lawyer/ExecutionDashboard/components/FinancialTab.tsx',
        );
        expect(personal).toContain('PreloadableOverlayGate');
        expect(personal).not.toContain('<Suspense');
        expect(otherParty).toContain('PreloadableOverlayGate');
        expect(otherParty).not.toContain('<Suspense');
        expect(eviction).toContain('PreloadableOverlayGate');
        expect(eviction).toContain('EXEC_OVERLAY_INNER_SILENT_FALLBACK');
        expect(coerciveReady).not.toContain('EXEC_OVERLAY_LAZY_FALLBACK ??');
        expect(financial).toContain('min-h-[44px]');
        expect(financial).toContain('touch-manipulation');
        expect(financial).toContain('prefetchExecutionFinancialHubPortal');
        expect(financial).not.toMatch(/from\s+['"][^'"]*executionFinancialHubPortalLazy['"]/);
    });

    it('التبويبات الرباعية تمر بالبوابة بعد التسخين', () => {
        const quaternary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyQuaternaryPanelsReady.tsx',
        );
        expect(quaternary).toContain('PreloadableOverlayGate');
        expect(quaternary).toContain('LazyGuarantorExternalHub');
        expect(quaternary).toContain('LazyVisitationScheduleModule');
        expect(quaternary).not.toContain('<Suspense');
    });

    it('الحارس القضائي وسجل الملاحظات يمرّان بالبوابة', () => {
        const late = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyQuaternaryLatePanels.tsx',
        );
        const notes = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionNotesHistoryPane.tsx',
        );
        const seized = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionSeizedAssetsModalContainer.tsx',
        );
        expect(late).toContain('PreloadableOverlayGate');
        expect(late).toContain('LazyJudicialCustodianCardMenu');
        expect(late).not.toContain('<Suspense');
        expect(notes).toContain('PreloadableOverlayGate');
        expect(notes).not.toContain('<Suspense');
        expect(seized).toContain('PreloadableOverlayGate');
        expect(seized).not.toContain('<Suspense');
    });

    it('هياكل أول viewport صامتة بلا مسرح aria وأقسام الجسم تمر بالبوابة', () => {
        const shellUi = read(
            'src/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShellUi.tsx',
        );
        const header = read(
            'src/app/components/lawyer/ExecutionDashboard/components/PhoneBodyPrimaryHeaderSection.tsx',
        );
        const primary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyPrimarySectionsReady.tsx',
        );
        const secondary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodySecondarySections.tsx',
        );
        const tertiary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyTertiaryHubs.tsx',
        );
        expect(shellUi).not.toContain('جاري تجهيز');
        expect(header).toContain('PreloadableOverlayGate');
        expect(header).not.toContain('<Suspense');
        expect(primary).not.toContain('<Suspense');
        expect(secondary).not.toContain('<Suspense');
        expect(tertiary).not.toContain('<Suspense');
        expect(tertiary).toContain('LazyUnifiedSeizureLogHost');
    });
});
