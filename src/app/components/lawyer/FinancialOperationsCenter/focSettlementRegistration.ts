import type { PendingSettlement } from './types';
import { addMonthsToYmd, extractYmd } from './utils';

export type SettlementRegistrationValidation =
    | { ok: true; amount: number; dueDate: string }
    | { ok: false; reason: string };

export function validateSettlementRegistration(args: {
    amountRaw: string;
    dueDate: string;
    remainingUnified: number;
    isAlimonyClaim: boolean;
    ongoingMonthlyAlimonyEffective: number;
    parseAmount: (raw: string) => number;
    invalidPositiveAmountMessage: (label: string) => string;
}): SettlementRegistrationValidation {
    const amt = args.parseAmount(args.amountRaw);
    if (!Number.isFinite(amt) || amt <= 0) {
        return { ok: false, reason: args.invalidPositiveAmountMessage('مبلغ التسوية') };
    }
    if (
        amt > args.remainingUnified &&
        !(args.isAlimonyClaim && args.ongoingMonthlyAlimonyEffective > 0)
    ) {
        return {
            ok: false,
            reason: `لا يمكن اعتماد تسوية تتجاوز المبلغ المتبقي. المتبقي الحالي: ${args.remainingUnified.toLocaleString('ar-IQ')} د.ع`,
        };
    }
    const dueDate = args.dueDate.trim();
    if (!dueDate) {
        return { ok: false, reason: 'يرجى تحديد تاريخ دفع التسوية.' };
    }
    return { ok: true, amount: amt, dueDate };
}

export function buildPendingSettlementRow(args: {
    amount: number;
    dueDate: string;
    isAlimonyClaim: boolean;
    ongoingMonthlyAlimonyEffective: number;
    atIso?: string;
    idPrefix?: string;
}): PendingSettlement {
    const dueDate = args.dueDate.trim();
    const periodStartYmd = addMonthsToYmd(dueDate, -1) || extractYmd(args.atIso ?? new Date().toISOString());
    const tracksOngoingAlimony = args.isAlimonyClaim && args.ongoingMonthlyAlimonyEffective > 0;
    return {
        id: `${args.idPrefix ?? 'stl'}-${Date.now()}`,
        amount: args.amount,
        dueDate,
        createdAt: args.atIso ?? new Date().toISOString(),
        periodStartYmd,
        tracksOngoingAlimony,
    };
}
