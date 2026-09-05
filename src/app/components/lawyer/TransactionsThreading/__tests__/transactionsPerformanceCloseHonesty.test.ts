import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { OPEN_GUARD_FALLBACK_MS } from '@/app/components/lawyer/TransactionsThreading/hooks/useTransactionsOpenInteractionGuard';

const dir = join(process.cwd(), 'src/app/components/lawyer/TransactionsThreading');

function src(...parts: string[]): string {
    return readFileSync(join(dir, ...parts), 'utf8');
}

describe('transactions performance close honesty', () => {
    it('حارس الفتح يفك عند نهاية اللمسة ولا يحبس 420ms', () => {
        const guard = src('hooks/useTransactionsOpenInteractionGuard.ts');
        expect(OPEN_GUARD_FALLBACK_MS).toBeLessThanOrEqual(180);
        expect(guard).toContain("addEventListener('pointerup'");
        expect(guard).toContain("addEventListener('pointercancel'");
        expect(guard).not.toMatch(/setTimeout\([^,]+,\s*420\s*\)/);
        expect(guard).toContain('لا نحبس القائمة 420ms');
    });

    it('التفاصيل تُركَّب عند عرضها فقط — الرجوع يبقي المعرّف بلا شجرة دافئة', () => {
        const nav = src('hooks/useTransactionsHubNavigation.ts');
        const start = nav.indexOf('const backToList');
        const end = nav.indexOf('const handleDetailsEscapeSnapshot', start);
        expect(start).toBeGreaterThan(-1);
        expect(end).toBeGreaterThan(start);
        const backToList = nav.slice(start, end);
        expect(backToList).toContain("setView('list')");
        expect(backToList).not.toContain('setSelectedId(null)');
        const system = src('TransactionsThreadingSystem.tsx');
        expect(system).toContain('open && nav.view === \'details\' && nav.selectedId');
        expect(system).toContain('key={nav.selectedId}');
        expect(system).toContain('open && nav.view === \'list\'');
        expect(system).toContain('clearTransactionsListQuerySession');
        expect(system).not.toContain("className={nav.view === 'list' ? undefined : 'hidden'}");
        expect(system).not.toContain("className={nav.view === 'details' ? undefined : 'hidden'}");
        expect(system).not.toContain("hubOpen={open && nav.view === 'list'}");
        const list = src('TransactionsListScreen.tsx');
        expect(list).toContain('{hubOpen ? (');
        expect(list).toContain('<TransactionsListResults');
        expect(list).toContain('useTransactionListWindow');
        expect(src('utils/transactionListWindow.ts')).toContain('TRANSACTION_LIST_RENDER_BATCH');
        expect(src('utils/transactionListWindow.ts')).toContain('28');
        const detailsDialogs = src('transactionDetails/TransactionDetailsDialogs.tsx');
        expect(detailsDialogs).toContain('{props.completeOpen ? (');
        expect(detailsDialogs).toContain('{props.reportOpen ? (');
        const detailsCtrl = src('transactionDetails/useTransactionDetailsController.ts');
        expect(detailsCtrl).toContain('reportOpen && tx');
        expect(src('taskThread/TaskThreadDialogs.tsx')).toContain('{editOpen ? (');
        expect(src('taskThread/TaskThreadDialogs.tsx')).toContain('{deleteOpen ? (');
        expect(src('TransactionDetailsScreen.tsx')).toContain('{vm.sheetOpen && overlaysLive ? (');
        expect(src('TransactionDetailsScreen.tsx')).toContain('{vm.shareOpen && overlaysLive ? (');
        expect(src('TransactionDetailsScreen.tsx')).toContain('vm.completeOpen || vm.saveTemplateOpen || vm.templatesOpen || vm.reportOpen');
        expect(src('TaskThreadView.tsx')).toContain('dialogState.editOpen || dialogState.deleteOpen || dialogState.completeOpen');
        expect(src('utils/transactionsListQuerySession.ts')).toContain('clearTransactionsListQuerySession');
        expect(src('hooks/useTransactionsHubNavigation.ts')).toContain('isSameTransactionsDetailsEscape');
        expect(src('TransactionsListScreen.tsx')).toContain('vm.sheetOpen || vm.sheetPrimed');
        expect(src('TransactionsListScreen.tsx')).not.toContain('keepMounted={hubOpen || vm.sheetPrimed}');
        expect(src('DocumentsTabView.tsx')).toContain('{deleteOpen ? (');
        expect(src('DocumentsTabView.tsx')).toContain('{open ? (');
        expect(src('TransactionDetailsScreen.tsx')).toContain("vm.tab === 'path'");
        expect(src('TransactionDetailsScreen.tsx')).toContain("import('./ShareProcedureModal')");
        expect(src('TransactionDetailsScreen.tsx')).toContain("import('./DocumentsTabView')");
        expect(src('TransactionDetailsScreen.tsx')).toContain("import('./AddTaskBottomSheet')");
        expect(src('TransactionDetailsScreen.tsx')).toContain("import('./transactionDetails/TransactionDetailsDialogs')");
        expect(src('TransactionDetailsScreen.tsx')).toContain('TxLazyIsland');
        expect(src('TransactionDetailsScreen.tsx')).not.toContain('TabsContent');
        expect(src('TransactionDetailsScreen.tsx')).not.toContain("@/app/components/ui/tabs");
        expect(src('hooks/useTransactionsEscapeStack.ts')).toContain('closeTransactionsLiteMenuIfOpen');
        expect(system).toContain("import('./TransactionDetailsScreen')");
        expect(src('TransactionsListScreen.tsx')).toContain("import('./AddTransactionBottomSheet')");
        expect(src('TaskThreadView.tsx')).toContain("import('./taskThread/TaskThreadDialogs')");
        expect(src('transactionsFeatureLoader.ts')).toContain('prefetchTransactionsDetailsScreen');
        expect(src('transactionsFeatureLoader.ts')).toContain('prefetchDocumentsTabView');
        expect(src('transactionsFeatureLoader.ts')).toContain('prefetchAddTaskBottomSheet');
        expect(src('transactionsFeatureLoader.ts')).toContain('scheduleTransactionsIdle');
        expect(src('transactionsFeatureLoader.ts')).toContain('requestIdleCallback');
        expect(src('transactionsFeatureLoader.ts')).not.toContain('prefetchTransactionsDetailsOverlays');
        expect(src('TransactionDetailsScreen.tsx')).toContain('onPrimeDocsTab={prefetchDocumentsTabView}');
        expect(src('TransactionDetailsScreen.tsx')).toContain('onPrimeShare={prefetchShareProcedureModal}');
        expect(src('TransactionDetailsScreen.tsx')).toContain('prefetchTransactionsPathOverlays');
        expect(src('TransactionDetailsScreen.tsx')).not.toContain('prefetchTransactionsDetailsOverlays');
        expect(src('transactionDetails/TransactionDetailsHeader.tsx')).toContain('onPointerDown={() => onPrimeDocsTab?.()}');
        expect(src('transactionDetails/TransactionDetailsHeader.tsx')).toContain('onPrimeShare?.()');
        expect(system).toContain('key={nav.selectedId}');
        expect(system).toContain('scheduleTransactionsIdle');
        expect(system).toContain('isTransactionsChunkLoadError');
        expect(src('hooks/useTransactionsHubNavigation.ts')).toContain('createTransactionsDetailsReveal');
        expect(src('hooks/useTransactionsHubSessionHydration.ts')).toContain('revealDetails(resolved.selectedId)');
        expect(src('taskThread/useTaskThreadController.ts')).toContain("from './TaskThreadDialogs.types'");
        expect(src('taskThread/useTaskThreadController.ts')).not.toMatch(/from ['"]\.\/TaskThreadDialogs['"]/);
        expect(src('taskThread/useTaskThreadOverlays.ts')).not.toMatch(/from ['"]\.\/TaskThreadDialogs['"]/);
        const pathBlock = src('transactionsFeatureLoader.ts').slice(
            src('transactionsFeatureLoader.ts').indexOf('export function prefetchTransactionsPathOverlays'),
        );
        expect(pathBlock).toContain('prefetchAddTaskBottomSheet');
        expect(pathBlock).toContain('prefetchTaskThreadDialogs');
        expect(pathBlock).not.toContain('prefetchShareProcedureModal');
        expect(pathBlock).not.toContain('ShareProcedureModal');
    });

    it('القائمة والتفاصيل خفيفة: contain + content-visibility + حوار فوري + بدون transition-all', () => {
        expect(src('TransactionCard.tsx')).toContain('[content-visibility:auto]');
        expect(src('TransactionsListScreen.tsx')).toContain('[contain:content]');
        expect(src('transactionsTheme/tokens.ts')).toContain('touch-manipulation [contain:layout]');
        expect(src('transactionsTheme/tokens.ts')).not.toContain('transition-all');
        expect(src('TransactionsHubSheet.tsx')).toContain("const backdropMotion = '!transition-none'");
        expect(src('TxThreadDialogFrame.tsx')).toContain('TransactionsHubDialog');
        expect(src('taskThread/useTaskThreadController.ts')).toContain('detailsActive');
        expect(src('taskThread/useTaskThreadController.ts')).toContain('useMemo(');
        expect(src('transactionDetails/useTransactionDetailsController.ts')).toContain('window.setTimeout');
        const store = readFileSync(
            join(process.cwd(), 'src/app/modules/transactionsThreading/store.ts'),
            'utf8',
        );
        expect(store).toContain('transactionListUnchanged');
        expect(store).toContain('taskListUnchanged');
    });

    it('أول قراءة لا تسحب السحابة ولا تفك كيس التقويم القديم', () => {
        const repo = readFileSync(
            join(process.cwd(), 'src/app/modules/transactionsThreading/persistentRepository.ts'),
            'utf8',
        );
        const listBody = repo.slice(
            repo.indexOf('async listTransactions'),
            repo.indexOf('async saveTransaction'),
        );
        expect(listBody).toContain('listTransactions');
        expect(listBody).not.toContain('kickHydrate');
        expect(repo.slice(repo.indexOf('async saveTransaction'), repo.indexOf('async listTasks'))).toContain(
            'kickHydrate',
        );
        const warm = readFileSync(
            join(process.cwd(), 'src/app/services/transactions/transactionsDiskWarm.ts'),
            'utf8',
        );
        expect(warm).toContain('hami:transactionsThreading:v1:');
        expect(warm).not.toContain('hami:transactions:v1');
        expect(warm).toContain('warmKeys([');
        expect(warm).toContain('.then(() => {');
        expect(warm).toContain('.finally(() => {');
        const persist = readFileSync(
            join(process.cwd(), 'src/app/services/transactions/persistTransactionsSecure.ts'),
            'utf8',
        );
        expect(persist).toContain('skipIfUnchanged: false');
        const cloud = readFileSync(
            join(process.cwd(), 'src/app/services/cloud/lawyerTransactionsCloud.ts'),
            'utf8',
        );
        expect(cloud).toContain('mergeTransactionsThreadingStates');
        expect(cloud).toContain('emitTransactionsThreadingDump');
        const idle = readFileSync(
            join(process.cwd(), 'src/app/hooks/lawyerDashboard/transactionsIntentWarm.ts'),
            'utf8',
        );
        expect(idle).toContain('fetchTransactionsThreadingState');
        expect(idle).toContain('warmTransactionsCloudIdle(userId)');
    });

    it('القائمة لا تدّعي الفراغ قبل فك مفتاح الخيوط', () => {
        expect(src('TransactionsListScreen.tsx')).toContain('transactions-list-disk-pending');
        expect(src('TransactionsListScreen.tsx')).toContain('diskSettled');
        expect(src('hooks/useTransactionsListScreen.ts')).toContain('useTransactionsThreadingDiskSettled');
        expect(src('hooks/useTransactionsThreadingDiskSettled.ts')).toContain(
            'isTransactionsThreadingDiskUnread',
        );
        const warm = readFileSync(
            join(process.cwd(), 'src/app/services/transactions/transactionsDiskWarm.ts'),
            'utf8',
        );
        expect(warm).toContain('TRANSACTIONS_THREADING_DISK_READY_EVENT');
        expect(warm).toContain('notifyTransactionsThreadingDiskReady');
    });
});
