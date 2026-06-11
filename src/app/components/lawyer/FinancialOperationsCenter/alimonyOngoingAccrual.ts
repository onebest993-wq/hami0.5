import {
    diffDaysBetween,
    roundAlimonyAmount,
} from '@/app/components/lawyer/ExecutionCreationView/hooks/useAlimonyCalculator';
import { applySettlementBreachCancellation } from './settlementGuarantorGate';
import type { PendingSettlement, UnifiedLedgerStore } from './types';
import { addMonthsToYmd, extractYmd } from './utils';

export const ONGOING_ALIMONY_DAYS_PER_MONTH = 30;

export function computeOngoingAlimonyDailyRate(monthlyAmount: number): number {
    return Math.max(0, Math.round(Number(monthlyAmount) || 0)) / ONGOING_ALIMONY_DAYS_PER_MONTH;
}

/** احتساب النفقة المستمرة غير المسددة بالأيام (÷ ٣٠) */
export function computeOngoingAlimonyAccrualByDays(
    monthlyAmount: number,
    periodStartYmd: string,
    periodEndYmd: string,
): { billableDays: number; accruedAmount: number } {
    const start = extractYmd(periodStartYmd);
    const end = extractYmd(periodEndYmd);
    if (!start || !end) return { billableDays: 0, accruedAmount: 0 };

    const billableDays = diffDaysBetween(start, end);
    if (billableDays <= 0) return { billableDays: 0, accruedAmount: 0 };

    const accruedAmount = roundAlimonyAmount(
        computeOngoingAlimonyDailyRate(monthlyAmount) * billableDays,
    );
    return { billableDays, accruedAmount };
}

export function resolveSettlementPeriodStartYmd(pending: PendingSettlement): string {
    const explicit = extractYmd(pending.periodStartYmd || '');
    if (explicit) return explicit;

    const due = extractYmd(pending.dueDate);
    if (due) {
        const prevMonth = addMonthsToYmd(due, -1);
        if (prevMonth) return prevMonth;
    }

    return extractYmd(pending.createdAt) || '';
}

export function applyOngoingAlimonyBreachAccrual(args: {
    store: UnifiedLedgerStore;
    pending: PendingSettlement;
    monthlyAmount: number;
    currentYmd: string;
    basePrincipal: number;
    atIso?: string;
}): {
    store: UnifiedLedgerStore;
    accruedAmount: number;
    billableDays: number;
    newPrincipalTotal: number;
    periodStartYmd: string;
    periodEndYmd: string;
} {
    const atIso = args.atIso ?? new Date().toISOString();
    const periodEndYmd = extractYmd(args.currentYmd) || args.currentYmd;
    const lastThrough = extractYmd(args.store.alimonyLastAccrualThroughYmd || '');

    let periodStartYmd = resolveSettlementPeriodStartYmd(args.pending);
    if (lastThrough && periodStartYmd && periodStartYmd < lastThrough) {
        periodStartYmd = lastThrough;
    }

    const monthlyRate = Math.max(
        0,
        Math.round(Number(args.monthlyAmount) || 0),
        Math.round(Number(args.pending.amount) || 0),
    );

    const { billableDays, accruedAmount } = computeOngoingAlimonyAccrualByDays(
        monthlyRate,
        periodStartYmd,
        periodEndYmd,
    );

    const breached = applySettlementBreachCancellation(args.store, atIso);
    const basePrincipal = Math.max(0, Math.round(Number(args.basePrincipal) || 0));
    const newPrincipalTotal = basePrincipal + Math.max(0, accruedAmount);

    return {
        store: {
            ...breached,
            principalSnapshot: newPrincipalTotal > 0 ? newPrincipalTotal : breached.principalSnapshot,
            alimonyLastAccrualThroughYmd: accruedAmount > 0 ? periodEndYmd : breached.alimonyLastAccrualThroughYmd,
        },
        accruedAmount: Math.max(0, accruedAmount),
        billableDays,
        newPrincipalTotal,
        periodStartYmd,
        periodEndYmd,
    };
}
