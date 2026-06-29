export const TX_TITLE_MAX = 120;
export const TX_CLIENT_NAME_MAX = 80;
export const TX_DEPARTMENT_MAX = 80;
export const TX_TEMPLATE_NAME_MAX = 80;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

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
