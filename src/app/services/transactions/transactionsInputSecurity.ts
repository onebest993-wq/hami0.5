export const TX_TITLE_MAX = 120;
export const TX_CLIENT_NAME_MAX = 80;
export const TX_DEPARTMENT_MAX = 80;
export const TX_TEMPLATE_NAME_MAX = 80;
export const TX_TASK_TITLE_MAX = 160;
const TX_TASK_NOTES_MAX = 2_000;
export const TX_DOC_TITLE_MAX = 160;
const TX_DOC_TYPE_MAX = 60;
export const TX_OFFICIAL_REF_MAX = 120;
export const TX_ID_MAX = 80;
export const TX_USER_ID_MAX = 128;
export const TX_SHARE_BODY_MAX = 16_000;
export const TX_ISO_MAX = 40;
export const TX_FORUM_AUTHOR_MAX = 80;

const DOCUMENT_OWNER_TAGS = new Set(['للموكل', 'للدائرة', 'أخرى']);

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

function stripTransactionControlChars(value: string): string {
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

export function sanitizeTransactionId(value: unknown): string {
    return clampTransactionText(String(value ?? '').trim(), TX_ID_MAX);
}

export function sanitizeTransactionUserId(value: unknown): string {
    return clampTransactionText(String(value ?? '').trim(), TX_USER_ID_MAX);
}

export function sanitizeTransactionIsoTimestamp(value: unknown, fallback: string): string {
    if (value instanceof Date && Number.isFinite(value.getTime())) {
        return clampTransactionText(value.toISOString(), TX_ISO_MAX);
    }
    const raw = clampTransactionText(String(value ?? '').trim(), TX_ISO_MAX);
    return raw.length > 0 ? raw : fallback;
}

export function sanitizeTransactionDocumentOwnerTag(value: unknown): 'للموكل' | 'للدائرة' | 'أخرى' {
    const tag = String(value ?? '').trim();
    if (DOCUMENT_OWNER_TAGS.has(tag)) return tag as 'للموكل' | 'للدائرة' | 'أخرى';
    return 'أخرى';
}

export function sanitizeTransactionForumAuthorName(fullName: unknown): string {
    const name = clampTransactionText(String(fullName ?? '').trim(), TX_FORUM_AUTHOR_MAX);
    if (!name || name.includes('@')) return 'محامي';
    return name;
}
