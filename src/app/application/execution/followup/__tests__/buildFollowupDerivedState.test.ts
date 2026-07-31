import { describe, expect, it } from 'vitest';
import { buildFollowupDerivedState } from '../buildFollowupDerivedState';
import type { ExecutionFile } from '@/app/types/execution';

function makeExecutionFile(
    overrides: Partial<ExecutionFile> & {
        employee_summons_assignments_by_debtor?: Record<string, unknown>;
    },
): ExecutionFile {
    return {
        id: 'exec-1',
        directorate: 'الكرخ',
        fileNumber: '1',
        fileYear: '2026',
        executionDate: '2026-01-01',
        submissionDate: '2026-01-01',
        claimType: 'مطالبة مالية',
        documentType: 'حكم',
        documentDate: '2026-01-01',
        creditors: [],
        debtors: [],
        debtAmount: 0,
        currency: 'IQD',
        courtFees: 0,
        directorateFees: 0,
        lawyerFees: 0,
        clientFees: 0,
        executionFee: 0,
        paidDebt: 0,
        paidCourtFees: 0,
        paidDirectorateFees: 0,
        paidClientFees: 0,
        status: 'active',
        isPaused: false,
        timelineEvents: [],
        ...overrides,
    } as unknown as ExecutionFile;
}

describe('buildFollowupDerivedState', () => {
    it('marks memo badge as resolved when executor outcome is approved', () => {
        const result = buildFollowupDerivedState({
            executionData: null,
            primaryDebtorKeyResolved: null,
            unifiedSummonsTargetDebtorKey: null,
            executorDecisionRows: [{ executorOutcome: 'approved' }],
        });

        expect(result.anyExecutorDecisionResolvedForMemoBadge).toBe(true);
    });

    it('resolves employee assignment state and coercive block', () => {
        const executionData = makeExecutionFile({
            employee_summons_assignments_by_debtor: {
                debtor_1: { phase: 'investigation_pending', assignedDebtorKey: 'debtor_1' },
            },
        });

        const result = buildFollowupDerivedState({
            executionData,
            primaryDebtorKeyResolved: 'debtor_1',
            unifiedSummonsTargetDebtorKey: 'debtor_1',
            executorDecisionRows: [],
        });

        expect(result.primaryDebtorTaklifActive).toBe(true);
        expect(result.resolvedEmployeeSummonsAssignment?.phase).toBe('investigation_pending');
        expect(result.showEmployeeAssignmentCoerciveBlock).toBe(true);
    });
});
