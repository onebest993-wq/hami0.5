/**
 * Execution state machine — display metadata + consistency validator.
 */
import type { ExecutionFileState, ExecutionStatus, ExecutionStatusMeta } from './executionStateMachineTypes';

/**
 * Get display metadata for a given status
 */
export function getStatusMetadata(status: ExecutionStatus): ExecutionStatusMeta {
    const metadata: Record<ExecutionStatus, ExecutionStatusMeta> = {
        UNNOTIFIED: {
            status: 'UNNOTIFIED',
            label: 'غير مبلغ',
            icon: '⚪',
            color: 'text-gray-400',
            bgColor: 'bg-gray-900/40',
            borderColor: 'border-gray-500/30',
        },
        GRACE_PERIOD: {
            status: 'GRACE_PERIOD',
            label: 'فترة رضائية',
            icon: '🟡',
            color: 'text-amber-400',
            bgColor: 'bg-amber-900/40',
            borderColor: 'border-amber-500/30',
        },
        READY_FOR_COERCIVE: {
            status: 'READY_FOR_COERCIVE',
            label: 'جاهز للتنفيذ',
            icon: '🔴',
            color: 'text-rose-400',
            bgColor: 'bg-rose-900/40',
            borderColor: 'border-rose-500/30',
        },
        CLOSED_PAID: {
            status: 'CLOSED_PAID',
            label: 'مغلقة / مسددة',
            icon: '🟢',
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-900/40',
            borderColor: 'border-emerald-500/30',
        },
    };
    
    return metadata[status];
}

/**
 * Get human-readable countdown text
 */
export function getCountdownText(daysRemaining: number, isExtended: boolean = false): string {
    if (daysRemaining === 0) {
        return 'انتهت المهلة';
    } else if (daysRemaining === 1) {
        return isExtended ? 'باقي يوم واحد (ممتد)' : 'باقي يوم واحد';
    } else {
        return isExtended ? `باقي ${daysRemaining} أيام (ممتد)` : `باقي ${daysRemaining} أيام`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE MACHINE VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate that the UI is in sync with the calculated state
 * Use this in development to catch bugs
 * 
 * NOTE: This is a PASSIVE validator - it only checks for actual UI conflicts,
 * not theoretical rules. The warnings are for developer guidance only.
 */
export function validateStateConsistency(
    displayedStatus: ExecutionStatus,
    calculatedState: ExecutionFileState,
    uiState?: {
        isTimerVisible?: boolean;
        isGracePeriodEndButtonVisible?: boolean;
        isCoerciveArsenalUnlocked?: boolean;
    }
): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // CRITICAL ERROR: Status mismatch between UI and State Machine
    if (displayedStatus !== calculatedState.globalStatus) {
        errors.push(
            `🚨 CRITICAL: Status mismatch - UI shows "${displayedStatus}" but State Machine calculated "${calculatedState.globalStatus}"`
        );
    }
    
    // UI STATE CHECKS (only if uiState is provided)
    if (uiState) {
        // Check for conflicting UI elements based on actual UI state
        if (calculatedState.globalStatus === 'GRACE_PERIOD' && uiState.isGracePeriodEndButtonVisible) {
            errors.push('🚨 UI CONFLICT: "انتهت المهلة" button is visible during GRACE_PERIOD (should be hidden)');
        }
        
        if (calculatedState.globalStatus === 'UNNOTIFIED' && uiState.isTimerVisible) {
            errors.push('🚨 UI CONFLICT: Countdown timer is visible before notification (should be hidden)');
        }
        
        if (calculatedState.isPaused && uiState.isCoerciveArsenalUnlocked) {
            errors.push('🚨 UI CONFLICT: Coercive tools are unlocked while execution is paused (should be locked)');
        }
        
        if ((calculatedState.globalStatus === 'UNNOTIFIED' || calculatedState.globalStatus === 'GRACE_PERIOD') && uiState.isCoerciveArsenalUnlocked) {
            errors.push('🚨 UI CONFLICT: Coercive tools are unlocked before grace period ends (should be locked)');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}
