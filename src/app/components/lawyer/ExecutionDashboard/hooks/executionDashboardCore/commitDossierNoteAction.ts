import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import type { CaseNotesLog } from './timelineAssetsClusterHelpers';
import { sanitizeRichNoteHtml } from '@/app/components/lawyer/SmartRepository/legalRichTextEditorUtils';

export async function commitDossierNoteAction(
    payload: { title: string; bodyHtml: string; noteId?: string },
    deps: {
        showToast: (message: string, type?: string) => void;
        caseNotesLogRef: MutableRefObject<CaseNotesLog>;
        timelineEventsRef: MutableRefObject<TimelineEvent[]>;
        nextTimelineId: () => string;
        setCaseNotesLog: Dispatch<SetStateAction<CaseNotesLog>>;
        setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
        persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
        setNoteTitle: Dispatch<SetStateAction<string>>;
        setNoteBody: Dispatch<SetStateAction<string>>;
        setEditingNoteId: Dispatch<SetStateAction<string | null>>;
    },
): Promise<void> {
    const {
        showToast,
        caseNotesLogRef,
        timelineEventsRef,
        nextTimelineId,
        setCaseNotesLog,
        setTimelineEvents,
        persistExecutionMerge,
        setNoteTitle,
        setNoteBody,
        setEditingNoteId,
    } = deps;
    const titleTrim = String(payload.title || '').trim();
    const bodyTrim = sanitizeRichNoteHtml(String(payload.bodyHtml || '').trim());
    if (!titleTrim || !bodyTrim) {
        showToast('يرجى تعبئة عنوان الملاحظة والتفاصيل', 'warning');
        return;
    }
    const now = new Date().toISOString();
    const sourceLabel = 'سجل الملاحظات والمهام';
    const curNotes = caseNotesLogRef.current;
    const curTimeline = timelineEventsRef.current;
    const noteId = String(payload.noteId ?? '').trim();

    if (noteId) {
        if (!curNotes.some((n) => n.id === noteId)) {
            showToast('تعذر العثور على الملاحظة للتعديل', 'error');
            return;
        }
        const nextNotes = curNotes.map((n) =>
            n.id === noteId ? { ...n, title: titleTrim, body: bodyTrim } : n,
        );
        const nextTimeline = [
            {
                id: nextTimelineId(),
                type: 'other' as const,
                date: now,
                timestamp: now,
                title: `✏️ تعديل ملاحظة: ${titleTrim}`,
                description: bodyTrim,
                source: sourceLabel,
            },
            ...curTimeline,
        ];
        setCaseNotesLog(nextNotes);
        setTimelineEvents(nextTimeline);
        const persisted = persistExecutionMerge({ caseNotesLog: nextNotes, timelineEvents: nextTimeline });
        if (persisted === false) {
            showToast('تعذّر حفظ التعديل — أعد المحاولة', 'error');
            return;
        }
        showToast('تم حفظ التعديل بنجاح', 'success');
    } else {
        const entryId = nextTimelineId();
        const nextNotes = [
            { id: entryId, title: titleTrim, body: bodyTrim, createdAt: now },
            ...curNotes,
        ];
        const nextTimeline = [
            {
                id: nextTimelineId(),
                type: 'other' as const,
                date: now,
                timestamp: now,
                title: `📝 إضافة ملاحظة: ${titleTrim}`,
                description: bodyTrim,
                source: sourceLabel,
            },
            ...curTimeline,
        ];
        setCaseNotesLog(nextNotes);
        setTimelineEvents(nextTimeline);
        const persisted = persistExecutionMerge({ caseNotesLog: nextNotes, timelineEvents: nextTimeline });
        if (persisted === false) {
            showToast('تعذّر حفظ الملاحظة — أعد المحاولة', 'error');
            return;
        }
        showToast('تم حفظ الملاحظة بنجاح', 'success');
    }
    setNoteTitle('');
    setNoteBody('');
    setEditingNoteId(null);
}
