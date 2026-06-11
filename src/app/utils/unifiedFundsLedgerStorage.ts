import SecureStoreService from '@/app/services/SecureStoreService';

/**
 * تخزين الوعاء الموحّد (أتعاب + مصاريف) — نفس المفتاح المستخدم في FinancialOperationsCenter
 */

export type StoredLawyerFeeRow = { id: string; amount: number; label: string; at: string };
export type StoredExpenseRow = { id: string; amount: number; reason: string; at: string };
export type StoredLocalPaymentRow = {
    id: string;
    amount: number;
    at: string;
    kind: 'partial' | 'full';
    balanceAfter: number;
};

export type StoredUnifiedLedger = {
    lawyerFees: StoredLawyerFeeRow[];
    expenses: StoredExpenseRow[];
    payments: StoredLocalPaymentRow[];
    completed: boolean;
    garnishment: boolean;
    seeded: boolean;
    collectionRequestActive: boolean;
};

const empty = (): StoredUnifiedLedger => ({
    lawyerFees: [],
    expenses: [],
    payments: [],
    completed: false,
    garnishment: false,
    seeded: false,
    collectionRequestActive: false,
});

export function unifiedFundsLedgerStorageKey(executionId: string): string {
    return `hami_unified_funds_ledger_${executionId}`;
}

/** قراءة أرشيف الوعاء الموحّد من localStorage (للمودالات والتقارير) */
export function readUnifiedFundsLedger(executionId: string | undefined): StoredUnifiedLedger | null {
    if (!executionId) return null;
    try {
        const raw = SecureStoreService.getItemSync(unifiedFundsLedgerStorageKey(executionId));
        if (!raw) return null;
        const p = JSON.parse(raw) as Partial<StoredUnifiedLedger>;
        return {
            ...empty(),
            ...p,
            lawyerFees: Array.isArray(p.lawyerFees) ? p.lawyerFees : [],
            expenses: Array.isArray(p.expenses) ? p.expenses : [],
            payments: Array.isArray(p.payments) ? p.payments : [],
            seeded: Boolean(p.seeded),
            collectionRequestActive: Boolean(p.collectionRequestActive),
            completed: Boolean(p.completed),
            garnishment: Boolean(p.garnishment),
        };
    } catch {
        return null;
    }
}

const amountsClose = (a: number, b: number) => Math.abs(a - b) < 0.01;

/**
 * يزيل من عرض «أرشيف الوعاء» بند الأتعاب المزروع آلياً عند إنشاء الوعاء إذا كان
 * نفس المبلغ يُعرض أصلاً تحت «أتعاب المحاماة المحكوم بها» في مكوّنات الإضبارة.
 * المعرّف في FinancialOperationsCenter: `seed-lawyer-{executionId}`
 */
export function filterUnifiedLawyerFeesHideFileDuplicate(
    rows: StoredLawyerFeeRow[],
    courtOrderedFeesFromFile: number
): StoredLawyerFeeRow[] {
    if (courtOrderedFeesFromFile <= 0) return rows;
    return rows.filter(
        (r) =>
            !(
                String(r.id).startsWith('seed-lawyer-') &&
                amountsClose(r.amount, courtOrderedFeesFromFile)
            )
    );
}

/**
 * يزيل مصاريف الإضبارة المزروعة في الوعاء إذا طابق مجموع ما في الإضبارة + تخلية.
 * المعرّف: `seed-exp-{executionId}` — المبلغ = execution_expenses_sum + eviction_case_expenses_sum
 */
export function filterUnifiedExpensesHideFileDuplicate(
    rows: StoredExpenseRow[],
    executionExpensesFromFile: number,
    evictionCaseExpensesSumForSeed: number
): StoredExpenseRow[] {
    const expectedSeed = executionExpensesFromFile + (evictionCaseExpensesSumForSeed || 0);
    if (expectedSeed <= 0) return rows;
    return rows.filter(
        (r) =>
            !(String(r.id).startsWith('seed-exp-') && amountsClose(r.amount, expectedSeed))
    );
}

export type EncroachmentCaseExpenseRow = {
    id: string;
    amount: number;
    note: string;
    requestTitle: string;
    workflowKey: string;
    date: string;
};

/** إضافة قيد في قسم المصاريف التنفيذية بالمركز المالي */
export function appendUnifiedLedgerExecutionExpense(
    executionId: string | undefined,
    amount: number,
    reason: string
): boolean {
    const exId = String(executionId ?? '').trim();
    const amt = Math.max(0, Math.trunc(amount));
    if (!exId || amt <= 0) return false;
    try {
        const ledger = readUnifiedFundsLedger(exId) || empty();
        const row: StoredExpenseRow = {
            id: `enc-ex-${Date.now()}`,
            amount: amt,
            reason: String(reason || 'مصاريف تنفيذية').trim() || 'مصاريف تنفيذية',
            at: new Date().toISOString(),
        };
        const next: StoredUnifiedLedger = {
            ...ledger,
            expenses: [row, ...ledger.expenses],
            seeded: true,
        };
        SecureStoreService.setItemSync(unifiedFundsLedgerStorageKey(exId), JSON.stringify(next));
        if (typeof window !== 'undefined') {
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-unified-ledger-updated', {
                        detail: { executionId: exId },
                    })
                );
            } catch {
                /* ignore */
            }
        }
        return true;
    } catch {
        return false;
    }
}
