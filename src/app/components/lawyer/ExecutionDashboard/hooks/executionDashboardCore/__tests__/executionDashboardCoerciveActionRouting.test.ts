import { describe, expect, it } from 'vitest';
import {
    findAwaitingSeizureDecisionId,
    inferSeizureSubtypeFromRow,
    isApprovedExecutorSeizureDecision,
    routeCoerciveAction,
} from '../executionDashboardCoerciveActionRouting';

describe('executionDashboardCoerciveActionRouting', () => {
    it('infers seizure subtype from title when missing on row', () => {
        expect(inferSeizureSubtypeFromRow({ title: 'حجز راتب المدين' })).toBe('salary');
        expect(inferSeizureSubtypeFromRow({ title: 'حجز عقار' })).toBe('property');
        expect(inferSeizureSubtypeFromRow({ title: 'حجز مركبة منقولة' })).toBe('movable_auction');
    });

    it('detects approved seizure decisions including appeal overturn', () => {
        expect(isApprovedExecutorSeizureDecision({ executorOutcome: 'approved' })).toBe(true);
        expect(
            isApprovedExecutorSeizureDecision({
                executorOutcome: 'rejected',
                appealWorkflowState: 'REVOKED_BY_APPEAL',
            }),
        ).toBe(true);
        expect(isApprovedExecutorSeizureDecision({ executorOutcome: 'rejected' })).toBe(false);
    });

    it('finds awaiting salary seizure decision without saved request', () => {
        const id = findAwaitingSeizureDecisionId('salary', [
            {
                id: 'd-1',
                requestKind: 'seizure',
                seizureSubtype: 'salary',
                executorOutcome: 'approved',
            },
            {
                id: 'd-2',
                requestKind: 'seizure',
                seizureSubtype: 'salary',
                executorOutcome: 'approved',
                seizureRequestSavedAt: '2026-01-01',
            },
        ]);
        expect(id).toBe('d-1');
    });

    it('maps vehicle action to movable_auction subtype', () => {
        const id = findAwaitingSeizureDecisionId('vehicle', [
            {
                id: 'mv-1',
                requestKind: 'seizure',
                seizureSubtype: 'movable_auction',
                executorOutcome: 'approved',
            },
        ]);
        expect(id).toBe('mv-1');
    });

    it('blocks coercive action when dossier legally paused', () => {
        const route = routeCoerciveAction({
            actionType: 'property',
            coerciveUiLocked: true,
            activeDebtorIsEmployee: false,
            awaitingSeizureDecisionId: null,
            allDebtorsUnified: [{ id: '1', name: 'أ' }],
            executionDebtorTabIndex: 0,
            isSolidaryLiability: false,
            resolveDebtorSolidaryFlag: () => false,
            fallbackDebtorName: 'المدين',
        });
        expect(route).toMatchObject({ kind: 'toast', type: 'warning' });
    });

    it('redirects to followup when approved seizure awaits data entry', () => {
        const route = routeCoerciveAction({
            actionType: 'salary',
            coerciveUiLocked: false,
            activeDebtorIsEmployee: true,
            awaitingSeizureDecisionId: 'dec-99',
            allDebtorsUnified: [{ id: '1', name: 'أ' }],
            executionDebtorTabIndex: 0,
            isSolidaryLiability: false,
            resolveDebtorSolidaryFlag: () => false,
            fallbackDebtorName: 'المدين',
        });
        expect(route).toEqual({ kind: 'redirect_followup', decisionId: 'dec-99' });
    });

    it('picks solidary debtor when multiple debtors', () => {
        const route = routeCoerciveAction({
            actionType: 'property',
            coerciveUiLocked: false,
            activeDebtorIsEmployee: false,
            awaitingSeizureDecisionId: null,
            allDebtorsUnified: [
                { id: 'a', name: 'مدين أ', cleared: true },
                { id: 'b', name: 'مدين ب' },
            ],
            executionDebtorTabIndex: 0,
            isSolidaryLiability: true,
            resolveDebtorSolidaryFlag: () => true,
            fallbackDebtorName: 'المدين',
        });
        expect(route).toEqual({ kind: 'save', subject: { id: 'b', name: 'مدين ب' } });
    });
});
