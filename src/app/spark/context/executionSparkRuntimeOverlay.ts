import type { PendingSettlement } from '@/app/components/lawyer/FinancialOperationsCenter/types';

/** حالة لحظية من لوحة التنفيذ — تُكمّل بيانات الإضبارة المخزّنة */
export type ExecutionSparkFinancialOverlay = {
    ledgerRemainingIqd?: number;
    pendingSettlement?: PendingSettlement | null;
    settlementBreachTriggeredAt?: string | null;
    daysSinceLastLedgerPayment?: number;
};

export type ExecutionSparkRuntimeOverlay = {
    activeCoerciveActions?: string[];
    notificationCount?: number;
    summoningRound?: number;
    lawyerStartedPostNoticeExecution?: boolean;
    forcedAttendanceIssued?: boolean;
    debtorAttendedVoluntarily?: boolean;
    voluntaryAttendanceCount?: number;
    investigationMemoIssued?: boolean;
    debtorArrested?: boolean;
    forcedPathAttendanceSecured?: boolean;
    noticeVoluntaryPeriodEndOptimistic?: boolean;
    voluntaryEndOptimistic?: boolean;
    financial?: ExecutionSparkFinancialOverlay;
};

export const COERCIVE_ACTION_LABELS_AR: Record<string, string> = {
    salary: 'حجز راتب',
    travel_ban: 'منع سفر',
    seizure: 'حجز منقول',
    arrest: 'حبس',
    summons: 'تبليغ جبري',
    imprisonment: 'حبس تنفيذي',
    garnishment: 'حجز مبالغ',
    eviction: 'إخلاء',
    employee_assignment: 'تكليف موظف',
};

export function formatCoerciveActionsList(actions: string[]): string {
    return actions
        .map((id) => COERCIVE_ACTION_LABELS_AR[id] ?? id)
        .filter(Boolean)
        .join(' · ');
}

/** يستخرج overlay من حقول الإضبارة المخزّنة — للأرشيف والمسح دون فتح اللوحة */
export function buildExecutionSparkRuntimeOverlayFromFile(
    file: Record<string, unknown>,
): ExecutionSparkRuntimeOverlay {
    const coercive = file.activeCoerciveActions;
    return {
        activeCoerciveActions: Array.isArray(coercive)
            ? coercive.map((item) => String(item)).filter(Boolean)
            : undefined,
        notificationCount:
            typeof file.notificationCount === 'number' ? file.notificationCount : undefined,
        summoningRound:
            typeof file.summoningRound === 'number' ? file.summoningRound : undefined,
        forcedAttendanceIssued: file.forcedAttendanceIssued === true,
        debtorAttendedVoluntarily: file.debtorAttendedVoluntarily === true,
        voluntaryAttendanceCount:
            typeof file.voluntaryAttendanceCount === 'number'
                ? file.voluntaryAttendanceCount
                : undefined,
        investigationMemoIssued: file.investigationMemoIssued === true,
        debtorArrested: file.debtorArrested === true,
        forcedPathAttendanceSecured: file.forcedPathAttendanceSecured === true,
    };
}
