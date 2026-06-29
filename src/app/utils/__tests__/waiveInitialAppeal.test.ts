import { describe, expect, it, beforeEach } from 'vitest';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import {
    applyWaiveInitialAppealForExecution,
    canWaiveInitialAppeal,
} from '@/app/utils/waiveInitialAppeal';
import { isExecutorRequestAppealCycleSuperseded } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    clearDecisionsNamespaceForTests,
    readExecutorDecisionsFromActiveNamespace,
    writeExecutorDecisionsArray,
} from '@/app/utils/executionDecisionsNamespace';

function rejectedEviction(overrides: Partial<Decision> = {}): Decision {
    return {
        id: 'eviction_req_waive_1',
        title: 'طلب تحديد موعد الخروج الميداني',
        body: '',
        date: '2026-06-01',
        requestKind: 'eviction_procedure',
        appealRequestOrigin: 'creditor_side',
        executorOutcome: 'rejected',
        appealStatus: 'pending',
        appealBaseBranch: 'after_rejection',
        ...overrides,
    };
}

describe('waiveInitialAppeal', () => {
    const executionId = 'ex-waive-init-1';
    const evictionData = {
        id: executionId,
        claimType: 'إخلاء',
        creditors: [{ name: 'مالك', isClient: true }],
        debtors: [{ name: 'مستأجر' }],
    };

    beforeEach(() => {
        clearDecisionsNamespaceForTests(executionId);
    });

    it('allows waive when lawyer is harmed after executor rejection', () => {
        const row = rejectedEviction();
        expect(canWaiveInitialAppeal(row, [row])).toBe(true);
        expect(canWaiveInitialAppeal(row, [row], 'debtor_agent')).toBe(false);
    });

    it('allows debtor agent waive when executor approved creditor request against client', () => {
        const row: Decision = {
            id: 'special_followup_waive_1',
            title: 'حجز راتب',
            body: '',
            date: '2026-06-11',
            requestKind: 'special_followup',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
            appealStatus: 'pending',
            appealBaseBranch: 'after_approval',
        };
        expect(canWaiveInitialAppeal(row, [row], 'debtor_agent')).toBe(true);
        expect(canWaiveInitialAppeal(row, [row], 'creditor_agent')).toBe(false);
    });

    it('allows waive on rejected guarantor_request (debtor-side origin, follow-up seal)', () => {
        const row: Decision = {
            id: 'guarantor_req_waive_1',
            title: 'طلب إدخال كفيل ضامن',
            body: '',
            date: '2026-06-01',
            requestKind: 'guarantor_request',
            appealRequestOrigin: 'debtor_side',
            executorOutcome: 'rejected',
            appealStatus: 'pending',
        };
        expect(canWaiveInitialAppeal(row, [row])).toBe(true);
    });

    it('does not allow creditor waive when debtor holds appeal right on approved request', () => {
        const row: Decision = {
            id: 'personal_coercive_waive_fav_1',
            title: 'طلب إحضار جبري',
            body: '',
            date: '2026-06-04',
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'forced_bring_in',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'approved',
            appealStatus: 'pending',
        };
        expect(canWaiveInitialAppeal(row, [row], 'creditor_agent')).toBe(false);
        expect(canWaiveInitialAppeal(row, [row], 'debtor_agent')).toBe(true);
    });

    it('allows waive on executor_side decision when lawyer is harmed', () => {
        const row: Decision = {
            id: 'executor_side_waive_1',
            title: 'قرار منفذ',
            body: '',
            date: '2026-06-01',
            appealRequestOrigin: 'executor_side',
            executorOutcome: 'rejected',
            appealStatus: 'pending',
            appealBaseBranch: 'after_rejection',
        };
        expect(canWaiveInitialAppeal(row, [row], 'creditor_agent')).toBe(true);
        expect(canWaiveInitialAppeal(row, [row], 'debtor_agent')).toBe(false);
    });

    it('seals rejected request without filing appeal', () => {
        const row = rejectedEviction();
        writeExecutorDecisionsArray(executionId, [row as unknown as Record<string, unknown>], evictionData);
        const result = applyWaiveInitialAppealForExecution({
            executionId,
            decisionId: row.id,
        });
        expect(result.ok).toBe(true);
        const stored = readExecutorDecisionsFromActiveNamespace(
            executionId,
            evictionData
        ) as Decision[];
        const merged = stored.find((d) => d.id === row.id);
        expect(merged?.noAppealChosen).toBe(true);
        expect(merged?.appealStatus).toBe('final');
        expect(merged?.isArchived).toBe(true);
        expect(isExecutorRequestAppealCycleSuperseded(merged!, [merged!])).toBe(true);
    });
});
