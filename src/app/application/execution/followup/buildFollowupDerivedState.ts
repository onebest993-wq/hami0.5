import type { ExecutionFile, EmployeeSummonsAssignmentState } from '@/app/types/execution';
import { getEmployeeAssignmentForDebtorKey } from '@/app/utils/employeeSummonsAssignment';

export type ExecutorDecisionOutcomeLite = {
    executorOutcome?: string | null;
};

export type FollowupDerivedState = {
    anyExecutorDecisionResolvedForMemoBadge: boolean;
    primaryDebtorTaklifActive: boolean;
    resolvedEmployeeSummonsAssignment: EmployeeSummonsAssignmentState | null;
    showEmployeeAssignmentCoerciveBlock: boolean;
};

function isActiveAssignmentPhase(phase: string | null | undefined): boolean {
    return (
        phase === 'active' ||
        phase === 'absent_declared' ||
        phase === 'investigation_pending' ||
        phase === 'warrant_ui'
    );
}

export function buildFollowupDerivedState(input: {
    executionData: ExecutionFile | null | undefined;
    primaryDebtorKeyResolved: string | null;
    unifiedSummonsTargetDebtorKey: string | null;
    executorDecisionRows: ExecutorDecisionOutcomeLite[];
}): FollowupDerivedState {
    const {
        executionData,
        primaryDebtorKeyResolved,
        unifiedSummonsTargetDebtorKey,
        executorDecisionRows,
    } = input;

    const anyExecutorDecisionResolvedForMemoBadge = (executorDecisionRows || []).some((row) => {
        const outcome = String(row?.executorOutcome || '').trim().toLowerCase();
        return outcome === 'approved' || outcome === 'alternative';
    });

    const primaryDebtorTaklifActive = (() => {
        if (!executionData) return false;
        const debtorKey = primaryDebtorKeyResolved;
        const assignment = getEmployeeAssignmentForDebtorKey(executionData, debtorKey, debtorKey);
        return Boolean(assignment && isActiveAssignmentPhase(assignment.phase));
    })();

    const resolvedEmployeeSummonsAssignment = executionData
        ? getEmployeeAssignmentForDebtorKey(
              executionData,
              unifiedSummonsTargetDebtorKey,
              primaryDebtorKeyResolved,
          )
        : null;

    const showEmployeeAssignmentCoerciveBlock = Boolean(
        resolvedEmployeeSummonsAssignment &&
            isActiveAssignmentPhase(resolvedEmployeeSummonsAssignment.phase) &&
            resolvedEmployeeSummonsAssignment.phase !== 'active',
    );

    return {
        anyExecutorDecisionResolvedForMemoBadge,
        primaryDebtorTaklifActive,
        resolvedEmployeeSummonsAssignment,
        showEmployeeAssignmentCoerciveBlock,
    };
}
