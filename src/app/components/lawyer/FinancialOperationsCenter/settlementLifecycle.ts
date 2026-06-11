import type { LocalPaymentRow, PendingSettlement, UnifiedLedgerStore } from './types';
import { applyNewSettlementRegistration, applySettlementBreachCancellation } from './settlementGuarantorGate';
import { addMonthsToYmd, shouldShowSettlementDueActions } from './utils';

export type SettlementLifecycleResult =
    | { ok: true; store: UnifiedLedgerStore; remainingAfter: number; paidAmount: number }
    | { ok: false; reason: string };

/** محاكاة «تم التسديد» — لمزامنة المتبقي مع الوعاء */
export function simulateMarkSettlementPaid(args: {
    store: UnifiedLedgerStore;
    remainingUnified: number;
    currentYmd: string;
    atIso?: string;
}): SettlementLifecycleResult {
    const pending = args.store.pendingSettlement;
    if (!pending) return { ok: false, reason: 'no_pending' };

    const dueYmd = String(pending.dueDate || '').slice(0, 10);
    if (!shouldShowSettlementDueActions(dueYmd, args.currentYmd)) {
        return { ok: false, reason: 'not_due_yet' };
    }

    const remaining = Math.max(0, Math.round(Number(args.remainingUnified) || 0));
    const paidAmount = Math.min(Math.max(0, pending.amount), remaining);
    if (paidAmount <= 0) return { ok: false, reason: 'invalid_amount' };

    const remainingAfter = Math.max(0, remaining - paidAmount);
    const atIso = args.atIso ?? '2026-06-04T12:00:00.000Z';
    const row: LocalPaymentRow = {
        id: `pay-settlement-test-${Date.now()}`,
        amount: paidAmount,
        at: atIso,
        kind: remainingAfter === 0 ? 'full' : 'partial',
        entryType: 'settlement',
        balanceAfter: remainingAfter,
        debtBalanceAfter: remainingAfter,
    };

    const nextPending: PendingSettlement = {
        ...pending,
        id: `stl-${Date.now()}`,
        dueDate: addMonthsToYmd(dueYmd, 1) || pending.dueDate,
        createdAt: atIso,
    };

    return {
        ok: true,
        store: {
            ...args.store,
            payments: [row, ...args.store.payments],
            pendingSettlement: remainingAfter > 0 ? nextPending : null,
            completed: remainingAfter === 0,
            collectionRequestActive:
                remainingAfter === 0 ? false : args.store.collectionRequestActive,
        },
        remainingAfter,
        paidAmount,
    };
}

export function simulateRegisterSettlement(args: {
    store: UnifiedLedgerStore;
    amount: number;
    dueDate: string;
    remainingUnified: number;
    atIso?: string;
}): SettlementLifecycleResult | { ok: true; store: UnifiedLedgerStore } {
    const remaining = Math.max(0, Math.round(Number(args.remainingUnified) || 0));
    const amount = Math.round(Number(args.amount) || 0);
    if (amount <= 0) return { ok: false, reason: 'invalid_amount' };
    if (amount > remaining) return { ok: false, reason: 'exceeds_remaining' };
    if (!String(args.dueDate || '').trim()) return { ok: false, reason: 'missing_due_date' };

    const pending: PendingSettlement = {
        id: `stl-${Date.now()}`,
        amount,
        dueDate: args.dueDate.trim(),
        createdAt: args.atIso ?? new Date().toISOString(),
    };

    return {
        ok: true,
        store: applyNewSettlementRegistration(args.store, pending),
    };
}

export function simulateSettlementBreachCancel(args: {
    store: UnifiedLedgerStore;
    atIso?: string;
}): SettlementLifecycleResult | { ok: true; store: UnifiedLedgerStore } {
    if (!args.store.pendingSettlement) return { ok: false, reason: 'no_pending' };
    return {
        ok: true,
        store: applySettlementBreachCancellation(
            args.store,
            args.atIso ?? new Date().toISOString()
        ),
    };
}
