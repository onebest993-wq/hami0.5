import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(process.cwd(), 'src/app/components/lawyer/TransactionsThreading');
const root = process.cwd();

function src(...parts: string[]): string {
    return readFileSync(join(dir, ...parts), 'utf8');
}

describe('transactions cleanliness close honesty', () => {
    it('لا برميل ميت ولا طبقة Radix ولا prop instant ولا حقل حوار غير مستعمل', () => {
        expect(existsSync(join(root, 'src/app/modules/transactionsThreading/index.ts'))).toBe(false);
        expect(existsSync(join(dir, 'index.ts'))).toBe(false);
        expect(existsSync(join(dir, 'TransactionsThreadDialogContent.tsx'))).toBe(false);
        const frame = src('TxThreadDialogFrame.tsx');
        expect(frame).toContain('TransactionsHubDialog');
        expect(frame).not.toContain('instant');
        expect(frame).not.toContain('@radix-ui/react-dialog');
        expect(src('transactionDetails/TransactionDetailsDialogs.tsx')).not.toContain('instant=');
        expect(src('transactionDetails/CompleteTransactionDialog.tsx')).not.toContain('instant');
        expect(src('DocumentsDeleteDialog.tsx')).not.toContain('instant');
        const dialogs = src('taskThread/TaskThreadDialogs.tsx');
        expect(dialogs).not.toContain('@radix-ui/react-dialog');
        expect(dialogs).toContain('function TaskThreadDialogShell');
        expect(dialogs).not.toContain('editTarget');
        const service = readFileSync(join(root, 'src/app/modules/transactionsThreading/service.ts'), 'utf8');
        expect(service).not.toMatch(/async createTransaction\s*\(/);
        const store = readFileSync(join(root, 'src/app/modules/transactionsThreading/store.ts'), 'utf8');
        expect(store).toContain('const commitTransaction');
        const sharing = readFileSync(
            join(root, 'src/app/services/transactions/sanitizeTransactionForSharing.ts'),
            'utf8',
        );
        expect(sharing).not.toMatch(/export\s*\{[^}]*scrubPii/);
        const treeTest = readFileSync(join(root, 'src/app/__tests__/transactionsThreading.test.ts'), 'utf8');
        expect(treeTest).toContain("from '@/app/modules/transactionsThreading/service'");
        expect(treeTest).not.toMatch(/from '@\/app\/modules\/transactionsThreading['"]/);
    });

    it('الشاشات والقشور المحذوفة لا تعود', () => {
        expect(existsSync(join(dir, 'FinancesTabView.tsx'))).toBe(false);
        expect(existsSync(join(dir, 'AddFinanceBottomSheet.tsx'))).toBe(false);
        expect(existsSync(join(dir, 'FinancialRecordCard.tsx'))).toBe(false);
        expect(existsSync(join(dir, 'TransactionsHubInstantShell.tsx'))).toBe(false);
        expect(existsSync(join(dir, 'TransactionsThreadingSystemEntry.tsx'))).toBe(false);
    });
});
