import { describe, it, expect } from 'vitest';
import {
    type EmployeeSummonsAssignmentsFileSlice,
    buildEmployeeAssignmentPatchForDebtorKey,
    classifyExecutorOutcomeForInvestigationSync,
    findInvestigationPendingEmployeeAssignment,
    getEmployeeAssignmentDebtorChipForDebtorKey,
    getEmployeeAssignmentForDebtorKey,
    mergeInvestigationOutcomesIntoEmployeeAssignments,
} from '@/app/utils/employeeSummonsAssignment';

describe('employeeSummonsAssignment', () => {
    it('classifyExecutorOutcomeForInvestigationSync normalizes casing and spaces', () => {
        expect(classifyExecutorOutcomeForInvestigationSync('  APPROVED  ')).toBe('approved');
        expect(classifyExecutorOutcomeForInvestigationSync('pending')).toBe('pending');
        expect(classifyExecutorOutcomeForInvestigationSync('rejected')).toBe('other');
        expect(classifyExecutorOutcomeForInvestigationSync('alternative')).toBe('approved');
    });

    it('getEmployeeAssignmentDebtorChipForDebtorKey returns label for investigation_pending', () => {
        const file = {
            employee_summons_assignments_by_debtor: {
                d1: {
                    phase: 'investigation_pending' as const,
                    assignedDebtorKey: 'd1',
                    investigationDecisionId: 'x',
                },
            },
        };
        const chip = getEmployeeAssignmentDebtorChipForDebtorKey(file, 'd1', 'primary_debtor');
        expect(chip?.label).toContain('مفاتحة');
        expect(chip?.className).toContain('amber-500/20');
    });

    it('reads legacy assignment for primary key only', () => {
        const file = {
            employee_summons_assignment: { phase: 'active' as const, purpose: 'تسليم' },
        };
        expect(
            getEmployeeAssignmentForDebtorKey(file, 'primary_debtor', 'primary_debtor')
        ).toEqual(expect.objectContaining({ phase: 'active' }));
        expect(getEmployeeAssignmentForDebtorKey(file, 'other-id', 'primary_debtor')).toBeNull();
    });

    it('reads legacy when assignedDebtorKey matches', () => {
        const file = {
            employee_summons_assignment: {
                phase: 'active' as const,
                assignedDebtorKey: 'd-extra',
            },
        };
        expect(getEmployeeAssignmentForDebtorKey(file, 'd-extra', 'primary_debtor')?.phase).toBe('active');
        expect(getEmployeeAssignmentForDebtorKey(file, 'primary_debtor', 'primary_debtor')).toBeNull();
    });

    it('prefers map entry over legacy for the same debtor key', () => {
        const file = {
            employee_summons_assignments_by_debtor: {
                'd-1': { phase: 'warrant_ui' as const, assignedDebtorKey: 'd-1' },
            },
            employee_summons_assignment: { phase: 'active' as const, purpose: 'legacy' },
        };
        expect(getEmployeeAssignmentForDebtorKey(file, 'd-1', 'primary_debtor')?.phase).toBe('warrant_ui');
    });

    it('buildEmployeeAssignmentPatchForDebtorKey removes one debtor and clears legacy field', () => {
        const file = {
            employee_summons_assignments_by_debtor: {
                a: { phase: 'active' as const, assignedDebtorKey: 'a' },
                b: { phase: 'active' as const, assignedDebtorKey: 'b' },
            },
        };
        const p = buildEmployeeAssignmentPatchForDebtorKey(file, 'a', null, 'primary_debtor');
        expect(p.employee_summons_assignment).toBeNull();
        expect(Object.keys(p.employee_summons_assignments_by_debtor).sort()).toEqual(['b']);
    });

    it('findInvestigationPendingEmployeeAssignment resolves from map', () => {
        const file = {
            employee_summons_assignments_by_debtor: {
                x: {
                    phase: 'investigation_pending' as const,
                    investigationDecisionId: 'dec-1',
                    assignedDebtorKey: 'x',
                },
            },
        };
        const hit = findInvestigationPendingEmployeeAssignment(file, 'primary_debtor');
        expect(hit?.debtorKey).toBe('x');
        expect(hit?.state.investigationDecisionId).toBe('dec-1');
    });

    it('getEmployeeAssignmentForDebtorKey ignores map entry without phase', () => {
        const file = {
            employee_summons_assignments_by_debtor: { bad: {} },
        } as unknown as EmployeeSummonsAssignmentsFileSlice;
        expect(getEmployeeAssignmentForDebtorKey(file, 'bad', 'primary_debtor')).toBeNull();
    });

    it('mergeInvestigationOutcomesIntoEmployeeAssignments updates multiple debtors in one patch', () => {
        const file = {
            employee_summons_assignments_by_debtor: {
                a: {
                    phase: 'investigation_pending' as const,
                    investigationDecisionId: 'd-approve',
                    assignedDebtorKey: 'a',
                },
                b: {
                    phase: 'investigation_pending' as const,
                    investigationDecisionId: 'd-reject',
                    assignedDebtorKey: 'b',
                },
            },
        };
        const rows = [
            { id: 'd-approve', executorOutcome: 'approved' },
            { id: 'd-reject', executorOutcome: 'rejected' },
        ];
        const out = mergeInvestigationOutcomesIntoEmployeeAssignments(file, 'primary_debtor', rows);
        expect(out).not.toBeNull();
        expect(out!.approvedCount).toBe(1);
        expect(out!.rejectedCount).toBe(1);
        expect(out!.patch.employee_summons_assignments_by_debtor.a?.phase).toBe('warrant_ui');
        expect(out!.patch.employee_summons_assignments_by_debtor.b?.phase).toBe('absent_declared');
    });

    it('mergeInvestigationOutcomesIntoEmployeeAssignments treats executor alternative as approval', () => {
        const file = {
            employee_summons_assignments_by_debtor: {
                a: {
                    phase: 'investigation_pending' as const,
                    investigationDecisionId: 'd-alt',
                    assignedDebtorKey: 'a',
                },
            },
        };
        const rows = [{ id: 'd-alt', executorOutcome: 'alternative' as const }];
        const out = mergeInvestigationOutcomesIntoEmployeeAssignments(file, 'primary_debtor', rows);
        expect(out).not.toBeNull();
        expect(out!.approvedCount).toBe(1);
        expect(out!.patch.employee_summons_assignments_by_debtor.a?.phase).toBe('warrant_ui');
    });
});
