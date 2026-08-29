import {
    appendMonthlySettlementDefaultTask,
    computeMonthlySettlementDelayCount,
    trashMonthlySettlementDefaultTasks,
    MONTHLY_SETTLEMENT_DEFAULT_TASK_TITLE,
} from '@/app/components/lawyer/ExecutionDashboard/utils/financialHubPortalUtils';
import type { ExecutionFinancialHubCaseTaskPending } from './ExecutionFinancialHubPortalProps';
import type { ExecutionFile } from '@/app/types/execution';
import type { CaseTaskRow } from '@/app/components/lawyer/ExecutionDashboard/utils/financialHubPortalUtils';
import type { Dispatch, SetStateAction } from 'react';

type MonthlySettlementExecutionFields = {
    monthly_settlement_default_dueDate?: string | null;
    monthly_settlement_delay_count?: number | null;
};

export function asCaseTasksPending(rows: CaseTaskRow[]): ExecutionFinancialHubCaseTaskPending[] {
    return rows as ExecutionFinancialHubCaseTaskPending[];
}

export function runMonthlySettlementDefault(params: {
    dueDate: string;
    amount: number;
    executionData: ExecutionFile | null | undefined;
    getLocalTodayYmd: () => string;
    nextTimelineId: () => string;
    setCaseTasksPending: Dispatch<SetStateAction<ExecutionFinancialHubCaseTaskPending[]>>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
}) {
    const {
        dueDate,
        amount,
        executionData,
        getLocalTodayYmd,
        nextTimelineId,
        setCaseTasksPending,
        persistExecutionMerge,
        showToast,
    } = params;
    const ts = new Date().toISOString();
    const ymd = getLocalTodayYmd();
    const settlementMeta = executionData as
        | (ExecutionFile & MonthlySettlementExecutionFields)
        | null
        | undefined;
    const prevDue = String(settlementMeta?.monthly_settlement_default_dueDate || '').trim();
    const prevDelay = Number(settlementMeta?.monthly_settlement_delay_count);
    const nextDelay = computeMonthlySettlementDelayCount({
        dueDate,
        prevDueDate: prevDue,
        prevDelayCount: prevDelay,
    });
    setCaseTasksPending((prev) => {
        const { nextTasks } = appendMonthlySettlementDefaultTask({
            prevTasks: prev,
            dueDate,
            amount,
            todayYmd: ymd,
            nextTimelineId,
        });
        const typedNext = asCaseTasksPending(nextTasks);
        queueMicrotask(() =>
            persistExecutionMerge({
                caseTasksPending: typedNext,
                monthly_settlement_default_alert: true,
                monthly_settlement_default_dueDate: dueDate,
                monthly_settlement_delay_count: nextDelay,
                monthly_settlement_default_at: ts,
            }),
        );
        return typedNext;
    });
    showToast(`${MONTHLY_SETTLEMENT_DEFAULT_TASK_TITLE}: تم تفعيل التنبيه في الإضبارة.`, 'warning');
}

export function runMonthlySettlementPaid(params: {
    dueDate: string;
    nextDueDate: string;
    amount: number;
    setCaseTasksPending: Dispatch<SetStateAction<ExecutionFinancialHubCaseTaskPending[]>>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
}) {
    const { dueDate, nextDueDate, amount, setCaseTasksPending, persistExecutionMerge } = params;
    const ts = new Date().toISOString();
    setCaseTasksPending((prev) => {
        const next = asCaseTasksPending(trashMonthlySettlementDefaultTasks(prev, dueDate));
        queueMicrotask(() =>
            persistExecutionMerge({
                caseTasksPending: next,
                monthly_settlement_default_alert: false,
                monthly_settlement_default_dueDate: null,
                monthly_settlement_delay_count: 0,
                monthly_settlement_last_paid_at: ts,
                monthly_settlement_last_paid_amount: Math.max(0, amount || 0),
                monthly_settlement_next_dueDate: String(nextDueDate || '').trim(),
            }),
        );
        return next;
    });
}
