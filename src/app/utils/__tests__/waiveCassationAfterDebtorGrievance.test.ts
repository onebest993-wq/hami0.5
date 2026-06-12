import { describe, expect, it, beforeEach } from 'vitest';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import {
    canWaiveCassationAfterDebtorGrievance,
    canWaiveLawyerCassationAfterGrievanceRejected,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import {
    clearDecisionsNamespaceForTests,
    readExecutorDecisionsFromActiveNamespace,
    writeExecutorDecisionsArray,
} from '@/app/utils/executionDecisionsNamespace';

function baseDecision(overrides: Partial<Decision> = {}): Decision {
    return {
        id: 'personal_coercive_arrest_1',
        title: 'طلب مفاتحة تحقيق',
        body: '',
        date: '2026-06-01',
        requestKind: 'personal_coercive',
        personalCoerciveSubtype: 'arrest_warrant_investigation',
        appealRequestOrigin: 'creditor_side',
        executorOutcome: 'approved',
        appealResult: 'قبول التظلم',
        appealStatus: 'pending',
        awaitingCassationEntryBy: 'lawyer',
        appealPhase: 'grievance',
        ...overrides,
    };
}

describe('waiveCassationAfterDebtorGrievance', () => {
    const executionId = 'ex-waive-1';
    const financialData = {
        id: executionId,
        claimType: 'استحصال دين مالي',
        creditors: [{ name: 'دائن', isClient: true }],
        debtors: [{ name: 'مدين' }],
    };

    beforeEach(() => {
        clearDecisionsNamespaceForTests(executionId);
    });

    it('allows waive when grievance accepted awaiting lawyer cassation without appealActor', () => {
        const row = baseDecision({ appealActor: undefined });
        expect(canWaiveCassationAfterDebtorGrievance(row, [row])).toBe(true);
    });

    it('finalizes grievance without keeping executor approval', () => {
        const row = baseDecision();
        writeExecutorDecisionsArray(executionId, [row as unknown as Record<string, unknown>], financialData);
        const result = applyWaiveCassationAfterDebtorGrievanceForExecution({
            executionId,
            decisionId: row.id,
        });
        expect(result.ok).toBe(true);
        const stored = readExecutorDecisionsFromActiveNamespace(executionId, financialData) as Decision[];
        const merged = stored.find((d) => d.id === row.id);
        expect(merged?.appealStatus).toBe('final');
        expect(merged?.noAppealChosen).toBe(true);
        expect(merged?.executorOutcome).toBe('rejected');
        expect(merged?.appealResult).toBe('قبول التظلم');
        expect(merged?.requestCycleSuperseded).toBe(true);
        expect(merged?.isArchived).toBe(true);
    });

    it('allows waive on executor-order forced bring after grievance accepted', () => {
        const row = baseDecision({
            id: 'forced_bring_1',
            title: 'طلب إحضار جبري',
            personalCoerciveSubtype: 'forced_bring_in',
            appealRequestOrigin: 'executor_side',
            activatedByExecutorOrder: true,
            appealResult: 'قبول التظلم',
            appealStatus: 'pending',
            awaitingCassationEntryBy: 'lawyer',
        });
        expect(canWaiveCassationAfterDebtorGrievance(row, [row])).toBe(true);
        writeExecutorDecisionsArray(executionId, [row as unknown as Record<string, unknown>], financialData);
        const result = applyWaiveCassationAfterDebtorGrievanceForExecution({
            executionId,
            decisionId: row.id,
        });
        expect(result.ok).toBe(true);
    });

    it('allows waive after grievance rejected awaiting lawyer cassation', () => {
        const row = baseDecision({
            executorOutcome: 'rejected',
            appealBaseBranch: 'after_rejection',
            appealResult: 'رد التظلم',
            appealActor: 'lawyer',
            grievanceRejectedAwaitingTamyeez: true,
            awaitingCassationEntryBy: 'lawyer',
        });
        expect(canWaiveLawyerCassationAfterGrievanceRejected(row, [row])).toBe(true);
        writeExecutorDecisionsArray(executionId, [row as unknown as Record<string, unknown>], financialData);
        const result = applyWaiveCassationAfterDebtorGrievanceForExecution({
            executionId,
            decisionId: row.id,
        });
        expect(result.ok).toBe(true);
        const stored = readExecutorDecisionsFromActiveNamespace(executionId, financialData) as Decision[];
        const merged = stored.find((d) => d.id === row.id);
        expect(merged?.appealStatus).toBe('final');
        expect(merged?.noAppealChosen).toBe(true);
        expect(merged?.appealWorkflowState).toBe('FINAL_REJECTED');
    });
});
