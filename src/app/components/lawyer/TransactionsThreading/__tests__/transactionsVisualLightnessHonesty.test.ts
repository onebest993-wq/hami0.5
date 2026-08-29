import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(process.cwd(), 'src/app/components/lawyer/TransactionsThreading');

function src(...parts: string[]): string {
    return readFileSync(join(dir, ...parts), 'utf8');
}

describe('transactions visual lightness honesty', () => {
    it('الثيم كحلي مسطح بلا بترول وبلا سكة ذهبية وبلا بئر أيقونة', () => {
        const tokens = src('transactionsTheme/tokens.ts');
        const chrome = src('transactionsTheme/chrome.tsx');
        expect(tokens).toContain('bg-[#0A0F1C]');
        expect(tokens).toContain('#E6C673');
        expect(tokens).not.toContain('#061014');
        expect(tokens).not.toContain('#152A32');
        expect(tokens).not.toContain('w-[3px]');
        expect(tokens).not.toContain('◈');
        expect(tokens).not.toContain('TX_STAGE_DOT');
        expect(chrome).toContain('mt-10 px-2 text-center');
        expect(tokens).toContain('min-h-[44px]');
        expect(chrome).not.toContain('rounded-xl border border-white/[0.06] bg-white/[0.02]');
        expect(tokens).toContain('hami-tx-page-scroll');
        expect(tokens).toContain('scrollbar-hide');
        expect(src('TransactionsListScreen.tsx')).toContain('transactions-list-scroll');
        expect(src('TransactionDetailsScreen.tsx')).toContain('transactions-details-scroll');
    });

    it('الطبقة تخرج عبر بوابة خارج لوحة المحامي', () => {
        const system = src('TransactionsThreadingSystem.tsx');
        expect(system).toContain('createPortal');
        expect(system).toContain('hami-overlay-portal');
    });

    it('شريط البحث مسطح بلا صندوق زجاجي متداخل وبلا تدرج حواف', () => {
        const query = src('TransactionsListQueryBar.tsx');
        expect(query).not.toContain('rounded-2xl border');
        expect(query).not.toContain('bg-gradient-to-');
        expect(query).toContain('data-testid="transactions-query-bar"');
    });

    it('بطاقة القائمة بلا تسميات حقول وبلا شيفرون زخرفي', () => {
        const card = src('TransactionCard.tsx');
        expect(card).not.toContain('عنوان المعاملة:');
        expect(card).not.toContain('اسم الموكل:');
        expect(card).not.toContain('ChevronLeft');
        expect(src('TransactionCardActions.tsx')).toContain('transactions-archive-');
    });

    it('تفاصيل المعاملة بلا أرقام أقسام وبلا لافتة أيقونة للمكتمل', () => {
        const header = src('transactionDetails/TransactionDetailsHeader.tsx');
        expect(header).not.toContain('TX_STAGE_DOT');
        expect(header).not.toContain('CheckCircle2');
        expect(header).toContain('aria-label="مشاركة الإجراءات للمنتدى"');
        expect(header).toContain('title="مشاركة الإجراءات للمنتدى"');
        expect(header).toContain('المرفقات');
    });

    it('الإنجاز شريط واحد بلا حلقة مخروطية', () => {
        const progress = src('taskThread/TaskThreadProgressPanel.tsx');
        expect(progress).not.toContain('conic-gradient');
        expect(progress).toContain('نسبة الإنجاز');
        expect(progress).toContain('h-1.5');
    });

    it('المرفقات والمهام والمشاركة بلا آبار أيقونة وبلا سكة مراحل وهمية', () => {
        const doc = src('DocumentCard.tsx');
        const task = src('TaskNodeCard.tsx');
        const share = src('ShareProcedureModal.tsx');
        expect(doc).not.toContain('FileText');
        expect(doc).not.toContain('w-11 h-11');
        expect(task).not.toContain('w-11 h-11');
        expect(task).not.toContain('مهمة رئيسية');
        expect(share).not.toContain('share-procedure-stage-rail');
        expect(share).not.toContain('ShieldCheck');
    });
});
