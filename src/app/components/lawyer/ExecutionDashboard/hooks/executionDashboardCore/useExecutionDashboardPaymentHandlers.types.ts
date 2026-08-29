import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile } from '@/app/types/execution';

export type FinancialLedgerEntry = {
    id: string;
    date: string;
    type: 'payment' | 'fee' | 'settlement';
    amount: number;
    description: string;
    balance: number;
};

export type UseExecutionDashboardPaymentHandlersParams = {
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    executionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
    paymentAmount: string;
    paymentDate: string;
    remaining: number;
    paidDebt: number;
    totalOwed: number;
    totalWithExecutionFee: number;
    paidCourtFees: number;
    paidDirectorateFees: number;
    paidClientFees: number;
    financialLedger: FinancialLedgerEntry[];
    financialLedgerRef: MutableRefObject<FinancialLedgerEntry[]>;
    paidDebtRef: MutableRefObject<number>;
    seizedAssetsSnapshotRef: MutableRefObject<unknown>;
    nextTimelineId: () => string;
    pushTimelineEvent: (
        event: import('@/app/types/execution').TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> },
    ) => boolean | void;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type?: string) => void;
    setPaidDebt: Dispatch<SetStateAction<number>>;
    setFinancialLedger: Dispatch<SetStateAction<FinancialLedgerEntry[]>>;
    setPaymentAmount: Dispatch<SetStateAction<string>>;
    setPaymentDate: Dispatch<SetStateAction<string>>;
    setShowPaymentModal: (show: boolean) => void;
    /** بوابة وكيل المدين — اختيارية حتى لا تكسر الجسور القديمة */
    isRepresentingDebtor?: boolean;
};
