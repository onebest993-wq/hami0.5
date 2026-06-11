export type LawyerFeeRow = { id: string; amount: number; label: string; at: string };
export type ExpenseRow = { id: string; amount: number; reason: string; at: string };
export type LocalPaymentRow = {
    id: string;
    amount: number;
    at: string;
    kind: 'partial' | 'full';
    entryType?: 'collect' | 'disburse' | 'settlement' | 'debt_adjustment';
    balanceAfter: number;
    debtBalanceAfter?: number;
    trustBalanceAfter?: number;
};
export type PendingSettlement = {
    id: string;
    amount: number;
    dueDate: string;
    createdAt: string;
    /** بداية دورة النفقة المستمرة (YYYY-MM-DD) */
    periodStartYmd?: string;
    /** تسوية النفقة الشهرية المستمرة — لا تُخصم من المتبقي عند التسجيل */
    tracksOngoingAlimony?: boolean;
};

export type UnifiedLedgerStore = {
    lawyerFees: LawyerFeeRow[];
    expenses: ExpenseRow[];
    payments: LocalPaymentRow[];
    completed: boolean;
    garnishment: boolean;
    seeded: boolean;
    principalSnapshot: number | null;
    collectionRequestActive: boolean;
    collectionRequestedTotal: number | null;
    evictionLedgerActivated: boolean;
    pendingSettlement: PendingSettlement | null;
    /** يُسجَّل عند إلغاء التسوية بعد «لم يتم التسديد» — يُفعّل كفيل ضامن للمبلغ */
    settlementBreachTriggeredAt: string | null;
    /** آخر تاريخ احتُسبت منه نفقة مستمرة غير مسددة — لتجنّب الازدواج */
    alimonyLastAccrualThroughYmd?: string | null;
};

export interface FinancialLedgerEntry {
    id: string;
    date: string;
    type: 'payment' | 'fee' | 'settlement';
    amount: number;
    description: string;
    balance: number;
}
