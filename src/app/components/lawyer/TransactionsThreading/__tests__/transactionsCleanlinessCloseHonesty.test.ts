import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(process.cwd(), 'src/app/components/lawyer/TransactionsThreading');
const root = process.cwd();

function src(...parts: string[]): string {
    return readFileSync(join(dir, ...parts), 'utf8');
}

function collectTxSourceFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const full = join(directory, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === '__tests__') return [];
            return collectTxSourceFiles(full);
        }
        return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    });
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
        const types = readFileSync(join(root, 'src/app/modules/transactionsThreading/types.ts'), 'utf8');
        expect(types).not.toContain('FinanceRecord');
        expect(types).not.toContain('agreedFees');
        const persist = readFileSync(
            join(root, 'src/app/services/transactions/sanitizeTransactionsThreadingPersist.ts'),
            'utf8',
        );
        expect(persist).not.toContain('financeRecords');
        expect(persist).not.toContain('agreedFees');
        const cloudTypes = readFileSync(
            join(root, 'src/app/services/cloud/lawyerTransactionTypes.ts'),
            'utf8',
        );
        expect(cloudTypes).not.toContain('financeRecords');
        const treeTest = readFileSync(join(root, 'src/app/__tests__/transactionsThreading.test.ts'), 'utf8');
        expect(treeTest).toContain("from '@/app/modules/transactionsThreading/service'");
        expect(treeTest).not.toMatch(/from '@\/app\/modules\/transactionsThreading['"]/);
        expect(existsSync(join(dir, 'TransactionsDropdownMenu.tsx'))).toBe(false);
        expect(existsSync(join(dir, 'transactionsMenuClose.ts'))).toBe(false);
        expect(existsSync(join(dir, 'ShareProcedureLoadGuard.tsx'))).toBe(false);
        expect(existsSync(join(dir, 'TransactionsChunkGuard.tsx'))).toBe(true);
        expect(existsSync(join(dir, 'taskThread/TaskThreadDialogs.types.ts'))).toBe(true);
        expect(existsSync(join(dir, 'transactionsDetailsReveal.ts'))).toBe(true);
        expect(existsSync(join(dir, 'transactionsChunkLoadError.ts'))).toBe(true);
    });

    it('الشاشات والقشور المحذوفة لا تعود', () => {
        expect(existsSync(join(dir, 'FinancesTabView.tsx'))).toBe(false);
        expect(existsSync(join(dir, 'AddFinanceBottomSheet.tsx'))).toBe(false);
        expect(existsSync(join(dir, 'FinancialRecordCard.tsx'))).toBe(false);
        expect(existsSync(join(dir, 'TransactionsHubInstantShell.tsx'))).toBe(false);
        expect(existsSync(join(dir, 'TransactionsThreadingSystemEntry.tsx'))).toBe(false);
        const aux = readFileSync(
            join(root, 'src/app/services/calendar/dossierSync/auxiliarySync.ts'),
            'utf8',
        );
        expect(aux).not.toContain('loadTransactionsLocalForCalendar');
        expect(aux).not.toMatch(/export async function syncTransactions\s*\(/);
        const pruneIds = readFileSync(
            join(root, 'src/app/services/calendar/dossierSync/pruneValidIds.ts'),
            'utf8',
        );
        expect(pruneIds).not.toContain('TransactionDB');
        expect(pruneIds).toContain('TransactionsThreadingDB');
        const propagate = readFileSync(
            join(root, 'src/app/services/calendar/bridgePersistence/propagate.ts'),
            'utf8',
        );
        expect(propagate).not.toContain('patchTransactionStep');
        expect(propagate).toContain('patchThreadingTaskDeadline');
        const bridgeShared = readFileSync(
            join(root, 'src/app/services/calendar/bridgePersistence/shared.ts'),
            'utf8',
        );
        expect(bridgeShared).not.toContain('patchTransactionStep');
        expect(bridgeShared).not.toContain('TransactionDB');
        const orch = readFileSync(
            join(root, 'src/app/services/calendar/dossierSync/orchestrator.ts'),
            'utf8',
        );
        expect(orch).not.toContain('syncTransactionsCalendarSnapshot');
        expect(orch).toContain('TransactionDB.steps');
        const repo = readFileSync(join(root, 'src/app/modules/transactionsThreading/repository.ts'), 'utf8');
        expect(repo).not.toContain('financeRecords');
        expect(repo).not.toContain('agreedFees');
    });

    it('واجهة القسم بلا Radix tabs/dropdown وبلا أيقونات lucide', () => {
        const files = collectTxSourceFiles(dir);
        expect(files.length).toBeGreaterThan(20);
        for (const file of files) {
            const text = readFileSync(file, 'utf8');
            expect(text.includes('@radix-ui/react-tabs'), `tabs radix: ${file}`).toBe(false);
            expect(text.includes('@radix-ui/react-dropdown-menu'), `dropdown radix: ${file}`).toBe(false);
            expect(text.includes("@/app/components/ui/tabs"), `ui/tabs: ${file}`).toBe(false);
            expect(text.includes("@/app/components/ui/dropdown-menu"), `ui/dropdown: ${file}`).toBe(false);
            expect(text.includes("@/app/components/ui/icons/"), `ui/icons: ${file}`).toBe(false);
        }
    });
});
