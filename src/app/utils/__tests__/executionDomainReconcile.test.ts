import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearDecisionsNamespaceForTests,
    readExecutorDecisionsFromActiveNamespace,
    writeExecutorDecisionsArray,
} from '../executionDecisionsNamespace';
import {
    clearDomainReconcileMarker,
    reconcileDomainViolatingDecisions,
} from '../executionDomainReconcile';

describe('executionDomainReconcile', () => {
    const execId = 'exec-reconcile-test';

    beforeEach(() => {
        vi.restoreAllMocks();
        clearDecisionsNamespaceForTests(execId);
        clearDomainReconcileMarker(execId);
    });

    it('does not suppress executor queue rows that carry requestKind', () => {
        const visitationData = {
            id: execId,
            claimType: 'مشاهدة',
            classification: 'أحوال شخصية',
            creditors: [{ name: 'أم', isClient: true }],
            debtors: [{ name: 'أب' }],
        };
        writeExecutorDecisionsArray(execId, [
            {
                id: 'sz-1',
                requestKind: 'seizure',
                appealRequestOrigin: 'creditor_side',
                executorOutcome: 'pending',
                title: 'حجز راتب',
            },
            {
                id: 'exec-1',
                appealRequestOrigin: 'executor_side',
                manualExecutorLedgerEntry: false,
                title: 'قرار منفذ',
            },
        ], visitationData);

        const result = reconcileDomainViolatingDecisions(execId, visitationData);

        expect(result.suppressed).toBe(0);
        const stored = readExecutorDecisionsFromActiveNamespace(execId, visitationData) as Array<
            Record<string, unknown>
        >;
        const seizure = stored.find((r) => r.id === 'sz-1');
        const executor = stored.find((r) => r.id === 'exec-1');
        expect(seizure?.domainIsolationSuppressed).toBeUndefined();
        expect(seizure?.isArchived).toBeUndefined();
        expect(executor?.domainIsolationSuppressed).toBeUndefined();
    });

    it('does not cascade-suppress appeal copies when hub row has requestKind', () => {
        const matwaaData = { id: execId, claimType: 'مطاوعة' };
        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'hub',
                    requestKind: 'seizure',
                    appealRequestOrigin: 'creditor_side',
                    executorOutcome: 'approved',
                },
                {
                    id: 'appeal',
                    appealSourceDecisionId: 'hub',
                    appealStatus: 'tadhallum_filed',
                },
            ],
            matwaaData
        );

        const result = reconcileDomainViolatingDecisions(execId, matwaaData);

        expect(result.suppressed).toBe(0);
        const stored = readExecutorDecisionsFromActiveNamespace(execId, matwaaData) as Array<
            Record<string, unknown>
        >;
        expect(stored.every((r) => r.domainIsolationSuppressed !== true)).toBe(true);
    });

    it('skips when signature unchanged after no suppressions', () => {
        const data = { id: execId, claimType: 'مشاهدة', debtors: [{ name: 'x' }] };
        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'sz-2',
                    requestKind: 'seizure',
                    appealRequestOrigin: 'creditor_side',
                    executorOutcome: 'pending',
                },
            ],
            data
        );

        const first = reconcileDomainViolatingDecisions(execId, data);
        expect(first.suppressed).toBe(0);

        const second = reconcileDomainViolatingDecisions(execId, data);
        expect(second.skipped).toBe(true);
        expect(second.suppressed).toBe(0);
    });

    it('resolveFollowupFlagsFromExecution matches domain context flags', async () => {
        const { resolveFollowupFlagsFromExecution, resolveExecutionDomainContext } = await import(
            '../executionDomainIsolation'
        );
        const data = {
            id: 'exec-flags',
            claimType: 'استحصال دين مالي',
            debtors: [{ name: 'مدين', occupation: 'موظف' }],
        };
        const ctx = resolveExecutionDomainContext(data, 'exec-flags');
        const flags = resolveFollowupFlagsFromExecution(data, 'exec-flags');
        expect(flags).toEqual(ctx.flags);
        expect(flags.isFinancialDebtCollection).toBe(true);
    });
});
