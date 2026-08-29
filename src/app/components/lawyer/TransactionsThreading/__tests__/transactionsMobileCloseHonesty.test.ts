import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const tx = join(root, 'src/app/components/lawyer/TransactionsThreading');

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

function readTx(name: string): string {
    return readFileSync(join(tx, name), 'utf8');
}

describe('transactions mobile close honesty', () => {
    it('إيماءات النظام: رجوع أصلي + حافة الشاشة + قفل التمرير + overlay-safe', () => {
        const escape = readTx('hooks/useTransactionsEscapeStack.ts');
        expect(escape).toContain('registerNativeBackHandler');
        expect(escape).toContain('consumeBackStack');
        const edge = read('src/app/runtime/overlayEdgeBackGesture.ts');
        expect(edge).toContain("'data-hami-transactions-open'");
        expect(edge).toContain('isAndroidNativeShell');
        expect(edge).toContain('fromInlineStart');
        const snap = read('src/app/services/transactions/transactionsShellSnap.ts');
        expect(snap).toContain("ATTR = 'data-hami-transactions-open'");
        const paint = read('src/app/runtime/transactionsInstantPaint.ts');
        expect(paint).toContain('snapTransactionsShellOpen');
        expect(paint).toContain('armOverlayEnterSettle');
        expect(paint).toContain('data-hami-tx-enter');
        expect(paint).toContain('queryLiveTransactionsHub');
        const system = readTx('TransactionsThreadingSystem.tsx');
        expect(system).toContain('useBodyScrollLock');
        expect(system).toContain('data-hami-overlay-safe');
        expect(system).toContain("touchAction: 'manipulation'");
        const dialog = readTx('TransactionsHubDialog.tsx');
        expect(dialog).toContain('data-hami-overlay-safe');
        expect(dialog).toContain("touchAction: 'manipulation'");
        expect(dialog).toContain('!transition-none');
        const sheet = readTx('TransactionsHubSheet.tsx');
        expect(sheet).toContain('!transition-none');
    });

    it('لوحة المفاتيح: ورقة الإضافة والحوار المركزي وحقول 16px', () => {
        const sheet = readTx('TransactionsHubSheet.tsx');
        expect(sheet).toContain('useMobileKeyboardInset');
        expect(sheet).toContain('data-keyboard-inset');
        const dialog = readTx('TransactionsHubDialog.tsx');
        expect(dialog).toContain('useMobileKeyboardInset');
        expect(dialog).toContain('data-keyboard-inset');
        const tokens = readTx('transactionsTheme/tokens.ts');
        expect(tokens).toContain('text-base');
        expect(tokens).toContain('min-h-[44px]');
        expect(tokens).toContain('100dvh');
        expect(tokens).toContain('overflow-hidden');
        expect(tokens).toContain('scrollbar-hide');
        expect(tokens).toContain('hami-tx-page-scroll');
        expect(tokens).toContain('hami-overlay-safe-insets');
        expect(tokens).toContain('touch-manipulation');
        const addTx = readTx('AddTransactionBottomSheet.tsx');
        expect(addTx).toContain('enterKeyHint="next"');
        expect(addTx).toContain('enterKeyHint="done"');
        const addTask = readTx('AddTaskBottomSheet.tsx');
        expect(addTask).toContain('enterKeyHint="done"');
        const addDoc = readTx('DocumentsAddSheet.tsx');
        expect(addDoc).toContain('enterKeyHint="done"');
        const query = readTx('TransactionsListQueryBar.tsx');
        expect(query).toContain('enterKeyHint="search"');
        expect(query).toContain('inputMode="search"');
        expect(query).toContain('text-base');
        const shareForm = readTx('ShareProcedureForm.tsx');
        expect(shareForm).not.toContain('GLASS_FIELD} text-[12px]');
        expect(shareForm).not.toContain('text-[12px] leading-5 resize-y');
        expect(shareForm).toContain('22dvh');
        const shareModal = readTx('ShareProcedureModal.tsx');
        expect(shareModal).toContain('92dvh');
        const report = readTx('transactionDetails/ClientReportDialog.tsx');
        expect(report).toContain('46dvh');
        const saveTemplate = readTx('transactionDetails/SaveTemplateDialog.tsx');
        expect(saveTemplate).toContain('enterKeyHint="done"');
        const details = readTx('TransactionDetailsScreen.tsx');
        expect(details).toContain('min-h-[60dvh]');
        expect(details).not.toContain('min-h-[60vh]');
        expect(shareForm).toContain('enterKeyHint="done"');
    });

    it('مستمسكات التفاصيل داخل مكدس الرجوع الأصلي', () => {
        const stack = readTx('transactionsEscapeStack.ts');
        expect(stack).toContain('addDocumentSheetOpen');
        expect(stack).toContain('deleteDocumentOpen');
        expect(stack).toContain("'close-add-document'");
        expect(stack).toContain("'close-delete-document'");
        const docs = readTx('DocumentsTabView.tsx');
        expect(docs).toContain('onDocumentsEscapeSnapshotChange');
        expect(docs).toContain('registerDocumentsEscapeCloser');
        expect(docs).toContain('detailsActive');
        const screen = readTx('TransactionDetailsScreen.tsx');
        expect(screen).toContain('onDocumentsEscapeSnapshotChange={vm.onDocumentsEscapeSnapshotChange}');
    });
});
