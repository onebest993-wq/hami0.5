/** تنقّل أدلة الإجراءات المنشورة في المنتدى → قسم المعاملات */

import type { TransactionDocumentOwnerTag } from '@/app/modules/transactionsThreading/types';

export const PROCEDURE_GUIDE_TAG = '#دليل_إجرائي';
export const OPEN_TRANSACTIONS_HUB_EVENT = 'hami:open-transactions-hub';
/** سطر ثابت داخل المنشور للتعرّف والفتح */
export const PROCEDURE_GUIDE_ACTION_MARKER = 'hami-action:open-transactions';
/** بيانات آلة لتطبيق الخطوات/المستمسكات بعد إنشاء المعاملة */
export const PROCEDURE_GUIDE_DATA_PREFIX = 'hami-guide-data:';

const PENDING_GUIDE_KEY = 'hami:pending-procedure-guide';
const OPEN_ADD_SHEET_KEY = 'hami:tx-open-add-sheet';

export type ProcedureGuideStepPayload = {
    id: string;
    title: string;
    parentTaskId: string | null;
    notes?: string;
};

export type ProcedureGuideDocumentPayload = {
    title: string;
    ownerTag: TransactionDocumentOwnerTag;
};

export type ProcedureGuideApplyPayload = {
    v: 1;
    titleHint?: string;
    steps: ProcedureGuideStepPayload[];
    documents: ProcedureGuideDocumentPayload[];
};

export type OpenTransactionsHubDetail = {
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

export function encodeProcedureGuideData(guide: ProcedureGuideApplyPayload): string {
    return `${PROCEDURE_GUIDE_DATA_PREFIX}${JSON.stringify(guide)}`;
}

export function parseProcedureGuideDataLine(content: string): ProcedureGuideApplyPayload | null {
    const text = String(content ?? '');
    const idx = text.indexOf(PROCEDURE_GUIDE_DATA_PREFIX);
    if (idx < 0) return null;
    const raw = text.slice(idx + PROCEDURE_GUIDE_DATA_PREFIX.length).split(/\r?\n/, 1)[0]?.trim() ?? '';
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as ProcedureGuideApplyPayload;
        if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.steps)) return null;
        return {
            v: 1,
            titleHint: typeof parsed.titleHint === 'string' ? parsed.titleHint : undefined,
            steps: parsed.steps
                .filter((s) => s && typeof s.id === 'string' && typeof s.title === 'string')
                .map((s) => ({
                    id: s.id,
                    title: s.title,
                    parentTaskId: s.parentTaskId ?? null,
                    notes: typeof s.notes === 'string' ? s.notes : '',
                })),
            documents: Array.isArray(parsed.documents)
                ? parsed.documents
                      .filter((d) => d && typeof d.title === 'string')
                      .map((d) => ({
                          title: d.title,
                          ownerTag: normalizeOwnerTag(d.ownerTag),
                      }))
                : [],
        };
    } catch {
        return null;
    }
}

function normalizeOwnerTag(value: unknown): TransactionDocumentOwnerTag {
    if (value === 'للدائرة' || value === 'أخرى' || value === 'للموكل') return value;
    return 'أخرى';
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
        if (!guide || (guide.steps.length === 0 && guide.documents.length === 0)) {
            window.sessionStorage.removeItem(PENDING_GUIDE_KEY);
            return;
        }
        window.sessionStorage.setItem(PENDING_GUIDE_KEY, JSON.stringify(guide));
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

export function peekPendingProcedureGuide(): ProcedureGuideApplyPayload | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(PENDING_GUIDE_KEY);
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
