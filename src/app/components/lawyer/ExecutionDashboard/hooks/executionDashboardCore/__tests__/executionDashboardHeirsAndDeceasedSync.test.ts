import { describe, expect, it } from 'vitest';
import {
    buildDeceasedDebtorCoerciveResetPatch,
    deceasedDebtorHasStaleCoerciveState,
    mapExecutorOutcomeToHeirInvestigationStatus,
    mergeHeirInvestigationDecisionStatuses,
    shouldBackfillEvictionLawyerFeeRequested,
} from '../executionDashboardHeirsAndDeceasedSync';
import { resolveSeizureActionTypeFromSubtype } from '../executionDashboardSeizureRequestCreated';

describe('executionDashboardHeirsAndDeceasedSync', () => {
    it('maps executor outcomes for heir investigation', () => {
        expect(mapExecutorOutcomeToHeirInvestigationStatus('approved')).toBe('approved');
        expect(mapExecutorOutcomeToHeirInvestigationStatus('rejected')).toBe('rejected');
        expect(mapExecutorOutcomeToHeirInvestigationStatus('pending')).toBe('pending');
    });

    it('merges heir investigation status when decision outcome changes', () => {
        const byHeir = {
            h1: { investigationDecisionId: 'd1', investigationDecisionStatus: 'pending' },
        };
        const rows = [{ id: 'd1', executorOutcome: 'approved' }];
        const next = mergeHeirInvestigationDecisionStatuses(byHeir, rows as any);
        expect(next?.h1.investigationDecisionStatus).toBe('approved');
    });

    it('detects stale coercive state for deceased debtor', () => {
        expect(
            deceasedDebtorHasStaleCoerciveState({
                activeCoerciveActionsLength: 0,
                debtorArrested: false,
                investigationPathDebtorPresent: false,
                forcedBringInPersonalOutcome: null,
                forcedBringInPersonalFollowupLogged: false,
            }),
        ).toBe(false);
        expect(
            deceasedDebtorHasStaleCoerciveState({
                activeCoerciveActionsLength: 1,
                debtorArrested: false,
                investigationPathDebtorPresent: false,
                forcedBringInPersonalOutcome: null,
                forcedBringInPersonalFollowupLogged: false,
            }),
        ).toBe(true);
        expect(buildDeceasedDebtorCoerciveResetPatch().debtorArrested).toBe(false);
    });

    it('gates eviction lawyer fee backfill', () => {
        expect(
            shouldBackfillEvictionLawyerFeeRequested({
                isEvictionExecutionModule: true,
                executionId: 'ex1',
                alreadyRequested: false,
                hasApprovedPayout: true,
                sessionMarker: null,
            }),
        ).toBe(true);
    });
});

describe('executionDashboardSeizureRequestCreated', () => {
    it('skips property subtype for inline draft listener', () => {
        expect(resolveSeizureActionTypeFromSubtype('property')).toBe('skip');
        expect(resolveSeizureActionTypeFromSubtype('salary')).toBe('salary');
    });
});
