import type { FileData, CaseStage } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile, GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { DossierKind } from './repositoryDossierRegistry';
import type { DossierNoteRef } from './repositoryDossierNotes';

export type ParsedDossierNoteId = {
    kind: DossierKind;
    dossierId: string;
    noteId: string;
};

export function parseDossierNoteRefId(id: string): ParsedDossierNoteId | null {
    const parts = id.split(':');
    if (parts.length < 3) return null;
    const kind = parts[0];
    if (kind !== 'lawsuit' && kind !== 'execution') return null;
    return {
        kind,
        dossierId: parts[1] ?? '',
        noteId: parts.slice(2).join(':'),
    };
}

export function resolveDossierNoteBody(
    ref: DossierNoteRef,
    lawsuitFiles: FileData[],
    executionFiles: ExecutionFile[],
): string {
    const parsed = parseDossierNoteRefId(ref.id);
    if (!parsed) return ref.excerpt;

    if (parsed.kind === 'lawsuit') {
        const file = lawsuitFiles.find((f) => String(f.id) === parsed.dossierId);
        const note = file?.notes?.find((n) => String(n.id) === parsed.noteId);
        if (note?.text) return String(note.text);

        const stages = Array.isArray(file?.stages) ? file!.stages! : [];
        for (const stage of stages) {
            const event = stage.timeline?.find((e) => e.id === parsed.noteId && e.type === 'note');
            if (event?.details) return String(event.details);
        }
        return ref.excerpt;
    }

    const file = executionFiles.find((f) => String(f.id) === parsed.dossierId);
    const caseNotesLog = Array.isArray(file?.caseNotesLog)
        ? (file!.caseNotesLog as Array<{ id?: unknown; body?: unknown }>)
        : [];
    const note = caseNotesLog.find((n) => String(n.id) === parsed.noteId);
    return String(note?.body ?? ref.excerpt);
}

export function patchLawsuitDossierNote(
    file: FileData,
    noteId: string,
    patch: { text?: string; meta?: string; isPinned?: boolean; title?: string },
): FileData {
    const notes = Array.isArray(file.notes) ? file.notes : [];
    if (notes.some((n) => String(n.id) === noteId)) {
        return patchLawsuitFileNote(file, noteId, patch);
    }

    const stages = Array.isArray(file.stages) ? file.stages : [];
    const nextStages = stages.map((stage) => ({
        ...stage,
        timeline: (stage.timeline ?? []).map((event) =>
            event.id === noteId && event.type === 'note'
                ? {
                      ...event,
                      title: patch.title ?? patch.meta ?? event.title,
                      details: patch.text ?? event.details,
                  }
                : event,
        ),
    })) as CaseStage[];

    return { ...file, stages: nextStages };
}

export function patchLawsuitFileNote(
    file: FileData,
    noteId: string,
    patch: { text?: string; meta?: string; isPinned?: boolean },
): FileData {
    const notes = Array.isArray(file.notes) ? file.notes : [];
    return {
        ...file,
        notes: notes.map((n) =>
            String(n.id) === noteId
                ? {
                      ...n,
                      ...(patch.text !== undefined ? { text: patch.text } : {}),
                      ...(patch.meta !== undefined ? { meta: patch.meta } : {}),
                      ...(patch.isPinned !== undefined ? { isPinned: patch.isPinned } : {}),
                  }
                : n,
        ),
    };
}

export function patchExecutionFileNote(
    file: ExecutionFile,
    noteId: string,
    patch: { title?: string; body?: string; pinned?: boolean },
): ExecutionFile {
    const notes = Array.isArray(file.caseNotesLog) ? file.caseNotesLog : [];
    return {
        ...file,
        caseNotesLog: notes.map((n) =>
            String(n.id) === noteId
                ? {
                      ...n,
                      ...(patch.title !== undefined ? { title: patch.title } : {}),
                      ...(patch.body !== undefined ? { body: patch.body } : {}),
                      ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
                  }
                : n,
        ),
    };
}

export function appendNoteToLawsuitFile(
    file: FileData,
    payload: { title: string; body: string; isPinned?: boolean },
): FileData {
    const notes = Array.isArray(file.notes) ? file.notes : [];
    const nextId = Date.now();
    return {
        ...file,
        notes: [
            {
                id: nextId,
                text: payload.body,
                meta: payload.title,
                stageCtx: 'المستودع الذكي',
                date: new Date().toLocaleDateString('ar-EG'),
                isPinned: Boolean(payload.isPinned),
            },
            ...notes,
        ],
    };
}

export function appendNoteToExecutionFile(
    file: ExecutionFile,
    payload: { title: string; body: string; pinned?: boolean },
): ExecutionFile {
    const notes = Array.isArray(file.caseNotesLog) ? file.caseNotesLog : [];
    const nextId = `repo_${Date.now()}`;
    return {
        ...file,
        caseNotesLog: [
            {
                id: nextId,
                title: payload.title,
                body: payload.body,
                createdAt: new Date().toISOString(),
                pinned: Boolean(payload.pinned),
            },
            ...notes,
        ],
    };
}

export function globalNoteToDossierPayload(note: GlobalNote): {
    title: string;
    body: string;
    isPinned: boolean;
} {
    const plainBody = (note.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return {
        title: note.title?.trim() || 'ملاحظة من المستودع',
        body: note.body?.trim() || plainBody,
        isPinned: Boolean(note.isPinned),
    };
}

export function encodeBoundDossierId(kind: DossierKind, dossierId: string): string {
    return `${kind}:${dossierId}`;
}

export function vaultDocToDossierPayload(doc: {
    title?: string;
    lawyerNote?: string | null;
    aiSummary?: string | null;
}): { title: string; body: string; isPinned: boolean } {
    const body = (doc.lawyerNote || doc.aiSummary || '').trim();
    return {
        title: doc.title?.trim() || 'ملف من المستودع',
        body,
        isPinned: false,
    };
}

export function deleteLawsuitDossierNote(file: FileData, noteId: string): FileData {
    const notes = Array.isArray(file.notes) ? file.notes : [];
    if (notes.some((n) => String(n.id) === noteId)) {
        return {
            ...file,
            notes: notes.filter((n) => String(n.id) !== noteId),
        };
    }

    const stages = Array.isArray(file.stages) ? file.stages : [];
    const nextStages = stages.map((stage) => ({
        ...stage,
        timeline: (stage.timeline ?? []).map((event) =>
            event.id === noteId && event.type === 'note'
                ? { ...event, isDeleted: true as boolean }
                : event,
        ),
    })) as CaseStage[];

    return { ...file, stages: nextStages };
}

export function deleteExecutionDossierNote(file: ExecutionFile, noteId: string): ExecutionFile {
    const notes = Array.isArray(file.caseNotesLog) ? file.caseNotesLog : [];
    const ts = new Date().toISOString();
    return {
        ...file,
        caseNotesLog: notes.map((n) =>
            String(n.id) === noteId ? { ...n, trashedAt: ts } : n,
        ),
    };
}
