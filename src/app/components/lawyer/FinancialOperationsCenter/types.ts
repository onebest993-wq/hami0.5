export type LawyerFeeRow = { id: string; amount: number; label: string; at: string };
export type ExpenseRow = { id: string; amount: number; reason: string; at: string };
export type LocalPaymentRow = {
    id: string;
    amount: number;
    at: string;
    kind: 'partial' | 'full';
    entryType?: 'collect' | 'disburse' | 'settlement';
    balanceAfter: number;
    debtBalanceAfter?: number;
    trustBalanceAfter?: number;
};
export type PendingSettlement = {
    id: string;
    amount: number;
    dueDate: string;
    createdAt: string;
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
};

export interface FinancialLedgerEntry {
    id: string;
    date: string;
    type: 'payment' | 'fee' | 'settlement';
    amount: number;
    description: string;
    balance: number;
}
