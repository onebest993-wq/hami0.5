import { describe, expect, it, beforeEach } from 'vitest';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import {
    applyWaiveInitialAppealForExecution,
    canWaiveFavorableExecutorOutcome,
    canWaiveInitialAppeal,
} from '@/app/utils/waiveInitialAppeal';
import {
    clearDecisionsNamespaceForTests,
    readExecutorDecisionsFromActiveNamespace,
    writeExecutorDecisionsArray,
} from '@/app/utils/executionDecisionsNamespace';

const executionId = 'ex-death-waive-1';
const fileData = {
    id: executionId,
    claimType: 'استحصال دين مالي',
    creditors: [{ name: 'دائن', isClient: true }],
    debtors: [{ name: 'مدين' }],
};

function deathRow(overrides: Partial<Decision> = {}): Decision {
    return {
        id: 'creditor_death_req_d14ca287-d061-4d6d-bad1-090c29197d41',
        title: 'طلب — إحلال الورثة محل الدائن المتوفى',
        body: '',
        date: '2026-07-18',
        requestKind: 'creditor_party_death',
        appealRequestOrigin: 'creditor_side',
        executorOutcome: 'approved',
        appealStatus: 'pending',
        appealBaseBranch: 'after_approval',
        ...overrides,
    };
}

describe('creditor_party_death waive', () => {
    beforeEach(() => {
        clearDecisionsNamespaceForTests(executionId);
    });

    it('approved: creditor agent can seal favorable party-death outcome', () => {
        const row = deathRow();
        expect(canWaiveFavorableExecutorOutcome(row, 'creditor_agent')).toBe(true);
        expect(canWaiveInitialAppeal(row, [row], 'creditor_agent')).toBe(true);
        expect(canWaiveInitialAppeal(row, [row], 'debtor_agent')).toBe(true);
    });

    it('rejected: creditor agent can waive and persist', () => {
        const row = deathRow({
            executorOutcome: 'rejected',
            appealBaseBranch: 'after_rejection',
        });
        expect(canWaiveInitialAppeal(row, [row], 'creditor_agent')).toBe(true);
        writeExecutorDecisionsArray(executionId, [row as unknown as Record<string, unknown>], fileData);
        const result = applyWaiveInitialAppealForExecution({
            executionId,
            decisionId: row.id,
            appealPerspective: 'creditor_agent',
        });
        expect(result.ok).toBe(true);
        const stored = readExecutorDecisionsFromActiveNamespace(executionId, fileData) as Decision[];
        expect(stored.find((d) => d.id === row.id)?.noAppealChosen).toBe(true);
        expect(stored.find((d) => d.id === row.id)?.isArchived).toBe(true);
    });

    it('approved: creditor agent waive persists seal', () => {
        const row = deathRow();
        writeExecutorDecisionsArray(executionId, [row as unknown as Record<string, unknown>], fileData);
        const result = applyWaiveInitialAppealForExecution({
            executionId,
            decisionId: row.id,
            appealPerspective: 'creditor_agent',
        });
        expect(result.ok).toBe(true);
        const stored = readExecutorDecisionsFromActiveNamespace(executionId, fileData) as Decision[];
        const merged = stored.find((d) => d.id === row.id);
        expect(merged?.noAppealChosen).toBe(true);
        expect(merged?.appealStatus).toBe('final');
        expect(merged?.isArchived).toBe(true);
    });
});
