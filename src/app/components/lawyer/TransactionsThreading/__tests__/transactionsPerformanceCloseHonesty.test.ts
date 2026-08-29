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
});
