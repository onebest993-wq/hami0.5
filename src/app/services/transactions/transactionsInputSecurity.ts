export const TX_TITLE_MAX = 120;
export const TX_CLIENT_NAME_MAX = 80;
export const TX_DEPARTMENT_MAX = 80;
export const TX_TEMPLATE_NAME_MAX = 80;
export const TX_TASK_TITLE_MAX = 160;
export const TX_TASK_NOTES_MAX = 2_000;
export const TX_DOC_TITLE_MAX = 160;
export const TX_DOC_TYPE_MAX = 60;
export const TX_FINANCE_DESC_MAX = 240;
export const TX_OFFICIAL_REF_MAX = 120;
/** حد أعلى منطقي للمبالغ بالدينار (يمنع قيم شاذة/Overflow في الواجهة) */
export const TX_FINANCE_AMOUNT_MAX = 1_000_000_000_000;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

export class TransactionInputValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TransactionInputValidationError';
    }
}

export function stripTransactionControlChars(value: string): string {
    return value.replace(CONTROL_CHARS, '');
}

export function clampTransactionText(value: string, max: number): string {
    return stripTransactionControlChars(value).slice(0, max);
}

export function sanitizeTransactionCreateFields(input: {
    title: string;
    clientName: string;
    targetDepartment: string;
}): { title: string; clientName: string; targetDepartment: string } {
    return {
        title: clampTransactionText(input.title.trim(), TX_TITLE_MAX),
        clientName: clampTransactionText(input.clientName.trim(), TX_CLIENT_NAME_MAX),
        targetDepartment: clampTransactionText(input.targetDepartment.trim(), TX_DEPARTMENT_MAX),
    };
}

export function sanitizeTransactionTemplateName(name: string, fallbackTitle: string): string {
    const trimmed = clampTransactionText(name.trim(), TX_TEMPLATE_NAME_MAX);
    if (trimmed.length > 0) return trimmed;
    return clampTransactionText(fallbackTitle.trim(), TX_TEMPLATE_NAME_MAX) || 'قالب';
}

export function sanitizeTransactionTaskTitle(title: string): string {
    return clampTransactionText(title.trim(), TX_TASK_TITLE_MAX);
}

export function sanitizeTransactionTaskNotes(notes: string | null | undefined): string | null {
    if (notes == null) return null;
    const trimmed = clampTransactionText(notes.trim(), TX_TASK_NOTES_MAX);
    return trimmed.length > 0 ? trimmed : null;
}

export function sanitizeTransactionOfficialReference(ref: string | null | undefined): string | null {
    if (ref == null) return null;
    const trimmed = clampTransactionText(ref.trim(), TX_OFFICIAL_REF_MAX);
    return trimmed.length > 0 ? trimmed : null;
}

export function sanitizeTransactionDocumentTitle(title: string): string {
    return clampTransactionText(title.trim(), TX_DOC_TITLE_MAX);
}

export function sanitizeTransactionDocumentType(type: string | undefined): string {
    const trimmed = clampTransactionText((type ?? 'مستمسك').trim(), TX_DOC_TYPE_MAX);
    return trimmed.length > 0 ? trimmed : 'مستمسك';
}

export function sanitizeTransactionFinanceDescription(description: string): string {
    return clampTransactionText(description.trim(), TX_FINANCE_DESC_MAX);
}

/**
 * يتحقق من المبلغ المالي: رقم محدود، غير سالب، ضمن سقف معقول.
 * يرمي TransactionInputValidationError عند الرفض.
 */
export function sanitizeTransactionFinanceAmount(amount: number): number {
    if (!Number.isFinite(amount)) {
        throw new TransactionInputValidationError('المبلغ غير صالح');
    }
    if (amount < 0) {
        throw new TransactionInputValidationError('المبلغ لا يمكن أن يكون سالباً');
    }
    if (amount > TX_FINANCE_AMOUNT_MAX) {
        throw new TransactionInputValidationError('المبلغ يتجاوز الحد المسموح');
    }
    // تقريب لفلسين لتفادي ضوضاء الفاصلة العائمة عند العرض
    return Math.round(amount * 100) / 100;
}

export function sanitizeTransactionAgreedFees(amount: number): number {
    return sanitizeTransactionFinanceAmount(amount);
}
