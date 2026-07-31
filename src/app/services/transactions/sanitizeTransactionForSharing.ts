import { buildTaskTree } from '@/app/modules/transactionsThreading/service';
import type { TaskTemplate } from '@/app/modules/transactionsThreading/taskTemplates';
import type {
    Transaction,
    TransactionDocument,
    TransactionDocumentOwnerTag,
    TransactionTask,
    TransactionTaskNode,
} from '@/app/modules/transactionsThreading/types';
import { TransactionTaskStatus } from '@/app/modules/transactionsThreading/types';
import {
    encodeProcedureGuideData,
    PROCEDURE_GUIDE_ACTION_MARKER,
    PROCEDURE_GUIDE_TAG,
    type ProcedureGuideApplyPayload,
    type ProcedureGuideDocumentPayload,
} from '@/app/services/transactions/procedureGuideNavigation';

export type ShareProcedureStepCard = {
    id: string;
    number: string;
    title: string;
    notes: string;
    depth: number;
    parentTaskId: string | null;
};

export type ShareProcedureDocumentCard = {
    title: string;
    ownerTag: TransactionDocumentOwnerTag;
};

export type ShareProcedureDraft = {
    title: string;
    /** نص المنشور النهائي — قابل للتحرير اليدوي */
    body: string;
    tags: string[];
    steps: ShareProcedureStepCard[];
    documents: ShareProcedureDocumentCard[];
};

const PII_TOKEN = '[محذوف]';

const EMAIL_RE = /([a-zA-Z0-9._%+-]{1,64})@([a-zA-Z0-9.-]{1,253})\.([a-zA-Z]{2,24})/g;
const IRAQ_MOBILE_RE = /(?:\+?964|0)?\s*7\d{2}[\s-]?\d{3}[\s-]?\d{4}/g;
const LONG_ID_RE = /(?:\d[\s-]?){10,16}/g;
const OFFICIAL_REF_INLINE_RE = /(?:صادر|وارد|وصل)\s*[:：]?\s*[\d\u0660-\u0669\-/]+/gi;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** تنقيح نصي للبيانات الحساسة — آمن لإعادة التشغيل قبل النشر */
export function scrubPiiText(input: string, clientName?: string | null): string {
    let out = String(input ?? '');
    const name = clientName?.trim();
    if (name && name.length >= 2) {
        out = out.replace(new RegExp(escapeRegExp(name), 'gi'), PII_TOKEN);
    }
    out = out.replace(EMAIL_RE, PII_TOKEN);
    out = out.replace(IRAQ_MOBILE_RE, PII_TOKEN);
    out = out.replace(LONG_ID_RE, (m) => {
        const digits = m.replace(/[^\d]/g, '');
        if (digits.length < 10 || digits.length > 16) return m;
        return PII_TOKEN;
    });
    out = out.replace(OFFICIAL_REF_INLINE_RE, PII_TOKEN);
    return out.replace(/\s{2,}/g, ' ').trim();
}

/** تنقيح مع الحفاظ على أسطر النص الإجرائي */
export function scrubPiiMultiline(input: string, clientName?: string | null): string {
    let out = String(input ?? '');
    const name = clientName?.trim();
    if (name && name.length >= 2) {
        out = out.replace(new RegExp(escapeRegExp(name), 'gi'), PII_TOKEN);
    }
    out = out.replace(EMAIL_RE, PII_TOKEN);
    out = out.replace(IRAQ_MOBILE_RE, PII_TOKEN);
    out = out.replace(LONG_ID_RE, (m) => {
        const digits = m.replace(/[^\d]/g, '');
        if (digits.length < 10 || digits.length > 16) return m;
        return PII_TOKEN;
    });
    out = out.replace(OFFICIAL_REF_INLINE_RE, PII_TOKEN);
    return out.replace(/[^\S\n]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function normalizeTag(label: string): string {
    const core = label
        .trim()
        .replace(/^#/, '')
        .replace(/\s+/g, '_')
        .replace(/[^\p{L}\p{N}_]+/gu, '');
    return core ? `#${core}` : '';
}

function proceduralTitle(rawTitle: string, clientName?: string | null): string {
    let title = scrubPiiText(rawTitle, clientName);
    if (!title || title === PII_TOKEN) title = 'دليل إجرائي لمعاملة';
    if (!title.includes('دليل')) {
        title = `دليل إجرائي — ${title}`;
    }
    return title.slice(0, 120);
}

function deriveTypeTag(title: string): string {
    const tagged = normalizeTag(title.replace(/^دليل\s*إجرائي\s*[—\-–]?\s*/u, '').slice(0, 40));
    return tagged || '#معاملات';
}

function toTreeTasks(
    tasks: Array<{
        id: string;
        title: string;
        parentTaskId: string | null;
        notes?: string | null;
        createdAt?: string;
    }>,
): TransactionTask[] {
    return tasks.map((t, index) => ({
        id: t.id,
        transactionId: 'share',
        title: t.title,
        status: TransactionTaskStatus.Pending,
        parentTaskId: t.parentTaskId,
        notes: t.notes ?? null,
        deadline: null,
        officialReference: null,
        createdAt: t.createdAt ?? `1970-01-01T00:00:${String(index).padStart(2, '0')}.000Z`,
        completedAt: null,
    }));
}

function collectSteps(
    nodes: TransactionTaskNode[],
    clientName: string | null | undefined,
    prefix: string,
    depth: number,
    out: ShareProcedureStepCard[],
): void {
    nodes.forEach((node, index) => {
        const number = prefix ? `${prefix}.${index + 1}` : String(index + 1);
        const stepTitle = scrubPiiText(node.title, clientName) || 'خطوة';
        const notes = scrubPiiText(node.notes ?? '', clientName);
        out.push({
            id: node.id,
            number,
            title: stepTitle,
            notes: notes && notes !== PII_TOKEN ? notes : '',
            depth,
            parentTaskId: node.parentTaskId,
        });
        if (node.children.length > 0) {
            collectSteps(node.children, clientName, number, depth + 1, out);
        }
    });
}

function scrubDocuments(
    documents: Array<Pick<TransactionDocument, 'title' | 'ownerTag'>>,
    clientName?: string | null,
): ShareProcedureDocumentCard[] {
    const out: ShareProcedureDocumentCard[] = [];
    for (const doc of documents) {
        const title = scrubPiiText(doc.title, clientName);
        if (!title || title === PII_TOKEN) continue;
        out.push({
            title,
            ownerTag: doc.ownerTag === 'للدائرة' || doc.ownerTag === 'أخرى' ? doc.ownerTag : 'للموكل',
        });
    }
    return out;
}

export function buildProcedureGuidePayload(draft: Pick<ShareProcedureDraft, 'title' | 'steps' | 'documents'>): ProcedureGuideApplyPayload {
    return {
        v: 1,
        titleHint: draft.title,
        steps: draft.steps.map((s) => ({
            id: s.id,
            title: s.title,
            parentTaskId: s.parentTaskId,
            notes: s.notes || '',
        })),
        documents: draft.documents.map((d) => ({
            title: d.title,
            ownerTag: d.ownerTag,
        })),
    };
}

/** يبني نص المنشور: إجراءات + عناوين مستمسكات + بيانات آلة */
export function formatProcedureCardsBody(params: {
    title: string;
    steps: ShareProcedureStepCard[];
    documents?: ShareProcedureDocumentCard[];
}): string {
    const documents = params.documents ?? [];
    const lines: string[] = [
        params.title,
        '',
        'دليل إجرائي معرفي — بلا بيانات موكلين. طبّقه في قسم المعاملات وأضف الأسماء محلياً.',
        '',
        '─── بطاقات الإجراءات ───',
        '',
    ];

    if (params.steps.length === 0) {
        lines.push('□ لا توجد خطوات محفوظة');
    } else {
        for (const step of params.steps) {
            const indent = '  '.repeat(Math.min(step.depth, 4));
            lines.push(`${indent}┌─ البطاقة ${step.number}`);
            lines.push(`${indent}│  ${step.title}`);
            if (step.notes) {
                lines.push(`${indent}│  ملاحظة: ${step.notes}`);
            }
            lines.push(`${indent}└────────────────`);
            lines.push('');
        }
    }

    if (documents.length > 0) {
        lines.push('─── مستمسكات مطلوبة (عناوين فقط) ───');
        lines.push('');
        for (const doc of documents) {
            lines.push(`□ ${doc.title} — ${doc.ownerTag}`);
        }
        lines.push('');
    }

    lines.push('─── تطبيق الدليل ───');
    lines.push('اضغط «فتح قسم المعاملات» أسفل المنشور لإضافة الأسماء والبيانات الحساسة محلياً.');
    lines.push(PROCEDURE_GUIDE_ACTION_MARKER);
    lines.push(
        encodeProcedureGuideData(
            buildProcedureGuidePayload({
                title: params.title,
                steps: params.steps,
                documents,
            }),
        ),
    );

    return lines.join('\n').trim();
}

function ensureMachineTrail(body: string, draft: Pick<ShareProcedureDraft, 'title' | 'steps' | 'documents'>): string {
    let trimmed = body.trim();
    if (!trimmed.includes(PROCEDURE_GUIDE_ACTION_MARKER)) {
        trimmed = `${trimmed}\n\n─── تطبيق الدليل ───\nاضغط «فتح قسم المعاملات» أسفل المنشور لإضافة الأسماء والبيانات الحساسة محلياً.\n${PROCEDURE_GUIDE_ACTION_MARKER}`;
    }
    const dataLine = encodeProcedureGuideData(buildProcedureGuidePayload(draft));
    const withoutOldData = trimmed
        .split(/\r?\n/)
        .filter((line) => !line.trimStart().startsWith('hami-guide-data:'))
        .join('\n')
        .trim();
    return `${withoutOldData}\n${dataLine}`;
}

function buildDraft(params: {
    sourceTitle: string;
    clientName?: string | null;
    tasks: Array<{
        id: string;
        title: string;
        parentTaskId: string | null;
        notes?: string | null;
        createdAt?: string;
    }>;
    documents?: Array<Pick<TransactionDocument, 'title' | 'ownerTag'>>;
}): ShareProcedureDraft {
    const clientName = params.clientName?.trim() || null;
    const title = proceduralTitle(params.sourceTitle, clientName);

    const tree = buildTaskTree(toTreeTasks(params.tasks));
    const steps: ShareProcedureStepCard[] = [];
    collectSteps(tree, clientName, '', 0, steps);
    const documents = scrubDocuments(params.documents ?? [], clientName);

    const tags = Array.from(
        new Set([PROCEDURE_GUIDE_TAG, deriveTypeTag(title), '#معاملات'].map(normalizeTag).filter(Boolean)),
    );

    const body = formatProcedureCardsBody({ title, steps, documents });

    return { title, body, tags, steps, documents };
}

/** مشاركة مسار معاملة حيّة — إجراءات + عناوين مستمسكات (بلا ملفات/موكل) */
export function sanitizeTransactionForSharing(
    transaction: Pick<Transaction, 'title' | 'clientName' | 'targetDepartment'>,
    tasks: TransactionTask[],
    documents: Array<Pick<TransactionDocument, 'title' | 'ownerTag'>> = [],
): ShareProcedureDraft {
    return buildDraft({
        sourceTitle: transaction.title,
        clientName: transaction.clientName,
        tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            parentTaskId: t.parentTaskId,
            notes: t.notes,
            createdAt: t.createdAt,
        })),
        documents,
    });
}

/** مشاركة قالب محفوظ — خطوات القالب فقط */
export function sanitizeTemplateForSharing(template: TaskTemplate): ShareProcedureDraft {
    return buildDraft({
        sourceTitle: template.name,
        clientName: null,
        tasks: template.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            parentTaskId: t.parentTaskId,
            notes: null,
        })),
        documents: [],
    });
}

/** شبكة أمان قبل الإرسال — يحافظ على النص اليدوي مع تنقيح PII وإعادة بيانات الآلة */
export function resanitizeShareDraft(
    draft: ShareProcedureDraft,
    clientName?: string | null,
): ShareProcedureDraft {
    const title = scrubPiiText(draft.title, clientName) || 'دليل إجرائي لمعاملة';
    const steps = (draft.steps ?? []).map((s) => ({
        ...s,
        title: scrubPiiText(s.title, clientName) || 'خطوة',
        notes: scrubPiiText(s.notes, clientName),
        parentTaskId: s.parentTaskId ?? null,
    }));
    const documents = scrubDocuments(draft.documents ?? [], clientName);
    const tags = Array.from(
        new Set(
            [...draft.tags, PROCEDURE_GUIDE_TAG]
                .map((t) => normalizeTag(String(t)))
                .filter(Boolean),
        ),
    );
    const manualBody = scrubPiiMultiline(draft.body ?? '', clientName);
    const baseBody = manualBody.trim()
        ? manualBody
        : formatProcedureCardsBody({ title, steps, documents });
    const body = ensureMachineTrail(baseBody, { title, steps, documents });
    return { title, body, tags, steps, documents };
}

export type { ProcedureGuideDocumentPayload };
