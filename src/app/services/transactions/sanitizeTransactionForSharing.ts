import { buildTaskTree } from '@/app/modules/transactionsThreading/service';
import type { TaskTemplate } from '@/app/modules/transactionsThreading/taskTemplates';
import {
    TransactionTaskStatus,
    type Transaction,
    type TransactionDocument,
    type TransactionTask,
    type TransactionTaskNode,
} from '@/app/modules/transactionsThreading/types';
import { PROCEDURE_GUIDE_TAG } from '@/app/services/transactions/procedureGuideNavigation';
import { SHARE_PII_TOKEN, scrubPiiMultiline, scrubPiiText } from '@/app/services/transactions/scrubTransactionSharePii';
import { clampTransactionText, TX_SHARE_BODY_MAX } from '@/app/services/transactions/transactionsInputSecurity';
import {
    ensureMachineTrail,
    formatProcedureCardsBody,
    type ShareProcedureDocumentCard,
    type ShareProcedureDraft,
    type ShareProcedureStepCard,
} from '@/app/services/transactions/formatProcedureShareBody';

export type { ShareProcedureDraft, ShareProcedureStepCard } from '@/app/services/transactions/formatProcedureShareBody';
export { formatProcedureCardsBody } from '@/app/services/transactions/formatProcedureShareBody';

const PII_TOKEN = SHARE_PII_TOKEN;

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
    const steps = (draft.steps ?? []).slice(0, 80).map((s) => ({
        id: String(s.id ?? ''),
        number: String(s.number ?? ''),
        title: scrubPiiText(s.title, clientName) || 'خطوة',
        notes: scrubPiiText(s.notes, clientName),
        depth: Number.isFinite(s.depth) ? Math.min(Math.max(0, Math.floor(s.depth)), 8) : 0,
        parentTaskId: s.parentTaskId ?? null,
    }));
    const documents = scrubDocuments(draft.documents ?? [], clientName).slice(0, 40);
    const tags = Array.from(
        new Set(
            [...draft.tags, PROCEDURE_GUIDE_TAG]
                .map((t) => normalizeTag(String(t)))
                .filter(Boolean),
        ),
    ).slice(0, 8);
    const manualBody = clampTransactionText(scrubPiiMultiline(draft.body ?? '', clientName), TX_SHARE_BODY_MAX);
    const baseBody = manualBody.trim()
        ? manualBody
        : formatProcedureCardsBody({ title, steps, documents });
    const body = ensureMachineTrail(baseBody, { title, steps, documents });
    return { title, body, tags, steps, documents };
}
