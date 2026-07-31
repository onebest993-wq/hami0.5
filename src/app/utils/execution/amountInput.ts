/**
 * مبالغ التنفيذ — نواة مشتركة بلا deep-import إلى FOC.
 * `@/app/slices/financial/public` يعيد تصدير نفس النواة.
 */
import {
    formatNumberInput,
    parseAmount,
    formatIqdDisplay,
} from '@/app/utils/execution/amountInputCore';

export { formatNumberInput, parseAmount, formatIqdDisplay };

/** تحويل مبلغ مدخل إلى عدد صحيح (د.ع) */
export function parseExecutionAmountInt(raw: string): number {
    const n = parseAmount(raw);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

/** عرض رقم مخزّن في حقل إدخال مع فواصل */
export function formatStoredAmountForInput(value: unknown): string {
    if (value == null || value === '') return '';
    const n = typeof value === 'number' ? value : parseAmount(String(value));
    if (!Number.isFinite(n) || n <= 0) return '';
    return formatNumberInput(String(Math.trunc(n)));
}
