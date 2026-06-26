// @ts-nocheck
/** أعلام تكليف حضور الموظف للواجهة الجبرية — موجة 9 */
import { useMemo } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { getEmployeeAssignmentForDebtorKey } from '@/app/utils/employeeSummonsAssignment';
import {
    employeePhaseUnlocksPersonalCoercive,
    shouldShowEmployeeAssignmentCoerciveBlock,
    type EmployeeAssignmentCoercivePhase,
} from './executionDashboardEmployeeAssignmentSync';

export type UseExecutionDashboardEmployeeAssignmentCoerciveStateParams = {
    executionData: ExecutionFile | null | undefined;
    assignmentWorkspaceActiveDebtorKey: string;
    followupAssignmentWorkspaceActiveDebtorKey: string;
    primaryDebtorKeyResolved: string;
    activeDebtorIsEmployee: boolean;
    followupModalDebtorIsEmployee: boolean;
};

function resolvePhase(
    executionData: ExecutionFile | null | undefined,
    debtorKey: string,
    primaryDebtorKeyResolved: string,
): EmployeeAssignmentCoercivePhase {
    if (!executionData) return null;
    const assignment = getEmployeeAssignmentForDebtorKey(
        executionData,
        debtorKey,
        primaryDebtorKeyResolved,
    );
    return (assignment?.phase as EmployeeAssignmentCoercivePhase) ?? null;
}

export function useExecutionDashboardEmployeeAssignmentCoerciveState({
    executionData,
    assignmentWorkspaceActiveDebtorKey,
    followupAssignmentWorkspaceActiveDebtorKey,
    primaryDebtorKeyResolved,
    activeDebtorIsEmployee,
    followupModalDebtorIsEmployee,
}: UseExecutionDashboardEmployeeAssignmentCoerciveStateParams) {
    const modalResolvedEmployeeSummonsAssignment = useMemo(() => {
        if (!executionData) return null;
        return getEmployeeAssignmentForDebtorKey(
            executionData,
            followupAssignmentWorkspaceActiveDebtorKey,
            primaryDebtorKeyResolved,
        );
    }, [
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        followupAssignmentWorkspaceActiveDebtorKey,
        primaryDebtorKeyResolved,
    ]);

    const employeeAssignmentPhaseForCoercive = useMemo(
        () =>
            resolvePhase(
                executionData,
                assignmentWorkspaceActiveDebtorKey,
                primaryDebtorKeyResolved,
            ),
        [
            executionData,
            executionData?.employee_summons_assignments_by_debtor,
            executionData?.employee_summons_assignment,
            assignmentWorkspaceActiveDebtorKey,
            primaryDebtorKeyResolved,
        ],
    );

    const modalShowEmployeeAssignmentCoerciveBlock = useMemo(
        () =>
            shouldShowEmployeeAssignmentCoerciveBlock(
                followupModalDebtorIsEmployee,
                resolvePhase(
                    executionData,
                    followupAssignmentWorkspaceActiveDebtorKey,
                    primaryDebtorKeyResolved,
                ),
            ),
        [
            executionData,
            followupAssignmentWorkspaceActiveDebtorKey,
            followupModalDebtorIsEmployee,
            primaryDebtorKeyResolved,
        ],
    );

    const employeeUnlocksPersonalCoerciveFromAssignment = useMemo(
        () =>
            employeePhaseUnlocksPersonalCoercive(
                activeDebtorIsEmployee,
                employeeAssignmentPhaseForCoercive,
            ),
        [activeDebtorIsEmployee, employeeAssignmentPhaseForCoercive],
    );

    return {
        modalResolvedEmployeeSummonsAssignment,
        modalShowEmployeeAssignmentCoerciveBlock,
        employeeAssignmentPhaseForCoercive,
        employeeUnlocksPersonalCoerciveFromAssignment,
    };
}
