import {
    encodeProcedureGuideData,
    PROCEDURE_GUIDE_ACTION_MARKER,
    type ProcedureGuideApplyPayload,
} from '@/app/services/transactions/procedureGuideNavigation';
import type { TransactionDocumentOwnerTag } from '@/app/modules/transactionsThreading/types';

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

function buildProcedureGuidePayload(
    draft: Pick<ShareProcedureDraft, 'title' | 'steps' | 'documents'>,
): ProcedureGuideApplyPayload {
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

export function ensureMachineTrail(
    body: string,
    draft: Pick<ShareProcedureDraft, 'title' | 'steps' | 'documents'>,
): string {
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
