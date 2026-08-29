/**
 * Execution state machine — status / multi-debtor aggregation.
 */
import type { DebtorExecutionState, ExecutionFileState, ExecutionStatus } from './executionStateMachineTypes';
import {
    calculateActualDaysElapsed,
    calculateGracePeriodEnd,
} from './executionStateMachineChrono';

/**
 * Calculate the exact execution status based on date mathematics
 * THIS IS THE SINGLE SOURCE OF TRUTH
 * 🆕 V17: Now supports manual holiday extension
 */
export function calculateExecutionStatus(
    notificationDate: string | null,
    remainingDebt: number,
    currentDate: Date = new Date(),
    manualHolidayExtension: boolean = false,
    /** جولة تبليغ ≥2 أو تبليغ لاحق بلا مهلة إخبار قانونية */
    skipLegalGrace: boolean = false
): {
    status: ExecutionStatus;
    daysElapsed: number;
    daysRemaining: number;
    isGracePeriodExtended: boolean;
    extensionReason?: string;
} {
    // Rule 1: If debt is 0, status is CLOSED
    if (remainingDebt <= 0) {
        return {
            status: 'CLOSED_PAID',
            daysElapsed: 0,
            daysRemaining: 0,
            isGracePeriodExtended: false,
        };
    }
    
    // Rule 2: If no notification date, status is UNNOTIFIED
    if (!notificationDate) {
        return {
            status: 'UNNOTIFIED',
            daysElapsed: 0,
            daysRemaining: manualHolidayExtension ? 8 : 7,
            isGracePeriodExtended: manualHolidayExtension,
            extensionReason: manualHolidayExtension ? 'تمديد يدوي متوقع (+يوم تقويمي)' : undefined,
        };
    }

    // Rule 3: أيام تقويمية فقط من اليوم التالي لتاريخ الإخبار؛ تمديد اختياري (+يوم) بقرار المحامي
    const extra = manualHolidayExtension ? 1 : 0;
    const daysElapsed = calculateActualDaysElapsed(notificationDate, currentDate);
    const totalGraceCalendarDays = 7 + extra;
    const daysRemaining = Math.max(0, totalGraceCalendarDays - daysElapsed);
    const { isExtended, extensionReason } = calculateGracePeriodEnd(notificationDate, manualHolidayExtension);

    if (skipLegalGrace) {
        return {
            status: 'READY_FOR_COERCIVE',
            daysElapsed,
            daysRemaining: 0,
            isGracePeriodExtended: isExtended,
            extensionReason: extensionReason || undefined,
        };
    }

    if (daysElapsed < totalGraceCalendarDays) {
        return {
            status: 'GRACE_PERIOD',
            daysElapsed,
            daysRemaining,
            isGracePeriodExtended: isExtended,
            extensionReason: extensionReason || undefined,
        };
    }
    return {
        status: 'READY_FOR_COERCIVE',
        daysElapsed,
        daysRemaining: 0,
        isGracePeriodExtended: isExtended,
        extensionReason: extensionReason || undefined,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-DEBTOR STATE ISOLATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate individual debtor state with full isolation
 * 🆕 V17: Now supports manual holiday extension
 */
export function calculateDebtorState(
    debtorId: string,
    debtorName: string,
    notificationDate: string | null,
    remainingDebt: number,
    currentDate: Date = new Date(),
    manualHolidayExtension: boolean = false,
    skipLegalGrace: boolean = false
): DebtorExecutionState {
    const statusInfo = calculateExecutionStatus(
        notificationDate,
        remainingDebt,
        currentDate,
        manualHolidayExtension,
        skipLegalGrace
    );
    
    return {
        debtorId,
        debtorName,
        notificationDate,
        status: statusInfo.status,
        daysElapsed: statusInfo.daysElapsed,
        daysRemaining: statusInfo.daysRemaining,
        canTakeCoerciveAction: statusInfo.status === 'READY_FOR_COERCIVE',
        isGracePeriodExtended: statusInfo.isGracePeriodExtended,
        extensionReason: statusInfo.extensionReason,
    };
}

/**
 * Calculate the global file state from multiple debtors
 * CRITICAL: Each debtor has independent timers and states
 * 🆕 V17: Now supports manual holiday extension per file
 */
export function calculateGlobalFileState(
    fileId: string,
    debtors: Array<{ id: string; name: string; notificationDate: string | null }>,
    remainingDebt: number,
    isPaused: boolean,
    pauseReason: string | undefined,
    isAlimony: boolean,
    executionFeeAdded: boolean,
    currentDate: Date = new Date(),
    manualHolidayExtension: boolean = false,
    skipLegalGrace: boolean = false
): ExecutionFileState {
    // Calculate individual debtor states
    const debtorStates = debtors.map(debtor => 
        calculateDebtorState(
            debtor.id,
            debtor.name,
            debtor.notificationDate,
            remainingDebt,
            currentDate,
            manualHolidayExtension,
            skipLegalGrace
        )
    );
    
    // Determine the "most advanced" global status
    let globalStatus: ExecutionStatus = 'UNNOTIFIED';
    
    if (remainingDebt <= 0) {
        globalStatus = 'CLOSED_PAID';
    } else if (debtorStates.some(d => d.status === 'READY_FOR_COERCIVE')) {
        globalStatus = 'READY_FOR_COERCIVE';
    } else if (debtorStates.some(d => d.status === 'GRACE_PERIOD')) {
        globalStatus = 'GRACE_PERIOD';
    }
    
    // Rule: 3% execution fee is added globally when FIRST debtor reaches READY_FOR_COERCIVE
    const canAddExecutionFee = 
        !isAlimony && 
        !executionFeeAdded && 
        debtorStates.some(d => d.status === 'READY_FOR_COERCIVE');
    
    return {
        fileId,
        remainingDebt,
        isPaused,
        pauseReason,
        debtors: debtorStates,
        globalStatus,
        canAddExecutionFee,
        executionFeeAdded,
        isAlimony,
    };
}
