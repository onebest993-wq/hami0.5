import type { ExecutionFile } from '@/app/types/execution';
import type { FileData, CaseStage } from '@/app/components/lawyer/LawyerShared';
import type { CriminalCase } from '@/app/components/lawyer/criminal-system/criminalStore';
import type { ShareCatalogItem, ShareCatalogSection } from './caseShareTypes';

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
    const timelineItems: ShareCatalogItem[] = (file.timelineEvents ?? []).map((ev, i) => ({
        id: `ex:tl:${ev.id ?? i}`,
        kind: timelineKind(String(ev.type ?? ''), false),
        label: ev.title?.trim() || `حدث ${i + 1}`,
        preview: clip([ev.date, ev.description].filter(Boolean).join(' · ')),
    }));

    const noteItems: ShareCatalogItem[] = [];
    if (file.notes?.trim()) {
        noteItems.push({
            id: 'ex:note:main',
            kind: 'note',
            label: 'ملاحظات الإضبارة',
            preview: clip(String(file.notes)),
        });
    }

    const partyItems: ShareCatalogItem[] = [];
    (file.creditors ?? []).forEach((c, i) => {
        if (c.name?.trim()) partyItems.push({ id: `ex:cred:${i}`, kind: 'meta', label: c.name, preview: 'دائن' });
    });
    (file.debtors ?? []).forEach((d, i) => {
        if (d.name?.trim()) partyItems.push({ id: `ex:deb:${i}`, kind: 'meta', label: d.name, preview: 'مدين' });
    });

    const metaItems: ShareCatalogItem[] = [];
    const ref = file.fileNumber ? `${file.fileNumber}/${file.fileYear ?? ''}` : '';
    if (ref) metaItems.push({ id: 'ex:meta:ref', kind: 'meta', label: 'رقم الإضبارة', preview: ref });
    const dir = typeof file.directorate === 'string' ? file.directorate : String(file.directorate ?? '');
    if (dir.trim()) metaItems.push({ id: 'ex:meta:dir', kind: 'meta', label: 'مديرية التنفيذ', preview: dir });

    const sections: ShareCatalogSection[] = [];
    if (timelineItems.length) sections.push({ key: 'timeline', title: 'سجل التنفيذ', items: timelineItems });
    if (noteItems.length) sections.push({ key: 'notes', title: 'الملاحظات', items: noteItems });
    if (partyItems.length) sections.push({ key: 'parties', title: 'الأطراف', items: partyItems });
    if (metaItems.length) sections.push({ key: 'meta', title: 'بيانات الإضبارة', items: metaItems });
    if (dir.trim()) {
        sections.push({
            key: 'court',
            title: 'مديرية التنفيذ',
            items: [{ id: 'ex:court', kind: 'meta', label: dir, preview: file.claimType }],
        });
    }
    return sections;
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
