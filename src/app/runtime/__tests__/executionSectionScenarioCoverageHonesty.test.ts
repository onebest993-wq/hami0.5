import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('execution section scenario coverage honesty', () => {
    it('بلاطة الرئيسية تفتح المخزن بجلسة محلية وprefetch وscroll-safe', () => {
        const hero = read('src/app/components/lawyer/dashboard/commandHub/ExecutionHero.tsx');
        expect(hero).toContain("id: 'execution'");
        expect(hero).toContain('tileId: \'hubExecution\'');
        expect(hero).toContain('فتح مخزن الإضابير التنفيذية');
        const tile = read('src/app/components/lawyer/dashboard/commandHub/RouteTile.tsx');
        expect(tile).toContain('hub-archive-${card.id}');
        expect(tile).toContain('useScrollSafePress');
        expect(tile).toContain('HubTileFace');
        const prefetch = read('src/app/components/lawyer/dashboard/commandHub/commandHubArchivePrefetch.ts');
        expect(prefetch).toContain("archiveId === 'execution'");
        expect(prefetch).toContain('dispatchExecutionArchivePrimeHost');
        const home = read('src/app/components/lawyer/dashboard/useHomeTabContentModel.ts');
        expect(home).toContain('openHubArchiveFromHomeTile');
        const open = read('src/app/services/hub/hubHomeOpen.ts');
        expect(open).toContain('hasLocalAppSession');
        expect(open).toContain("execution: 'execution'");
        const bundle = read('src/app/hooks/lawyerDashboard/buildLawyerDashboardTabBundle.ts');
        expect(bundle).toContain("if (id === 'execution')");
        expect(bundle).toContain('hasLocalAppSession(shellUid)');
        expect(bundle).toContain('armExecutionArchiveHost');
        expect(bundle).toContain('prefetchExecutionArchiveOpen');
    });

    it('بوابة E2E الرسمية تغطي الفتح والإضبارة والحفظ والتبويب والملاحظات', () => {
        const manifest = read('scripts/execution-gate-manifest.mjs');
        for (const spec of [
            'e2e/executionDashboard.spec.ts',
            'e2e/execution-critical-paths.spec.ts',
            'e2e/execution-storage-persist.spec.ts',
            'e2e/execution-console-hygiene.spec.ts',
            'e2e/execution-other-party-tab.spec.ts',
            'e2e/execution-notes-persist.spec.ts',
            'e2e/execution-followup-tabs.spec.ts',
            'e2e/decisions-storage-persist.spec.ts',
        ]) {
            expect(manifest).toContain(spec);
            expect(existsSync(join(root, spec))).toBe(true);
        }
        const boot = read('e2e/helpers/executionE2EBoot.ts');
        expect(boot).toContain("clickHubArchiveTileNative(page, 'hub-archive-execution')");
        expect(boot).toContain('execution-archive-shell');
        expect(boot).toContain("not.toHaveAttribute('inert')");
        expect(boot).toContain("toHaveAttribute('data-open', 'true')");
        expect(boot).toContain('execution-followup-memo');
        const skippedLegacy = read('e2e/execution-flow.spec.ts');
        expect(skippedLegacy).toContain('test.describe.skip');
        const critical = read('e2e/execution-critical-paths.spec.ts');
        expect(critical).not.toContain("mode: 'serial'");
        expect(critical).toContain("test('16 — archive FAB opens creation shell and closes'");
        expect(critical).toContain("getByTestId('execution-creation-close')");
        const createBody = read(
            'src/app/components/lawyer/ExecutionCreationView/components/ExecutionCreationFormBody.tsx',
        );
        expect(createBody).toContain('data-testid="execution-creation-title"');
        expect(createBody).toContain('data-testid="execution-creation-close"');
        const createBoot = read('src/app/components/lawyer/dashboard/ExecutionCreationBootShell.tsx');
        expect(createBoot).toContain('data-testid="execution-creation-close"');
        expect(createBoot).not.toContain('جاري تجهيز');
        expect(createBoot).toContain('execution-creation-boot-slots');
        const heavyLayer = read('src/app/hooks/lawyerDashboard/LawyerDashboardWorkspaceHeavyLayer.tsx');
        expect(heavyLayer).toContain('prev.isExecutionModalOpen === heavy.isExecutionModalOpen');
        expect(heavyLayer).toContain('heavy.isExecutionModalOpen');
        const createOverlay = read(
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry.tsx',
        );
        expect(createOverlay).toContain('openExecutionCreationWithContract');
        expect(createOverlay).not.toMatch(
            /import\('@\/app\/runtime\/executionOpenContract'\)\.then/,
        );
        const createLoader = read('src/app/runtime/executionCreationLoader.ts');
        expect(createLoader).toContain('LawyerDashboardExecutionCreateOverlayEntry');
        const overlayHosts = read(
            'src/app/components/lawyer/dashboard/LawyerDashboardMainViewOverlayHosts.tsx',
        );
        expect(overlayHosts).toContain('executionLive || executionCreateLive');
        expect(overlayHosts).toContain('closeExecutionCreate');
        expect(overlayHosts).toContain('executionCreateCloseGuard');
        expect(overlayHosts).toContain(
            'contentInteractive={!executionCreateLive && !executionCreateCloseGuard}',
        );
        expect(overlayHosts).toContain('execution-create-close-pointer-shield');
        const createEntry = read(
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionCreateOverlayEntry.tsx',
        );
        expect(createEntry).toContain('onCloseCreate');
        expect(createEntry).toContain('EXECUTION_CREATE_UNMOUNT_DELAY_MS');
        const mainChrome = read(
            'src/app/components/lawyer/dashboard/useLawyerDashboardMainViewChrome.ts',
        );
        expect(mainChrome).toContain('executionCreateCloseGuard ||');
        expect(mainChrome).toContain('createCloseGuardUntilRef');
        expect(mainChrome).toContain("setArchiveType('execution')");
        expect(mainChrome).toContain('setIsExecutionModalOpen(false)');
        const persistMerge = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardPersistExecutionMerge.ts',
        );
        expect(persistMerge).toContain('patchTouchesCreditorAgentOnlyKeys(patch)');
        expect(persistMerge).toContain('isDurableCoercivePersistPatch(patch)');
        const chrome = read('src/app/components/lawyer/dashboard/ExecutionArchiveInstantChrome.tsx');
        expect(chrome).toContain('inertProps(!open)');
        expect(chrome).toContain('contentInteractive');
        expect(chrome).toContain('chromeInteractive');
        expect(chrome).toContain("pointerEvents: open ? 'auto' : 'none'");
        expect(chrome).toContain('isExecutionCreateCloseGuardArmed');
        expect(chrome).toContain('data-testid="execution-archive-close"');
        expect(chrome).toContain('إغلاق مخزن الأضابير التنفيذية');
        expect(mainChrome).toContain('!executionCreateCloseGuard && !isExecutionCreateCloseGuardArmed()');
        expect(chrome).toContain('ExecutionArchiveHostOpenContext.Provider');
        expect(createEntry).toContain('armExecutionCreateCloseGuard');
        expect(createEntry).toContain('EXECUTION_CREATE_CLOSE_GUARD_MS');
        expect(createEntry).not.toMatch(/setTimeout\(\(\) => \{\s*document\.documentElement\.removeAttribute/);
        expect(overlayHosts).toContain('onCloseArchive={closeExecutionArchive}');
        const createGuard = read('src/app/components/lawyer/dashboard/executionCreateCloseGuard.ts');
        expect(createGuard).toContain("setAttribute('data-hami-execution-create-guard', '1')");
        expect(createGuard).toContain('EXECUTION_CREATE_CLOSE_GUARD_MS = 2_000');
        expect(createGuard).toContain('EXECUTION_CREATE_UNMOUNT_DELAY_MS = 64');
        expect(mainChrome).toContain('EXECUTION_CREATE_CLOSE_GUARD_MS');
        const dismissOverlays = read('e2e/helpers/notificationFixtures.ts');
        expect(dismissOverlays).toContain("testId === 'execution-creation-close'");
        expect(dismissOverlays).toContain("testId === 'execution-archive-close'");
        expect(dismissOverlays).toContain('[data-testid="execution-archive-shell"]');
        expect(chrome).toContain("removeAttribute('inert')");
        expect(chrome).toContain('data-hami-overlay-safe={open ? \'1\' : undefined}');
        expect(chrome).toContain('blurFocusWithin');
        expect(chrome).not.toContain('useBodyScrollLock');
        expect(chrome).not.toContain("event.key !== 'Escape'");
        const bootstrap = read('src/app/utils/executionFilesBootstrap.ts');
        expect(bootstrap).not.toContain('cachedUnscoped');
        expect(bootstrap).toContain('loadExecutionFilesRaw');
        const fileActions = read('src/app/stores/executionDashboardStore/fileActions.ts');
        expect(fileActions).toContain('syncExecutionFilesIndexCache');
        expect(fileActions).not.toContain('EXECUTION_FILES_STORAGE_KEY');
        const subFiles = read('src/app/stores/executionDashboardStore/subFileActions.ts');
        expect(subFiles).toContain('syncExecutionFilesIndexCache');
        expect(subFiles).not.toContain('EXECUTION_FILES_STORAGE_KEY');
        const unification = read('src/app/stores/executionDashboardStore/unificationActions.ts');
        expect(unification).toContain('syncExecutionFilesIndexCache');
        expect(unification).not.toContain('EXECUTION_FILES_STORAGE_KEY');
        const linked = read(
            'src/app/components/lawyer/ExecutionDashboard/components/LinkedDossierTimelineModal.tsx',
        );
        expect(linked).toContain('loadExecutionFilesRaw');
        expect(linked).not.toContain('EXECUTION_FILES_STORAGE_KEY');
        const sanitizer = read(
            'src/app/components/lawyer/ExecutionDashboard/helpers/executionPersistPatchSanitizer.ts',
        );
        expect(sanitizer).toContain('stripUnsafeNoteHtml');
        expect(sanitizer).toContain('sanitizeSeizureAndLedgerCollections');
        const commitNote = read(
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/commitDossierNoteAction.ts',
        );
        expect(commitNote).toContain('sanitizeRichNoteHtml');
        const persist = read('src/app/services/securePersistStorage.ts');
        expect(persist).toContain("typeof SecureStoreService.getItem !== 'function'");
        const portal = read('src/app/components/lawyer/dashboard/ExecutionDashboardPortal.tsx');
        expect(portal).toContain('useBodyScrollLock(open)');
        expect(portal).toContain('data-hami-overlay-safe="1"');
        expect(portal).not.toContain('role="dialog"');
        const cloudEngine = read('src/app/services/cloudSyncEngine.ts');
        expect(cloudEngine).toContain('flushPending(localKey)');
        expect(cloudEngine).toContain('saveExecutionFilesRawImmediate(mergedItems)');
        const createFiles = read('src/app/hooks/useLawyerExecutionFiles.ts');
        expect(createFiles).toContain('executionFilesRef.current.filter');
        expect(createFiles).toContain('saveExecutionFilesRawDurable(nextList)');
        const seizureBadges = read(
            'src/app/components/lawyer/execution/DebtorSeizureCategoryBadges.tsx',
        );
        expect(seizureBadges).toContain('normalizeLine');
        expect(seizureBadges).toContain("from './debtorSeizureCategoryBadgeHelpers'");
        const seizureProbe = read('.cursor/probe-seizure-workflow.mjs');
        expect(seizureProbe).toContain("c.name === 'مسار الحجز'");
        expect(seizureProbe).toContain('probe-execution-storage-seed');
        const salaryThirdPartyFooter = read(
            'src/app/components/lawyer/ExecutionDashboard/components/unifiedSeizureLogEntryFooter/renderSalaryThirdPartySeizureLogFooterBranches.tsx',
        );
        expect(salaryThirdPartyFooter).toContain('requireDecisionsStorageExecutionId');
        expect(salaryThirdPartyFooter).toContain('resolveThirdPartySeizureForLog');
        const secureStore = read('src/app/services/SecureStoreService.ts');
        expect(secureStore).toMatch(/WEB_MIGRATION_PREFIXES[\s\S]*'executionFiles'/);
        const criticalPaths = read('e2e/execution-critical-paths.spec.ts');
        expect(criticalPaths).toContain("getByTestId('executions-add-new')).toBeVisible({ timeout: 20_000 })");
        expect(criticalPaths).toContain("clickNativeElement(page.getByTestId('executions-add-new'))");
        expect(criticalPaths).toContain("clickNativeElement(page.getByTestId('execution-creation-close'))");
        expect(criticalPaths).toContain(
            "getByTestId('execution-archive-shell').getByTestId('executions-view-archived')",
        );
        expect(criticalPaths).toContain('await clickNativeElement(archivedTab);');
        expect(criticalPaths).toContain('await clickNativeElement(filtersToggle);');
        expect(criticalPaths).toContain("toHaveAttribute('data-open', 'true'");
        expect(criticalPaths).toContain("getByTestId('execution-creation-title')).toBeHidden({ timeout: 8_000 })");
        const dashboardSpec = read('e2e/executionDashboard.spec.ts');
        expect(dashboardSpec).toContain('clickNativeElement');
        expect(dashboardSpec).toContain("getByTestId('execution-archive-shell')");
        expect(dashboardSpec).toContain("getByTestId('executions-view-archived')");
        expect(dashboardSpec).toContain('await clickNativeElement(archivedTab);');
        expect(dashboardSpec).toContain('await clickNativeElement(filtersToggle);');
        expect(criticalPaths).toContain("test('14 — execution card archive opens confirm dialog'");
        expect(criticalPaths).toContain('openExecutionArchiveConfirmFromCard');
        expect(criticalPaths).toContain('openExecutionTrashConfirmFromCard');
        const confirmHelper = read('e2e/helpers/executionE2EFixtures.ts');
        expect(confirmHelper).toContain('openExecutionArchiveConfirmFromCard');
        expect(confirmHelper).toContain('.toPass(');
        expect(confirmHelper).toContain("getAttribute('data-open')");
        const trashDialogs = read(
            'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveTrashDialogs.tsx',
        );
        expect(trashDialogs).toContain('createPortal(');
        expect(trashDialogs).toContain('document.body');
        expect(trashDialogs).not.toMatch(/if \(embedded\)/);
        expect(trashDialogs).toContain('ExecutionArchiveHostOpenContext');
        expect(trashDialogs).toContain('style={{ zIndex: 10050 }}');
        expect(trashDialogs).toContain('execution-trash-confirm-cancel');
        expect(trashDialogs).toContain('execution-archive-confirm-cancel');
        const fileGrid = read(
            'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveFileGrid.tsx',
        );
        expect(fileGrid).not.toMatch(/flushSync\(\(\) =>\s*setTrashConfirmTarget/);
        expect(fileGrid).not.toMatch(/flushSync\(\(\) =>\s*setArchiveConfirmTarget/);
        const confirmDialog = read(
            'src/app/components/lawyer/ArchivePortal/components/ArchivePortalConfirmDialog.tsx',
        );
        expect(confirmDialog).toContain('registerNativeBackHandler');
        expect(confirmDialog).toContain("addEventListener('keydown', onKeyDown, true)");
        expect(confirmDialog).toContain('ignoreBackdropUntilRef');
        const previewModal = read(
            'src/app/components/lawyer/ArchivePortal/components/ArchivePortalExecutionPreviewModal.tsx',
        );
        expect(previewModal).toContain('registerNativeBackHandler');
        expect(previewModal).toContain("addEventListener('keydown', onKeyDown, true)");
        expect(previewModal).toContain('ignoreBackdropUntilRef');
        const overlayEscape = read(
            'src/app/hooks/lawyerDashboard/useLawyerExecutionOverlayEscape.ts',
        );
        expect(overlayEscape).toContain('hasExecutionArchiveTrashDialogsLayer');
        expect(overlayEscape).toContain('hasExecutionArchivePreviewLayer');
        const chromeEscape = read('src/app/components/lawyer/ArchivePortal/ExecutionArchiveChrome.tsx');
        expect(chromeEscape).toContain('hasExecutionArchiveTrashDialogsLayer');
        expect(chromeEscape).toContain('hasExecutionArchivePreviewLayer');
        expect(chromeEscape).not.toContain('embedded={embedded}');
        const focMain = read('src/app/components/lawyer/FinancialOperationsCenter.tsx');
        expect(focMain).toContain('onGuarantorRequest={onGuarantorRequest}');
        expect(focMain).toContain('onEvictionLedgerActivated,');
        expect(focMain).not.toMatch(/onGuarantorRequest: _onGuarantorRequest/);
        expect(focMain).not.toMatch(/onEvictionLedgerActivated: _onEvictionLedgerActivated/);
        const focBody = read(
            'src/app/components/lawyer/FinancialOperationsCenter/components/FocCreditorExpandedBody.tsx',
        );
        expect(focBody).toContain('foc-amount-guarantor-request');
        expect(focBody).toContain('طلب كفيل ضامن للمبلغ');
        const focCollect = read(
            'src/app/components/lawyer/FinancialOperationsCenter/useFocCollectionActions.ts',
        );
        expect(focCollect).toContain('shouldNotifyParentEvictionLedgerActivated');
        const evictionWorkflow = read('src/app/utils/executorApprovalWorkflow.ts');
        expect(evictionWorkflow).not.toContain('TODO: PATCH /api/cases');
        expect(evictionWorkflow).toContain('ExecutorWorkflowPortalModals');
    });
});
