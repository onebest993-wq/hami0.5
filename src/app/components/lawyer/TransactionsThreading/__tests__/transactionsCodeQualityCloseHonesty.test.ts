import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(...parts: string[]): string {
    return readFileSync(join(root, ...parts), 'utf8');
}

function lineCount(rel: string): number {
    return src(rel).split(/\n/).length;
}

describe('transactions code quality close honesty', () => {
    it('store: runtime منفصل بلا دورة، ومهام تفاؤلية موحّدة', () => {
        const runtimePath = 'src/app/modules/transactionsThreading/transactionsThreadingStoreRuntime.ts';
        expect(existsSync(join(root, runtimePath))).toBe(true);
        const runtime = src(runtimePath);
        expect(runtime).not.toContain("from './store'");
        expect(runtime).not.toContain('zustand');
        const store = src('src/app/modules/transactionsThreading/store.ts');
        expect(store).toContain("from './transactionsThreadingStoreRuntime'");
        expect(store).toContain('applyOptimisticTask');
        expect(store).toContain('commitTransaction');
        expect(store).not.toMatch(/function bindTransactionsUser/);
        expect(store).toContain('transactionListUnchanged');
        expect(store).toContain('taskListUnchanged');
        expect(lineCount('src/app/modules/transactionsThreading/store.ts')).toBeLessThan(320);
        expect(lineCount(runtimePath)).toBeLessThan(150);
    });

    it('تفاصيل/مركز/مشاركة: hooks وملف تنسيق مستقلان', () => {
        const templatesPath =
            'src/app/components/lawyer/TransactionsThreading/transactionDetails/useTransactionDetailsTemplates.ts';
        const hydrationPath =
            'src/app/components/lawyer/TransactionsThreading/hooks/useTransactionsHubSessionHydration.ts';
        const formatPath = 'src/app/services/transactions/formatProcedureShareBody.ts';
        expect(existsSync(join(root, templatesPath))).toBe(true);
        expect(existsSync(join(root, hydrationPath))).toBe(true);
        expect(existsSync(join(root, formatPath))).toBe(true);
        const details = src(
            'src/app/components/lawyer/TransactionsThreading/transactionDetails/useTransactionDetailsController.ts',
        );
        expect(details).toContain("from './useTransactionDetailsTemplates'");
        expect(details).not.toContain('const doSaveTemplate');
        const hub = src(
            'src/app/components/lawyer/TransactionsThreading/hooks/useTransactionsHubNavigation.ts',
        );
        expect(hub).toContain("from './useTransactionsHubSessionHydration'");
        const sanitize = src('src/app/services/transactions/sanitizeTransactionForSharing.ts');
        expect(sanitize).toContain("from '@/app/services/transactions/formatProcedureShareBody'");
        expect(sanitize).toContain('export { formatProcedureCardsBody }');
        expect(sanitize).not.toMatch(/export\s*\{[^}]*scrubPii/);
        expect(lineCount(
            'src/app/components/lawyer/TransactionsThreading/transactionDetails/useTransactionDetailsController.ts',
        )).toBeLessThan(250);
        expect(lineCount(
            'src/app/components/lawyer/TransactionsThreading/hooks/useTransactionsHubNavigation.ts',
        )).toBeLessThan(190);
        expect(lineCount('src/app/services/transactions/sanitizeTransactionForSharing.ts')).toBeLessThan(220);
    });

    it('شجرة المهام وتفاؤل المتجر وحوارات المسار طبقات مستقلة', () => {
        expect(existsSync(join(root, 'src/app/modules/transactionsThreading/taskTree.ts'))).toBe(true);
        const service = src('src/app/modules/transactionsThreading/service.ts');
        expect(service).toContain("export { buildTaskTree } from './taskTree'");
        expect(service).not.toContain('export function buildTaskTree');
        const optimisticPath = 'src/app/modules/transactionsThreading/transactionsThreadingStoreOptimistic.ts';
        expect(existsSync(join(root, optimisticPath))).toBe(true);
        const optimistic = src(optimisticPath);
        expect(optimistic).toContain('createApplyOptimisticTask');
        expect(optimistic).toContain('patchTaskMap: (updater:');
        const store = src('src/app/modules/transactionsThreading/store.ts');
        expect(store).toContain('createApplyOptimisticTask');
        expect(store).toContain('updater(state.tasksByTransactionId)');
        const overlaysPath =
            'src/app/components/lawyer/TransactionsThreading/taskThread/useTaskThreadOverlays.ts';
        expect(existsSync(join(root, overlaysPath))).toBe(true);
        const overlays = src(overlaysPath);
        expect(overlays).not.toContain('buildTaskTree');
        expect(overlays).toContain('beginComplete');
        const taskCtrl = src(
            'src/app/components/lawyer/TransactionsThreading/taskThread/useTaskThreadController.ts',
        );
        expect(taskCtrl).toContain("from './useTaskThreadOverlays'");
        expect(taskCtrl).toContain('taskCompleteOpen');
        expect(taskCtrl).toContain('detailsActive');
        expect(taskCtrl).toContain('useMemo(');
        expect(lineCount('src/app/modules/transactionsThreading/service.ts')).toBeLessThan(210);
        expect(lineCount(overlaysPath)).toBeLessThan(150);
        expect(
            lineCount(
                'src/app/components/lawyer/TransactionsThreading/taskThread/useTaskThreadController.ts',
            ),
        ).toBeLessThan(220);
        expect(existsSync(join(root, 'src/app/modules/transactionsThreading/index.ts'))).toBe(false);
    });
});
