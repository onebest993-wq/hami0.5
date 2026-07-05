import type { FileData, CaseStage } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { listLinkableDossiers, type DossierKind } from './repositoryDossierRegistry';

export type DossierNoteRef = {
    id: string;
    dossierId: string;
    dossierKind: DossierKind;
    dossierLabel: string;
    title: string;
    excerpt: string;
    date?: string;
    isPinned?: boolean;
};

function stripHtml(text: string): string {
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function excerptFromBody(body: string, max = 120): string {
    const plain = stripHtml(body);
    if (plain.length <= max) return plain;
    return `${plain.slice(0, max)}…`;
}

function collectLawsuitTimelineNotes(file: FileData, dossierLabel: string): DossierNoteRef[] {
    const dossierId = String(file.id);
    const refs: DossierNoteRef[] = [];
    const stages = Array.isArray(file.stages) ? file.stages : [];
    for (const stage of stages) {
        const timeline = Array.isArray(stage.timeline) ? stage.timeline : [];
        for (const event of timeline) {
            if (event.type !== 'note') continue;
            if ((event as { isDeleted?: boolean }).isDeleted) continue;
            const body = String(event.details ?? '').trim();
            if (!body) continue;
            refs.push({
                id: `lawsuit:${dossierId}:${event.id}`,
                dossierId,
                dossierKind: 'lawsuit',
                dossierLabel,
                title: String(event.title ?? 'ملاحظة دعوى').trim() || 'ملاحظة دعوى',
                excerpt: excerptFromBody(body),
                date: event.date,
            });
        }
    }
    return refs;
}

/** يجمع ملاحظات الدعاوى والتنفيذ لعرضها كبطاقات مختصرة في المفكرة */
export function collectDossierNotes(
    lawsuitFiles: FileData[],
    executionFiles: ExecutionFile[],
): DossierNoteRef[] {
    const dossierLabels = new Map(
        listLinkableDossiers(lawsuitFiles, executionFiles).map((d) => [
            `${d.kind}:${d.id}`,
            d.label,
        ]),
    );

    const refs: DossierNoteRef[] = [];
    const seen = new Set<string>();

    for (const file of lawsuitFiles) {
        const dossierId = String(file.id);
        const dossierLabel = dossierLabels.get(`lawsuit:${dossierId}`) ?? `دعوى #${dossierId}`;
        const notes = Array.isArray(file.notes) ? file.notes : [];
        for (const note of notes) {
            const body = String(note.text ?? '').trim();
            if (!body) continue;
            const refId = `lawsuit:${dossierId}:${note.id}`;
            if (seen.has(refId)) continue;
            seen.add(refId);
            refs.push({
                id: refId,
                dossierId,
                dossierKind: 'lawsuit',
                dossierLabel,
                title: String(note.meta ?? note.stageCtx ?? 'ملاحظة دعوى').trim() || 'ملاحظة دعوى',
                excerpt: excerptFromBody(body),
                date: note.date,
                isPinned: note.isPinned,
            });
        }
        for (const timelineRef of collectLawsuitTimelineNotes(file, dossierLabel)) {
            if (seen.has(timelineRef.id)) continue;
            seen.add(timelineRef.id);
            refs.push(timelineRef);
        }
    }

    for (const file of executionFiles) {
        const dossierId = String(file.id);
        const dossierLabel = dossierLabels.get(`execution:${dossierId}`) ?? `تنفيذ #${dossierId}`;
        const notes = Array.isArray(file.caseNotesLog) ? file.caseNotesLog : [];
        for (const note of notes) {
            if (note.trashedAt) continue;
            const body = String(note.body ?? '').trim();
            if (!body) continue;
            refs.push({
                id: `execution:${dossierId}:${note.id}`,
                dossierId,
                dossierKind: 'execution',
                dossierLabel,
                title: String(note.title ?? 'ملاحظة تنفيذ').trim() || 'ملاحظة تنفيذ',
                excerpt: excerptFromBody(body),
                date: note.createdAt,
                isPinned: note.pinned,
            });
        }
    }

    return refs.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.date ?? '').localeCompare(a.date ?? '', 'ar');
    });
}
