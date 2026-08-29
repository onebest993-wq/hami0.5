/**
 * Execution state machine — shared types.
 */

export type ExecutionStatus =
    | 'UNNOTIFIED' // غير مبلغ
    | 'GRACE_PERIOD' // فترة رضائية (Days 1-7)
    | 'READY_FOR_COERCIVE' // جاهز للتنفيذ (Day 8+)
    | 'CLOSED_PAID'; // مغلقة / مسددة

export interface ExecutionStatusMeta {
    status: ExecutionStatus;
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
}

export interface DebtorExecutionState {
    debtorId: string;
    debtorName: string;
    notificationDate: string | null;
    status: ExecutionStatus;
    daysElapsed: number;
    daysRemaining: number;
    canTakeCoerciveAction: boolean;
    isGracePeriodExtended: boolean;
    extensionReason?: string;
}

export interface ExecutionFileState {
    fileId: string;
    remainingDebt: number;
    isPaused: boolean;
    pauseReason?: string;
    debtors: DebtorExecutionState[];
    globalStatus: ExecutionStatus;
    canAddExecutionFee: boolean;
    executionFeeAdded: boolean;
    isAlimony: boolean;
}
