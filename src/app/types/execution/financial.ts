/**
 * Financial amounts, ledger, ghurama, and other-party action track types.
 */

// ═══════════════════════════════════════════════════════════════════════════
// FINANCIAL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FinancialAmount {
    debtAmount: number;
    courtFees: number;
    directorateFees: number;
    lawyerFees: number;
    clientFees: number;
    executionFee: number;
    total: number;
}

export interface PaymentRecord {
    id: string;
    date: string;
    amount: number;
    type: 'debtPayment' | 'courtFeesPayment' | 'directorateFeesPayment' | 'clientFeesPayment';
    description: string;
    receiptNumber?: string;
}

export interface LedgerEntry {
    id: string;
    date: string;
    type: 'payment' | 'fee' | 'settlement';
    amount: number;
    description: string;
    balance: number;
}

export interface GhuramaDistributionLog {
    transactionId: string;
    dateIso: string;
    totalAmountDistributed: number;
    distributionDetails: Array<{
        creditorId: string;
        creditorName: string;
        debtBeforeDistribution: number;
        amountDistributed: number;
    }>;
}

/** محضر المتابعة — قرار منفذ العدل على تحرك الطرف الآخر */
export type OtherPartyActionOutcome = 'approved' | 'rejected' | 'pending';

export interface OtherPartyActionLogEntry {
    id: string;
    /** YYYY-MM-DD */
    date: string;
    content: string;
    outcome: OtherPartyActionOutcome;
    decisionNote?: string;
    savedAt?: string;
    /** ربط بصف قرار المنفذ عند الإرسال من السجل اليدوي */
    decisionRowId?: string;
    /** ربط بخيار كatalog — للسجلات الناتجة عن تتبع يدوي */
    linkedOptionId?: string;
}

/** تتبع يدوي لوكيل المدين — تقديم الدائن وقرار المنفذ */
export type OtherPartyTrackedExecutorOutcome =
    | 'none'
    | 'submitted'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'alternative';

export interface OtherPartyRequestTrackEntry {
    optionId: string;
    label?: string;
    /** YYYY-MM-DD — تاريخ تقديم الدائن (يدوي) */
    submittedDate?: string;
    executorOutcome: OtherPartyTrackedExecutorOutcome;
    /** إخفاء يدوي من قائمة الخيارات */
    hidden?: boolean;
    notes?: string;
    /** بطاقة مركز القرارات المرتبطة */
    decisionId?: string;
    updatedAt?: string;
}
