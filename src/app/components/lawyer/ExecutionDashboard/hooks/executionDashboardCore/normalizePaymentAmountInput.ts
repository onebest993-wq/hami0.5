import { parseAmount } from '@/app/utils/execution/amountInput';

/** مبلغ دفعة — تقريب لأقرب دينار بعد توحيد الأرقام العربية/الفواصل */
export function normalizePaymentAmountInput(raw: string): number {
    const n = parseAmount(raw);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}
