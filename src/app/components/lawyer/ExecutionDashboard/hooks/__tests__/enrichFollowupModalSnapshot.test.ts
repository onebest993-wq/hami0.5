import { describe, expect, it } from 'vitest';
import { enrichFollowupModalSnapshot } from '../enrichFollowupModalSnapshot';

describe('enrichFollowupModalSnapshot', () => {
    it('maps modal aliases and lazy tab components for portal', () => {
        const chipRef = { current: null };
        const LazyCoerciveTab = () => null;
        const scope = {
            LazyCoerciveTab,
            allDebtorsUnified: [{ id: 'd1' }],
            assignmentWorkspaceCtx: { activeDebtorKey: 'd1' },
            activeDebtorNoticeScope: { notificationDate: '2024-01-01' },
            kasabTerminationEmphasis: true,
            executionDebtorTabIndex: 1,
            paidDebt: 50_000,
            totalOwed: 200_000,
            followupModalChipTablistRef: chipRef,
        };

        const enriched = enrichFollowupModalSnapshot(scope, {
            followupAssignmentWorkspaceCtx: { activeDebtorKey: 'legacy' },
            modalActiveDebtorNoticeScope: { notificationDate: '2024-06-01' },
            modalKasabTerminationEmphasis: false,
            modalShowEmployeeAssignmentCoerciveBlock: true,
            modalShowPersonalCoerciveFollowupTab: true,
            modalResolvedEmployeeSummonsAssignment: { phase: 'active' },
            followupModalSpecializationEffective: { hideFollowupCoerciveTab: false },
        });

        expect(enriched.CoerciveTab).toBe(LazyCoerciveTab);
        expect(enriched.allDebtorsUnified).toEqual([{ id: 'd1' }]);
        expect(enriched.assignmentWorkspaceCtx).toEqual({ activeDebtorKey: 'legacy' });
        expect(enriched.activeDebtorNoticeScope).toEqual({ notificationDate: '2024-06-01' });
        expect(enriched.kasabTerminationEmphasis).toBe(false);
        expect(enriched.showEmployeeAssignmentCoerciveBlock).toBe(true);
        expect(enriched.showPersonalCoerciveFollowupTab).toBe(true);
        expect(enriched.resolvedEmployeeSummonsAssignment).toEqual({ phase: 'active' });
        expect(enriched.followupSpecialization).toEqual({ hideFollowupCoerciveTab: false });
        expect(enriched.executionDebtorTabIndex).toBe(1);
        expect(enriched.paidDebt).toBe(50_000);
        expect(enriched.totalOwed).toBe(200_000);
        expect(enriched.DebtorFinancialProgressBar).toBeTypeOf('function');
    });

    it('falls back to bundled lazy tab components when scope has no Lazy* keys', () => {
        const enriched = enrichFollowupModalSnapshot({}, {});

        expect(enriched.CoerciveTab).toBeTruthy();
        expect(enriched.PersonalTab).toBeTruthy();
        expect(enriched.SeizureRequestsTab).toBeTruthy();
        expect(enriched.followupSpecialization).toBeTruthy();
    });
});
