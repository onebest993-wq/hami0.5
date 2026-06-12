import { describe, expect, it, beforeEach } from 'vitest';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import { applyLawyerCassationEntryForExecution } from '@/app/utils/lawyerCassationEntry';
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

describe('applyLawyerCassationEntryForExecution', () => {
    const executionId = 'ex-cassation-1';
    const financialData = {
        id: executionId,
        claimType: 'استحصال دين مالي',
        creditors: [{ name: 'دائن', isClient: true }],
        debtors: [{ name: 'مدين' }],
    };

    beforeEach(() => {
        clearDecisionsNamespaceForTests(executionId);
    });

    it('files lawyer cassation and creates appeal copy row', () => {
        const row = baseDecision();
        writeExecutorDecisionsArray(executionId, [row as unknown as Record<string, unknown>], financialData);
        const result = applyLawyerCassationEntryForExecution({
            executionId,
            decisionId: row.id,
            appendTimeline: false,
        });
        expect(result.ok).toBe(true);
        expect(result.scrollDecisionId).toBeTruthy();
        expect(result.scrollDecisionId).not.toBe(row.id);

        const stored = readExecutorDecisionsFromActiveNamespace(executionId, financialData) as Decision[];
        const original = stored.find((d) => d.id === row.id);
        const copy = stored.find((d) => d.id === result.scrollDecisionId);
        expect(original?.activeAppealCopyId).toBe(result.scrollDecisionId);
        expect(copy?.appealStatus).toBe('tamyeez_filed');
        expect(copy?.appealMethod).toBe('tamyeez');
        expect(copy?.appealSourceDecisionId).toBe(row.id);
    });

    it('rejects when lawyer cassation window is not open', () => {
        const row = baseDecision({ awaitingCassationEntryBy: null });
        writeExecutorDecisionsArray(executionId, [row as unknown as Record<string, unknown>], financialData);
        const result = applyLawyerCassationEntryForExecution({
            executionId,
            decisionId: row.id,
            appendTimeline: false,
        });
        expect(result.ok).toBe(false);
    });
});
