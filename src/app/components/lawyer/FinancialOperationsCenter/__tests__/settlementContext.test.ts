import { describe, expect, it } from 'vitest';
import { resolveSettlementContext } from '../settlementContext';
import {
    simulateMarkSettlementPaid,
    simulateRegisterSettlement,
    simulateSettlementBreachCancel,
} from '../settlementLifecycle';
import { resolveSettlementUxTier } from '../settlementUxMatrix';
import { emptyStore, resolveRemainingBalanceFromFinancialCenter, sumDebtPaidFromLedgerPayments } from '../utils';
import { resolveAmountGuarantorRequestVisible } from '../settlementGuarantorGate';

const LEDGER_PARAMS = {
    principal_amount: 5_000_000,
    courtOrderedFeesSafe: 0,
    evictionLawyerFeeWaivedAtIntake: false,
    executionExpensesSumSafe: 0,
    evictionCaseExpensesSumSafe: 0,
    seedLawyerId: '',
    seedExpenseId: '',
};

function baseContext(overrides: Partial<Parameters<typeof resolveSettlementContext>[0]> = {}) {
    return resolveSettlementContext({
        settlementUxTier: 'primary',
        remainingUnified: 5_000_000,
        completed: false,
        panelOpen: false,
        showSettlementForm: false,
        pendingSettlement: null,
        pendingSettlementDueYmd: '',
        currentYmd: '2026-06-04',
        isFinancialDebtCollectionClaim: true,
        financialCenterTotalIqd: 5_000_000,
        settlementBreachTriggeredAt: null,
        ...overrides,
    });
}

describe('settlementContext', () => {
    it('hides entry and panel when remaining is zero', () => {
        const ctx = baseContext({ remainingUnified: 0, settlementUxTier: 'hidden' });
        expect(ctx.showSettlementEntry).toBe(false);
        expect(ctx.showSettlementPanel).toBe(false);
        expect(ctx.showAmountGuarantorRequest).toBe(false);
    });

    it('hides settlement entry when salary seizure path is active', () => {
        expect(baseContext({ salarySeizureActive: true }).showSettlementEntry).toBe(false);
        expect(baseContext({ salarySeizureActive: true }).showSettlementPanel).toBe(false);
    });

    it('hides settlement entry when debtor is deceased', () => {
        const ctx = baseContext({ activeDebtorIsDeceased: true });
        expect(ctx.showSettlementEntry).toBe(false);
        expect(ctx.showSettlementEntryButton).toBe(false);
        expect(ctx.showSettlementPanel).toBe(false);
    });

    it('shows entry triggers by tier but panel only when explicitly open', () => {
        expect(baseContext({ settlementUxTier: 'buried', panelOpen: false }).showSettlementEntry).toBe(true);
        expect(baseContext({ settlementUxTier: 'buried', panelOpen: false }).showSettlementPanel).toBe(
            false
        );
        expect(
            baseContext({
                settlementUxTier: 'secondary',
                panelOpen: true,
                showSettlementForm: true,
            }).showNewSettlementForm
        ).toBe(true);
    });

    it('hides panel when closed and no pending settlement', () => {
        const ctx = baseContext({
            settlementUxTier: 'secondary',
            panelOpen: false,
            pendingSettlement: null,
        });
        expect(ctx.showSettlementPanel).toBe(false);
        expect(ctx.showSettlementEntryButton).toBe(true);
    });

    it('shows panel and hides entry button while pending settlement exists', () => {
        const ctx = baseContext({
            settlementUxTier: 'secondary',
            panelOpen: false,
            pendingSettlement: {
                id: 'stl-1',
                amount: 900_000,
                dueDate: '2026-06-10',
                createdAt: '2026-06-01T00:00:00.000Z',
            },
            pendingSettlementDueYmd: '2026-06-10',
        });
        expect(ctx.showSettlementPanel).toBe(true);
        expect(ctx.showSettlementEntryButton).toBe(false);
        expect(ctx.showPendingSummary).toBe(true);
        expect(ctx.showSettlementDueActions).toBe(false);
        expect(ctx.showAmountGuarantorRequest).toBe(false);
    });

    it('shows pending summary when panel is open', () => {
        const ctx = baseContext({
            settlementUxTier: 'secondary',
            panelOpen: true,
            pendingSettlement: {
                id: 'stl-1',
                amount: 900_000,
                dueDate: '2026-06-10',
                createdAt: '2026-06-01T00:00:00.000Z',
            },
            pendingSettlementDueYmd: '2026-06-10',
        });
        expect(ctx.showSettlementPanel).toBe(true);
        expect(ctx.showSettlementEntryButton).toBe(false);
        expect(ctx.showPendingSummary).toBe(true);
        expect(ctx.showSettlementDueActions).toBe(false);
        expect(ctx.showAmountGuarantorRequest).toBe(false);
    });

    it('shows due actions on due date and hides guarantor until breach cancel', () => {
        const pending = {
            id: 'stl-2',
            amount: 500_000,
            dueDate: '2026-06-04',
            createdAt: '2026-06-01T00:00:00.000Z',
        };
        const ctx = baseContext({
            panelOpen: true,
            pendingSettlement: pending,
            pendingSettlementDueYmd: '2026-06-04',
            currentYmd: '2026-06-04',
        });
        expect(ctx.showSettlementDueActions).toBe(true);
        expect(ctx.showSettlementEntryButton).toBe(false);
        expect(ctx.pendingSettlementDuePhase).toBe('due');
        expect(ctx.showAmountGuarantorRequest).toBe(false);
    });

    it('reacts to remaining tier changes for entry placement', () => {
        expect(resolveSettlementUxTier(4_000_000)).toBe('primary');
        expect(baseContext({ remainingUnified: 4_000_000, settlementUxTier: 'primary' }).showSettlementEntry).toBe(
            true
        );
        expect(resolveSettlementUxTier(2_000_000)).toBe('secondary');
        expect(
            baseContext({ remainingUnified: 2_000_000, settlementUxTier: 'secondary' }).showSettlementEntry
        ).toBe(true);
        expect(resolveSettlementUxTier(200_000)).toBe('buried');
        expect(baseContext({ remainingUnified: 200_000, settlementUxTier: 'buried' }).showSettlementEntry).toBe(
            true
        );
    });

    it('canRegisterSettlementAmount respects remaining unified', () => {
        const ctx = baseContext({ remainingUnified: 1_000_000 });
        expect(ctx.canRegisterSettlementAmount(500_000)).toBe(true);
        expect(ctx.canRegisterSettlementAmount(1_000_001)).toBe(false);
        expect(ctx.canRegisterSettlementAmount(0)).toBe(false);
    });
});

describe('settlement lifecycle sync with ledger remaining', () => {
    it('register then pay settlement updates remaining consistently', () => {
        let store = emptyStore();
        const remainingStart = 5_000_000;

        const reg = simulateRegisterSettlement({
            store,
            amount: 900_000,
            dueDate: '2026-06-04',
            remainingUnified: remainingStart,
        });
        expect(reg.ok).toBe(true);
        if (!reg.ok) return;
        store = reg.store;

        const paid = simulateMarkSettlementPaid({
            store,
            remainingUnified: remainingStart,
            currentYmd: '2026-06-04',
        });
        expect(paid.ok).toBe(true);
        if (!paid.ok) return;

        expect(paid.paidAmount).toBe(900_000);
        expect(paid.remainingAfter).toBe(4_100_000);
        expect(sumDebtPaidFromLedgerPayments(paid.store)).toBe(900_000);

        const remainingFromLedger = resolveRemainingBalanceFromFinancialCenter({
            executionId: 'exec-test',
            ledgerParams: LEDGER_PARAMS,
            readRaw: () => paid.store,
        });
        expect(remainingFromLedger).toBe(4_100_000);
    });

    it('breach cancel activates guarantor without changing debt paid', () => {
        let store = emptyStore();
        store = {
            ...store,
            pendingSettlement: {
                id: 'stl-b',
                amount: 750_000,
                dueDate: '2026-06-04',
                createdAt: '2026-05-01T00:00:00.000Z',
            },
        };
        const breach = simulateSettlementBreachCancel({ store, atIso: '2026-06-04T13:00:00.000Z' });
        expect(breach.ok).toBe(true);
        if (!breach.ok) return;

        expect(breach.store.pendingSettlement).toBeNull();
        expect(breach.store.settlementBreachTriggeredAt).toBeTruthy();
        expect(sumDebtPaidFromLedgerPayments(breach.store)).toBe(0);

        expect(
            resolveAmountGuarantorRequestVisible({
                isFinancialDebtCollectionClaim: true,
                financialCenterTotalIqd: 5_000_000,
                settlementBreachTriggeredAt: breach.store.settlementBreachTriggeredAt,
                pendingSettlement: breach.store.pendingSettlement,
            })
        ).toBe(true);

        const remainingFromLedger = resolveRemainingBalanceFromFinancialCenter({
            executionId: 'exec-test',
            ledgerParams: LEDGER_PARAMS,
            readRaw: () => breach.store,
        });
        expect(remainingFromLedger).toBe(5_000_000);
    });

    it('new settlement after breach clears guarantor gate back to standby', () => {
        const breachStore = simulateSettlementBreachCancel({
            store: {
                ...emptyStore(),
                settlementBreachTriggeredAt: '2026-06-04T12:00:00.000Z',
            },
            atIso: '2026-06-04T12:00:00.000Z',
        });
        expect(breachStore.ok).toBe(false);

        let store = emptyStore();
        store = {
            ...store,
            settlementBreachTriggeredAt: '2026-06-04T12:00:00.000Z',
        };
        const reg = simulateRegisterSettlement({
            store,
            amount: 1_000_000,
            dueDate: '2026-07-01',
            remainingUnified: 5_000_000,
        });
        expect(reg.ok).toBe(true);
        if (!reg.ok) return;
        expect(reg.store.settlementBreachTriggeredAt).toBeNull();
        expect(
            resolveSettlementContext({
                settlementUxTier: 'primary',
                remainingUnified: 5_000_000,
                completed: false,
                panelOpen: false,
                showSettlementForm: false,
                pendingSettlement: reg.store.pendingSettlement,
                pendingSettlementDueYmd: '2026-07-01',
                currentYmd: '2026-06-04',
                isFinancialDebtCollectionClaim: true,
                financialCenterTotalIqd: 5_000_000,
                settlementBreachTriggeredAt: reg.store.settlementBreachTriggeredAt,
            }).showAmountGuarantorRequest
        ).toBe(false);
    });
});
