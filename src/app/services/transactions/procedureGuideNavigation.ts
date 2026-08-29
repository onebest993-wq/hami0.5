/** تنقّل أدلة الإجراءات المنشورة في المنتدى → قسم المعاملات */

import type { TransactionDocumentOwnerTag } from '@/app/modules/transactionsThreading/types';
import {
    sanitizeTransactionDocumentOwnerTag,
    sanitizeTransactionDocumentTitle,
    sanitizeTransactionId,
    sanitizeTransactionTaskNotes,
    sanitizeTransactionTaskTitle,
    TX_TITLE_MAX,
    clampTransactionText,
} from '@/app/services/transactions/transactionsInputSecurity';

export const PROCEDURE_GUIDE_TAG = '#دليل_إجرائي';
export const OPEN_TRANSACTIONS_HUB_EVENT = 'hami:open-transactions-hub';
/** سطر ثابت داخل المنشور للتعرّف والفتح */
export const PROCEDURE_GUIDE_ACTION_MARKER = 'hami-action:open-transactions';
/** بيانات آلة لتطبيق الخطوات/المستمسكات بعد إنشاء المعاملة */
const PROCEDURE_GUIDE_DATA_PREFIX = 'hami-guide-data:';

const PENDING_GUIDE_KEY = 'hami:pending-procedure-guide';
const OPEN_ADD_SHEET_KEY = 'hami:tx-open-add-sheet';

type ProcedureGuideStepPayload = {
    id: string;
    title: string;
    parentTaskId: string | null;
    notes?: string;
};

type ProcedureGuideDocumentPayload = {
    title: string;
    ownerTag: TransactionDocumentOwnerTag;
};

export type ProcedureGuideApplyPayload = {
    v: 1;
    titleHint?: string;
    steps: ProcedureGuideStepPayload[];
    documents: ProcedureGuideDocumentPayload[];
};

type OpenTransactionsHubDetail = {
    openAddSheet?: boolean;
    guide?: ProcedureGuideApplyPayload | null;
};

export function isProcedureGuidePost(post: { tags?: string[] | null; content?: string | null }): boolean {
    const tags = Array.isArray(post.tags) ? post.tags : [];
    if (tags.some((t) => String(t).replace(/^#/, '') === 'دليل_إجرائي' || String(t) === PROCEDURE_GUIDE_TAG)) {
        return true;
    }
    const content = String(post.content ?? '');
    return (
        content.includes(PROCEDURE_GUIDE_ACTION_MARKER) ||
        content.includes(PROCEDURE_GUIDE_TAG) ||
        content.includes(PROCEDURE_GUIDE_DATA_PREFIX)
    );
}

const MAX_GUIDE_JSON_CHARS = 80_000;
const MAX_GUIDE_STEPS = 80;
const MAX_GUIDE_DOCUMENTS = 40;

function sanitizeProcedureGuidePayload(raw: unknown): ProcedureGuideApplyPayload | null {
    if (!raw || typeof raw !== 'object') return null;
    const parsed = raw as Record<string, unknown>;
    if (parsed.v !== 1 || !Array.isArray(parsed.steps)) return null;
    const titleHint =
        typeof parsed.titleHint === 'string'
            ? clampTransactionText(parsed.titleHint, TX_TITLE_MAX) || undefined
            : undefined;
    const steps = parsed.steps
        .map((step) => {
            if (!step || typeof step !== 'object') return null;
            const row = step as Record<string, unknown>;
            const id = sanitizeTransactionId(row.id);
            const title = sanitizeTransactionTaskTitle(String(row.title ?? ''));
            if (!id || !title) return null;
            const parentTaskId = row.parentTaskId == null ? null : sanitizeTransactionId(row.parentTaskId) || null;
            const notes = sanitizeTransactionTaskNotes(typeof row.notes === 'string' ? row.notes : '') ?? '';
            return { id, title, parentTaskId, notes };
        })
        .filter((s): s is NonNullable<typeof s> => s != null)
        .slice(0, MAX_GUIDE_STEPS);
    const documents = Array.isArray(parsed.documents)
        ? parsed.documents
              .map((doc) => {
                  if (!doc || typeof doc !== 'object') return null;
                  const row = doc as Record<string, unknown>;
                  const title = sanitizeTransactionDocumentTitle(String(row.title ?? ''));
                  if (!title) return null;
                  return { title, ownerTag: sanitizeTransactionDocumentOwnerTag(row.ownerTag) };
              })
              .filter((d): d is NonNullable<typeof d> => d != null)
              .slice(0, MAX_GUIDE_DOCUMENTS)
        : [];
    return { v: 1, titleHint, steps, documents };
}

export function encodeProcedureGuideData(guide: ProcedureGuideApplyPayload): string {
    const sanitized = sanitizeProcedureGuidePayload(guide) ?? { v: 1 as const, steps: [], documents: [] };
    return `${PROCEDURE_GUIDE_DATA_PREFIX}${JSON.stringify(sanitized)}`;
}

export function parseProcedureGuideDataLine(content: string): ProcedureGuideApplyPayload | null {
    const text = String(content ?? '');
    const idx = text.indexOf(PROCEDURE_GUIDE_DATA_PREFIX);
    if (idx < 0) return null;
    const raw = text.slice(idx + PROCEDURE_GUIDE_DATA_PREFIX.length).split(/\r?\n/, 1)[0]?.trim() ?? '';
    if (!raw || raw.length > MAX_GUIDE_JSON_CHARS) return null;
    try {
        return sanitizeProcedureGuidePayload(JSON.parse(raw));
    } catch {
        return null;
    }
}

/** يزيل علامات الآلة من نص العرض في المنتدى */
export function stripProcedureGuideMachineLines(content: string): string {
    return String(content ?? '')
        .split(/\r?\n/)
        .filter(
            (line) =>
                !line.includes(PROCEDURE_GUIDE_ACTION_MARKER) && !line.trimStart().startsWith(PROCEDURE_GUIDE_DATA_PREFIX),
        )
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function stashPendingProcedureGuide(guide: ProcedureGuideApplyPayload | null | undefined): void {
    if (typeof window === 'undefined') return;
    try {
        const sanitized = guide ? sanitizeProcedureGuidePayload(guide) : null;
        if (!sanitized || (sanitized.steps.length === 0 && sanitized.documents.length === 0)) {
            window.sessionStorage.removeItem(PENDING_GUIDE_KEY);
            return;
        }
        window.sessionStorage.setItem(PENDING_GUIDE_KEY, JSON.stringify(sanitized));
    } catch {
        /* ignore quota */
    }
}

export function consumePendingProcedureGuide(): ProcedureGuideApplyPayload | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(PENDING_GUIDE_KEY);
        window.sessionStorage.removeItem(PENDING_GUIDE_KEY);
        if (!raw) return null;
        return parseProcedureGuideDataLine(`${PROCEDURE_GUIDE_DATA_PREFIX}${raw}`);
    } catch {
        return null;
    }
}

export function markOpenTransactionsAddSheet(): void {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(OPEN_ADD_SHEET_KEY, '1');
    } catch {
        /* ignore */
    }
}

export function consumeOpenTransactionsAddSheet(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const v = window.sessionStorage.getItem(OPEN_ADD_SHEET_KEY);
        window.sessionStorage.removeItem(OPEN_ADD_SHEET_KEY);
        return v === '1';
    } catch {
        return false;
    }
}

export function requestOpenTransactionsHub(detail?: OpenTransactionsHubDetail): void {
    if (typeof window === 'undefined') return;
    if (detail?.guide) stashPendingProcedureGuide(detail.guide);
    if (detail?.openAddSheet) markOpenTransactionsAddSheet();
    window.dispatchEvent(new CustomEvent(OPEN_TRANSACTIONS_HUB_EVENT, { detail: detail ?? {} }));
}

export function subscribeOpenTransactionsHub(
    handler: (detail: OpenTransactionsHubDetail) => void,
): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const listener = (event: Event) => {
        const custom = event as CustomEvent<OpenTransactionsHubDetail>;
        const detail = custom.detail && typeof custom.detail === 'object' ? custom.detail : {};
        handler(detail);
    };
    window.addEventListener(OPEN_TRANSACTIONS_HUB_EVENT, listener);
    return () => window.removeEventListener(OPEN_TRANSACTIONS_HUB_EVENT, listener);
}
