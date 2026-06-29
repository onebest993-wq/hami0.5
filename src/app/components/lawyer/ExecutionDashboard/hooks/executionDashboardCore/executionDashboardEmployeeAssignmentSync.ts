/** مزامنة نتائج مفاتحة التحقيق مع تكليف حضور الموظف — منطق نقي (موجة 9) */
import type { ExecutionFile, EmployeeSummonsAssignmentState } from '@/app/types/execution';
import {
    mergeInvestigationOutcomesIntoEmployeeAssignments,
    type ExecutorDecisionRowLite,
} from '@/app/utils/employeeSummonsAssignment';

export type { ExecutorDecisionRowLite };

export type InvestigationMergeResult = {
    patch: Partial<ExecutionFile>;
    approvedCount: number;
    rejectedCount: number;
};

export function computeEmployeeInvestigationMerge(
    executionData: ExecutionFile,
    primaryDebtorKeyResolved: string,
    rows: ExecutorDecisionRowLite[],
): InvestigationMergeResult | null {
    return mergeInvestigationOutcomesIntoEmployeeAssignments(
        executionData,
        primaryDebtorKeyResolved,
        rows,
    );
}

export function buildEmployeeInvestigationSyncSignature(
    executionId: string,
    merged: InvestigationMergeResult,
): string {
    const byDebtor = merged.patch.employee_summons_assignments_by_debtor ?? {};
    return [
        executionId,
        String(merged.approvedCount),
        String(merged.rejectedCount),
        ...Object.entries(byDebtor)
            .map(([k, st]) => {
                const row = st as EmployeeSummonsAssignmentState;
                return `${k}:${String(row.phase ?? '')}:${String(row.investigationDecisionId ?? '')}:${String(row.arrestOrderRecorded ?? '')}`;
            })
            .sort(),
    ].join('|');
}

export function investigationMergeToastMessage(
    approvedCount: number,
    rejectedCount: number,
): { message: string; type: 'success' | 'info'; options?: { decisionsLink: boolean } } {
    if (approvedCount > 0 && rejectedCount === 0) {
        return { message: 'تمت موافقة المنفذ على طلب المفاتحة.', type: 'success' };
    }
    if (rejectedCount > 0 && approvedCount === 0) {
        return {
            message: 'صدر رفض الطلب — يمكن إنهاء التكليف أو إعادة المحاولة.',
            type: 'info',
            options: { decisionsLink: true },
        };
    }
    return {
        message: `تم تحديث طلبات المفاتحة: ${approvedCount} موافقة، ${rejectedCount} رفض.`,
        type: 'info',
        options: { decisionsLink: true },
    };
}

export type EmployeeAssignmentCoercivePhase =
    | 'active'
    | 'absent_declared'
    | 'investigation_pending'
    | 'warrant_ui'
    | 'terminated'
    | null;

export function employeePhaseUnlocksPersonalCoercive(
    isEmployee: boolean,
    phase: EmployeeAssignmentCoercivePhase,
): boolean {
    if (!isEmployee || !phase) return false;
    return (
        phase === 'absent_declared' ||
        phase === 'investigation_pending' ||
        phase === 'warrant_ui'
    );
}

export function shouldShowEmployeeAssignmentCoerciveBlock(
    isEmployee: boolean,
    phase: EmployeeAssignmentCoercivePhase,
): boolean {
    return employeePhaseUnlocksPersonalCoercive(isEmployee, phase);
}
