import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('execution first-viewport warm honesty', () => {
    it('الشِل يسخّن الشبكة والسجل فوراً — بلا تأجيل خمول لأول viewport', () => {
        const shell = read(
            'src/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryShell.ts',
        );
        const prefetch = shell.slice(shell.indexOf('export function prefetchExecutionDashboardShell'));
        expect(shell).toContain('preloadExecutionDashboardFirstViewportSections');
        expect(shell).toContain('prefetchExecutionTimelineSurface');
        expect(prefetch).toContain('preloadExecutionDashboardFirstViewportSections');
        expect(prefetch).toContain('LazyDossierLifecyclePanel.preload');
        expect(shell).toContain("import('./debtorCardRowBadgesClusterLazy')");
        expect(shell).not.toMatch(/from\s+['"]\.\/debtorCardRowBadgesClusterLazy['"]/);
        expect(prefetch).not.toMatch(/requestIdleCallback[\s\S]{0,200}LazyActionGridSection/);
        expect(prefetch).not.toMatch(/requestIdleCallback[\s\S]{0,200}LazyTimelineSection/);
    });

    it('مسار first-paint لا يقيّم برميل overlays من أجل أقسام الجسم', () => {
        const loader = read('src/app/runtime/executionDashboardLoader.ts');
        const firstPaint = loader.slice(
            loader.indexOf('function prefetchExecutionFirstPaintChunks'),
            loader.indexOf('function prefetchExecutionDeepWarmChunks'),
        );
        const shellChunks = loader.slice(
            loader.indexOf('function prefetchExecutionShellChunks'),
            loader.indexOf('function prefetchExecutionFirstPaintChunks'),
        );
        expect(firstPaint).toContain('executionDashboardLazyRegistryShell');
        expect(firstPaint).not.toContain('executionDashboardLazyShell');
        expect(shellChunks).toContain('executionDashboardLazyRegistryShell');
        expect(shellChunks).not.toContain('executionDashboardLazyShell');
    });

    it('إقلاع الشِل لا يسخّن محضر المتابعة عند مجرد الفتح', () => {
        const boot = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardDossierBootLifecycle.ts',
        );
        const gates = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardLazyChunkGates.ts',
        );
        expect(boot).not.toContain('prefetchExecutionFollowupOverlay');
        expect(gates).toContain('if (!modals.showUnifiedExecutionModal) return');
        expect(gates).toContain('prefetchExecutionFollowupOverlay');
    });

    it('أول viewport الحي يعزل الأقسام بهياكل صامتة وزر خروج', () => {
        const status = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardStatusViews.tsx',
        );
        const resolved = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/ExecutionDashboardViewResolved.tsx',
        );
        const portal = read('src/app/components/lawyer/dashboard/ExecutionDashboardPortal.tsx');
        const header = read(
            'src/app/components/lawyer/ExecutionDashboard/components/PhoneBodyPrimaryHeaderSection.tsx',
        );
        const primary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyPrimarySectionsReady.tsx',
        );
        const secondary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodySecondarySections.tsx',
        );
        const lazyUi = read(
            'src/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShellUi.tsx',
        );
        const clusters = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardChunkHostClusters.tsx',
        );

        expect(status).toContain('ExecutionDossierInstantFrame');
        expect(status).not.toContain('animate-pulse');
        expect(resolved).toContain('onExitToHome={exitToHome}');
        expect(portal).toContain('onExitToHome={onExitToHome}');
        expect(header).toContain('EXEC_HEADER_LAZY_FALLBACK');
        expect(header).toContain('PreloadableOverlayGate');
        expect(header).not.toContain('<Suspense fallback={EXEC_HEADER_LAZY_FALLBACK}>');
        expect(primary).toContain('EXEC_CREDITORS_LAZY_FALLBACK');
        expect(primary).toContain('EXEC_DEBTORS_LAZY_FALLBACK');
        expect(primary).toContain('PreloadableOverlayGate');
        expect(secondary).toContain('EXEC_ACTION_GRID_LAZY_FALLBACK');
        expect(secondary).toContain('EXEC_TIMELINE_LAZY_FALLBACK');
        expect(secondary).toContain('PreloadableOverlayGate');
        expect(secondary).toContain('ExecutionLawOverlayEntry');
        expect(secondary).not.toContain('LazyLawReferencePanel');
        expect(lazyUi).not.toContain('animate-pulse');
        expect(lazyUi).not.toContain('جاري تجهيز');
        expect(clusters).toContain('PhoneBodyLoadingShell file={paintFile}');
        expect(clusters).toContain('onExitToHome={onExitToHome}');
    });

    it('محضر المتابعة مستقل عن برميل overlays وله هيكل فوري', () => {
        const clusters = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardChunkHostClusters.tsx',
        );
        const overlays = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardShellOverlays.tsx',
        );
        const prefetch = read(
            'src/app/components/lawyer/ExecutionDashboard/executionDashboardOverlayPrefetch.ts',
        );
        const flags = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionShellOverlayModalFlags.ts',
        );
        const keepAlive = read(
            'src/app/components/lawyer/ExecutionDashboard/components/FollowupTabKeepAlivePanel.tsx',
        );
        const instant = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionFollowupInstantFrame.tsx',
        );

        expect(clusters).toContain('ExecutionFollowupOverlayEntry');
        expect(clusters).toContain('ExecutionShellOverlaysEntry');
        expect(clusters).not.toContain('LazyExecutionDashboardShellOverlays');
        expect(clusters).not.toContain('جاري تحميل محضر المتابعة');
        expect(overlays).not.toContain('ExecutionFollowupModalHost');
        const followupFnStart = prefetch.indexOf('export function prefetchExecutionFollowupOverlay');
        const followupFnEnd = prefetch.indexOf(
            'export function prefetchExecutionFinanceOverlay',
            followupFnStart,
        );
        expect(prefetch).toContain('prefetchExecutionFollowupModalHost');
        expect(prefetch.slice(followupFnStart, followupFnEnd)).not.toContain(
            'prefetchExecutionDashboardShellOverlays',
        );
        expect(flags).toContain('isExecutionOtherShellOverlayUrgent');
        expect(keepAlive).not.toContain('animate-pulse');
        expect(keepAlive).not.toContain('جاري تجهيز محتوى التبويب');
        expect(keepAlive).toContain('execution-followup-tab-paint-slot');
        expect(instant).not.toContain('animate-pulse');
        expect(instant).toContain('min-h-[44px]');
        expect(instant).toContain('execution-followup-modal-close');
        expect(instant).not.toContain("from '@/app/components/ui/icons/");
    });

    it('نوافذ المركز المالي والقانون والملاحظات لها هيكل فوري عند النقرة الباردة', () => {
        const tertiary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyTertiaryHubs.tsx',
        );
        const secondary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodySecondarySections.tsx',
        );
        const notes = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardNotesOverlays.tsx',
        );
        const docs = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardHeavyModalsEarlyDocumentsDecisions.tsx',
        );
        const law = read(
            'src/app/components/lawyer/ExecutionDashboard/components/LawReferencePanel.tsx',
        );
        const requests = read(
            'src/app/components/lawyer/ExecutionDashboard/components/RequestsTab.tsx',
        );
        const history = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionNotesHistoryPane.tsx',
        );
        const decisions = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDecisionsModalContainer.tsx',
        );

        const lawInner = read(
            'src/app/components/lawyer/execution/ExecutionLawReferencePanel.tsx',
        );
        expect(tertiary).toContain('ExecutionFinancialHubInstantFrame');
        expect(tertiary).toContain('ExecutionSeizureLogInstantFrame');
        expect(tertiary).not.toContain('EXEC_OVERLAY_LAZY_FALLBACK');
        expect(secondary).toContain('ExecutionLawOverlayEntry');
        expect(secondary).toContain('executionTimelineSurfaceLazy');
        expect(notes).toContain('ExecutionNotesInstantFrame');
        expect(notes).not.toContain('EXEC_OVERLAY_LAZY_FALLBACK');
        expect(docs).toContain('ExecutionDocumentsInstantFrame');
        expect(docs).toContain('ExecutionDecisionsInstantFrame');
        expect(law).not.toContain('جاري تجهيز المرجع القانوني');
        expect(law).not.toContain('requestAnimationFrame');
        expect(lawInner).toContain('EXEC_OVERLAY_INNER_SILENT_FALLBACK');
        expect(lawInner).toContain('peekExecutionLawArticlesCached');
        expect(lawInner).toContain('min-h-[44px]');
        expect(lawInner).toContain('touch-manipulation');
        expect(lawInner).not.toContain('جاري تحميل مواد القانون');
        expect(lawInner).not.toContain('جاري تحميل بقية المواد');
        expect(requests).not.toContain('جاري تحميل الطلبات المخفية');
        expect(requests).not.toContain('جاري تحميل سجل الطلبات');
        expect(requests).toContain('PreloadableOverlayGate');
        expect(requests).toContain('requestsTabInnerLazy');
        expect(requests).not.toContain('React.lazy');
        expect(history).not.toContain('animate-pulse');
        expect(history).toContain('executionNotesInnerLazy');
        expect(history).toContain('PreloadableOverlayGate');
        expect(history).not.toContain('<Suspense');
        expect(decisions).not.toContain('جاري التحميل…');
    });

    it('النوافذ المتبقية ترسم هيكلاً فورياً والجسم الداخلي صامت', () => {
        const ops = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardHeavyModalsEarlyOpsStrip.tsx',
        );
        const late = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardHeavyModalsLateCluster.tsx',
        );
        const edit = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardEditOverlays.tsx',
        );
        const party = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardHeavyModalsEarlyPartyOverlays.tsx',
        );
        const primary = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyPrimarySectionsReady.tsx',
        );
        const eviction = read(
            'src/app/components/lawyer/ExecutionDashboard/components/EvictionFollowupModalsChunk.tsx',
        );
        const coercive = read(
            'src/app/components/lawyer/ExecutionDashboard/components/CoerciveTabReady.tsx',
        );
        const timeline = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionFullTimelineModalContainer.tsx',
        );
        const seized = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionSeizedAssetsModalContainer.tsx',
        );
        const flags = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionShellOverlayModalFlags.ts',
        );
        const entry = read(
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionShellOverlaysEntry.tsx',
        );
        const visitation = read(
            'src/app/components/lawyer/ExecutionDashboard/components/visitationSchedule/VisitationWorkspaceBody.tsx',
        );

        expect(ops).toContain('ExecutionNamedOverlayInstantFrame');
        expect(ops).toContain('EXEC_OVERLAY_INNER_SILENT_FALLBACK');
        expect(late).toContain('ExecutionNamedOverlayInstantFrame');
        expect(late).toContain('EXEC_OVERLAY_INNER_SILENT_FALLBACK');
        expect(edit).toContain('ExecutionNamedOverlayInstantFrame');
        expect(party).toContain('ExecutionNamedOverlayInstantFrame');
        expect(primary).toContain('ExecutionNamedOverlayInstantFrame');
        expect(primary).toContain('PreloadableOverlayGate');
        expect(primary).toContain('executionDashboardDossierActionsModalLazy');
        expect(eviction).toContain('ExecutionNamedOverlayInstantFrame');
        expect(eviction).toContain('PreloadableOverlayGate');
        expect(eviction).not.toContain('fallback={null}');
        expect(coercive).not.toContain('جاري تجهيز الإجراءات الجبرية');
        expect(timeline).toContain('EXEC_OVERLAY_INNER_SILENT_FALLBACK');
        expect(seized).toContain('EXEC_OVERLAY_INNER_SILENT_FALLBACK');
        expect(flags).toContain('showEvictionExpenseModal');
        expect(flags).toContain('showStayOfExecutionModal');
        expect(entry).toContain('ExecutionShellOverlayInstantPaint');
        expect(visitation).not.toContain('جاري توليد المواعيد');
    });
});
