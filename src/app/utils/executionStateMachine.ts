/**
 * Barrel: execution state machine — public import path unchanged.
 */
export { formatDateToLocalYmd, getLocalTodayYmd } from '@/app/utils/localYmd';

export type {
    ExecutionStatus,
    ExecutionStatusMeta,
    DebtorExecutionState,
    ExecutionFileState,
} from './executionStateMachineTypes';

export {
    parseLocalNotificationDate,
    isWeekend,
    isPublicHoliday,
    isWorkingDay,
    getNextWorkingDay,
    calculateGracePeriodEnd,
    calculateDaysElapsed,
    calculateActualDaysElapsed,
    calculateGracePeriodEndDate,
    calculateDaysRemaining,
    isGracePeriodExpired,
} from './executionStateMachineChrono';

export {
    calculateExecutionStatus,
    calculateDebtorState,
    calculateGlobalFileState,
} from './executionStateMachineStatus';

export {
    getStatusMetadata,
    getCountdownText,
    validateStateConsistency,
} from './executionStateMachineUiMeta';

import {
    calculateGracePeriodEnd,
    calculateDaysElapsed,
    isWorkingDay,
    isWeekend,
    isPublicHoliday,
} from './executionStateMachineChrono';
import {
    calculateExecutionStatus,
    calculateDebtorState,
    calculateGlobalFileState,
} from './executionStateMachineStatus';
import {
    getStatusMetadata,
    getCountdownText,
    validateStateConsistency,
} from './executionStateMachineUiMeta';

export default {
    calculateExecutionStatus,
    calculateDebtorState,
    calculateGlobalFileState,
    getStatusMetadata,
    getCountdownText,
    calculateGracePeriodEnd,
    calculateDaysElapsed,
    isWorkingDay,
    isWeekend,
    isPublicHoliday,
    validateStateConsistency,
};
