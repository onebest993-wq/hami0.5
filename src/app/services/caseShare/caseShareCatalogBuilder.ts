import type { ExecutionFile } from '@/app/types/execution';
import type { FileData, CaseStage } from '@/app/components/lawyer/LawyerShared';
import type { CriminalCase } from '@/app/components/lawyer/criminal-system/criminalStore';
import SecureStoreService from '@/app/services/SecureStoreService';
import { readExecutorDecisionsFromActiveNamespace } from '@/app/utils/executionDecisionsNamespace';
import { executionDocumentsStorageKey } from '@/app/utils/executionStorageKeysLite';
import type { ShareCatalogItem, ShareCatalogSection } from './caseShareTypes';
import { EXECUTION_CONSULT_SECTION_DEFS } from './caseShareTypes';

function clip(text: string | undefined, max = 100): string {
    const t = String(text ?? '').trim();
    if (!t) return '';
    return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function timelineKind(type: string, isAttachment?: boolean): ShareCatalogItem['kind'] {
    if (isAttachment || type === 'document') return 'document';
    if (type === 'appointment') return 'hearing';
    return 'timeline';
}

function isFollowupEvent(ev: { type?: string; title?: string; source?: string }): boolean {
    const source = String(ev.source ?? '').toLowerCase();
    const title = String(ev.title ?? '');
    const type = String(ev.type ?? '').toLowerCase();
    return source.includes('followup') || type.includes('followup') || title.includes('محضر');
}

function isDecisionEvent(type: string): boolean {
    return type === 'decision' || type === 'appeal' || type === 'coercive';
}

function isDocumentEvent(ev: { type?: string; isAttachment?: boolean }): boolean {
    return Boolean((ev as { isAttachment?: boolean }).isAttachment) || String(ev.type ?? '') === 'document';
}

function readStoredExecutionDocuments(executionId: string): ShareCatalogItem[] {
    try {
        const raw = SecureStoreService.getItemSync(executionDocumentsStorageKey(executionId));
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.map((row, i) => {
            const doc = row as Record<string, unknown>;
            return {
                id: `ex:doc:store:${String(doc.id ?? i)}`,
                kind: 'document' as const,
                label: String(doc.name ?? doc.title ?? doc.fileName ?? `مستند ${i + 1}`).trim(),
                preview: clip(String(doc.type ?? doc.category ?? doc.mimeType ?? '')),
            };
        });
    } catch {
        return [];
    }
}

function readStoredExecutionDecisions(file: ExecutionFile): ShareCatalogItem[] {
    const rows = readExecutorDecisionsFromActiveNamespace(file.id, file as unknown as Record<string, unknown>);
    return rows.map((row, i) => {
        const title = String(row.title ?? row.requestKind ?? row.kind ?? `قرار ${i + 1}`).trim();
        const status = String(row.outcome ?? row.status ?? '').trim();
        return {
            id: `ex:dec:${String(row.id ?? row.decisionId ?? i)}`,
            kind: 'timeline' as const,
            label: title,
            preview: clip([status, row.date, row.createdAt].filter(Boolean).join(' · ')),
        };
    });
}

/** يضمن ظهور كل أقسام شبكة أدوات التنفيذ في واجهة الاستشارة */
export function normalizeExecutionConsultCatalog(catalog: ShareCatalogSection[]): ShareCatalogSection[] {
    const byKey = new Map(catalog.map((section) => [section.key, section]));
    return EXECUTION_CONSULT_SECTION_DEFS.map(({ key, title }) => {
        const existing = byKey.get(key);
        return existing ? { ...existing, title } : { key, title, items: [] };
    });
}

export function buildLawsuitShareCatalog(file: FileData, stage?: CaseStage | null): ShareCatalogSection[] {
    const activeStage = stage ?? file.stages?.[file.activeStageIndex ?? 0] ?? file.stages?.[0];
    const stages = file.stages?.length ? file.stages : activeStage ? [activeStage] : [];

    const timelineItems: ShareCatalogItem[] = [];
    stages.forEach((st, si) => {
        const stageLabel = String(st.stageName ?? st.name ?? `مرحلة ${si + 1}`);
        (st.timeline ?? [])
            .filter((ev) => !ev.isDeleted)
            .forEach((ev) => {
                timelineItems.push({
                    id: `tl:${si}:${ev.id}`,
                    kind: timelineKind(String(ev.type ?? ''), Boolean(ev.isAttachment)),
                    label: `${stageLabel} — ${ev.title || 'حدث'}`,
                    preview: clip([ev.date, ev.time, ev.details].filter(Boolean).join(' · ')),
                });
            });
    });

    const noteItems: ShareCatalogItem[] = (file.notes ?? []).map((n) => ({
        id: `note:${n.id}`,
        kind: 'note',
        label: n.meta?.trim() || n.stageCtx?.trim() || 'ملاحظة',
        preview: clip(n.text),
    }));

    const docItems: ShareCatalogItem[] = [];
    (file.images ?? []).forEach((img, i) => {
        docItems.push({
            id: `doc:img:${i}`,
            kind: 'document',
            label: img.name?.trim() || `مرفق ${i + 1}`,
            preview: clip(img.name),
        });
    });
    stages.forEach((st, si) => {
        (st.timeline ?? [])
            .filter((ev) => !ev.isDeleted && (ev.isAttachment || ev.type === 'document'))
            .forEach((ev) => {
                docItems.push({
                    id: `doc:tl:${si}:${ev.id}`,
                    kind: 'document',
                    label: `${st.stageName ?? 'مرحلة'} — ${ev.title || 'مستند'}`,
                    preview: clip(ev.details),
                });
            });
    });

    const partyItems: ShareCatalogItem[] = (activeStage?.parties ?? file.parties ?? []).map((p, i) => ({
        id: `party:${p.id ?? i}`,
        kind: 'meta',
        label: p.name?.trim() || `طرف ${i + 1}`,
        preview: p.role,
    }));

    const metaItems: ShareCatalogItem[] = [];
    const caseNo = activeStage?.caseNo ?? file.caseNo;
    if (caseNo?.trim()) {
        metaItems.push({ id: 'meta:caseNo', kind: 'meta', label: 'رقم الدعوى', preview: caseNo });
    }
    const court = activeStage?.court ?? file.court;
    if (court?.trim()) {
        metaItems.push({ id: 'meta:court', kind: 'meta', label: 'المحكمة', preview: court });
    }
    if (file.subInfo?.trim()) {
        metaItems.push({ id: 'meta:subInfo', kind: 'meta', label: 'معلومات إضافية', preview: clip(file.subInfo) });
    }

    const sections: ShareCatalogSection[] = [];
    if (timelineItems.length) sections.push({ key: 'timeline', title: 'السجل الزمني والجلسات', items: timelineItems });
    if (noteItems.length) sections.push({ key: 'notes', title: 'الملاحظات', items: noteItems });
    if (docItems.length) sections.push({ key: 'documents', title: 'المستندات والمرفقات', items: docItems });
    if (partyItems.length) sections.push({ key: 'parties', title: 'الأطراف', items: partyItems });
    if (metaItems.length) sections.push({ key: 'meta', title: 'بيانات الإضبارة', items: metaItems });
    if (court?.trim()) {
        sections.push({
            key: 'court',
            title: 'المحكمة والقاضي',
            items: [{ id: 'court:main', kind: 'meta', label: court, preview: file.subInfo }],
        });
    }
    return sections;
}

export function buildExecutionShareCatalog(file: ExecutionFile): ShareCatalogSection[] {
    const events = (file.timelineEvents ?? []).filter((ev) => !ev.trashedAt);

    const followupItems: ShareCatalogItem[] = [];
    const decisionItems: ShareCatalogItem[] = readStoredExecutionDecisions(file);
    const appointmentItems: ShareCatalogItem[] = [];
    const documentItems: ShareCatalogItem[] = readStoredExecutionDocuments(file.id);
    const timelineItems: ShareCatalogItem[] = [];

    events.forEach((ev, i) => {
        const id = `ex:tl:${ev.id ?? i}`;
        const type = String(ev.type ?? '');
        const item: ShareCatalogItem = {
            id,
            kind: timelineKind(type, false),
            label: ev.title?.trim() || `حدث ${i + 1}`,
            preview: clip([ev.date, ev.description ?? ev.details].filter(Boolean).join(' · ')),
        };

        if (isFollowupEvent(ev)) {
            followupItems.push(item);
            return;
        }
        if (isDecisionEvent(type)) {
            decisionItems.push(item);
            return;
        }
        if (type === 'appointment') {
            appointmentItems.push(item);
            return;
        }
        if (isDocumentEvent(ev)) {
            documentItems.push(item);
            return;
        }
        timelineItems.push(item);
    });

    const noteItems: ShareCatalogItem[] = [];
    (file.caseNotesLog ?? [])
        .filter((n) => !n.trashedAt)
        .forEach((n) => {
            noteItems.push({
                id: `ex:note:${n.id}`,
                kind: 'note',
                label: n.title?.trim() || 'ملاحظة',
                preview: clip(n.body),
            });
        });
    const executionNotes = typeof file.notes === 'string' ? file.notes.trim() : '';
    if (executionNotes) {
        noteItems.push({
            id: 'ex:note:main',
            kind: 'note',
            label: 'ملاحظات الإضبارة',
            preview: clip(executionNotes),
        });
    }

    (file.caseTasksPending ?? [])
        .filter((t) => !t.trashedAt)
        .forEach((t) => {
            if (t.dueDate?.trim()) {
                appointmentItems.push({
                    id: `ex:appt:task:${t.id}`,
                    kind: 'hearing',
                    label: t.title?.trim() || 'موعد مهمة',
                    preview: clip([t.dueDate, t.body].filter(Boolean).join(' · ')),
                });
            } else {
                noteItems.push({
                    id: `ex:task:${t.id}`,
                    kind: 'note',
                    label: t.title?.trim() || 'مهمة',
                    preview: clip(t.body),
                });
            }
        });

    const financialItems: ShareCatalogItem[] = (file.financialLedger ?? []).map((entry, i) => ({
        id: `ex:fin:${entry.id ?? i}`,
        kind: 'meta',
        label: entry.description?.trim() || entry.type?.trim() || `حركة مالية ${i + 1}`,
        preview: clip([entry.amount, entry.date].filter(Boolean).join(' · ')),
    }));
    if (!financialItems.length) {
        const debt = Number(file.debtAmount ?? 0);
        const paid = Number(file.paidDebt ?? 0);
        if (debt > 0 || paid > 0) {
            financialItems.push({
                id: 'ex:fin:summary',
                kind: 'meta',
                label: 'ملخص الذمة المالية',
                preview: clip(`المطلوب: ${debt} · المدفوع: ${paid}`),
            });
        }
    }

    if (file.guarantor_followup?.executor_approved) {
        followupItems.push({
            id: 'ex:followup:guarantor',
            kind: 'meta',
            label: 'طلب كفيل — محضر المتابعة',
            preview: clip(String(file.guarantor_followup.channel ?? '')),
        });
    }

    const built: ShareCatalogSection[] = [
        { key: 'followup', title: 'محضر المتابعة', items: followupItems },
        { key: 'decisions', title: 'القرارات والطعون', items: decisionItems },
        { key: 'notes', title: 'ملاحظات', items: noteItems },
        { key: 'appointments', title: 'المواعيد', items: appointmentItems },
        { key: 'documents', title: 'المستندات', items: documentItems },
        { key: 'timeline', title: 'السجل الزمني', items: timelineItems },
        { key: 'financial', title: 'المركز المالي', items: financialItems },
    ];

    return normalizeExecutionConsultCatalog(built);
}

export function buildCriminalShareCatalog(caseData: CriminalCase): ShareCatalogSection[] {
    const noteItems: ShareCatalogItem[] = [];
    const article = caseData.basics?.legalArticle;
    if (article?.trim()) {
        noteItems.push({ id: 'cr:article', kind: 'meta', label: 'المادة القانونية', preview: article });
    }

    const partyItems: ShareCatalogItem[] = [];
    (caseData.complainants ?? []).forEach((c, i) => {
        if (c.fullName?.trim()) {
            partyItems.push({ id: `cr:comp:${i}`, kind: 'meta', label: c.fullName, preview: 'شاكٍ' });
        }
    });
    (caseData.defendants ?? []).forEach((d, i) => {
        if (d.fullName?.trim()) {
            partyItems.push({ id: `cr:def:${i}`, kind: 'meta', label: d.fullName, preview: 'متهم' });
        }
    });

    const docItems: ShareCatalogItem[] = (caseData.otherEvidenceItems ?? []).map((ev, i) => ({
        id: `cr:doc:${ev.id ?? i}`,
        kind: 'document',
        label: ev.evidenceType?.trim() || ev.notes?.trim() || `دليل ${i + 1}`,
        preview: clip(ev.notes),
    }));

    const sections: ShareCatalogSection[] = [];
    if (noteItems.length) sections.push({ key: 'notes', title: 'ملخص القضية', items: noteItems });
    if (partyItems.length) sections.push({ key: 'parties', title: 'الأطراف', items: partyItems });
    if (docItems.length) sections.push({ key: 'documents', title: 'الأدلة والمستندات', items: docItems });
    return sections;
}
