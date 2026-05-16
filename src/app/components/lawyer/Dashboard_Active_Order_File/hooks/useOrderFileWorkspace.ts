import { useMemo, useState } from 'react';
import { uuidv4 } from '@/app/services/urgent-actions-db';
import type { CaseAttachment, CaseEvent, CaseFollowup, CaseNote } from '../types';
import { eventDayKey, formatDateText } from '../utils/formatters';

export type CaseEventDayGroup = {
    dayKey: string;
    dayLabel: string;
    events: CaseEvent[];
};

type UseOrderFileWorkspaceArgs = {
    caseId: string | null;
    isFinalized: boolean;
    requestDateYmd: string;
    caseEvents: CaseEvent[];
    caseNotes: CaseNote[];
    setCaseNotes: React.Dispatch<React.SetStateAction<CaseNote[]>>;
    caseAttachments: CaseAttachment[];
    setCaseAttachments: React.Dispatch<React.SetStateAction<CaseAttachment[]>>;
    caseFollowups: CaseFollowup[];
    setCaseFollowups: React.Dispatch<React.SetStateAction<CaseFollowup[]>>;
    persistAndMerge: (patch: Record<string, unknown>) => void;
    appendCaseEvent: (message: string, kind?: CaseEvent['kind']) => void;
};

export function useOrderFileWorkspace({
    caseId,
    isFinalized,
    requestDateYmd,
    caseEvents,
    caseNotes,
    setCaseNotes,
    caseAttachments,
    setCaseAttachments,
    caseFollowups,
    setCaseFollowups,
    persistAndMerge,
    appendCaseEvent,
}: UseOrderFileWorkspaceArgs) {
    const [newEventText, setNewEventText] = useState('');
    const [newNoteText, setNewNoteText] = useState('');
    const [newFollowupTitle, setNewFollowupTitle] = useState('');
    const [newFollowupDate, setNewFollowupDate] = useState('');
    const [attachmentsError, setAttachmentsError] = useState<string | null>(null);

    const addManualEvent = () => {
        if (isFinalized) return;
        const text = newEventText.trim();
        if (!text) return;
        appendCaseEvent(text, 'action');
        setNewEventText('');
    };

    const addCaseNote = () => {
        if (isFinalized) return;
        const text = newNoteText.trim();
        if (!text) return;
        const note: CaseNote = { id: uuidv4(), text, createdAt: new Date().toISOString() };
        const next = [note, ...caseNotes];
        setCaseNotes(next);
        setNewNoteText('');
        persistAndMerge({ notes: next });
        appendCaseEvent('أضيفت ملاحظة في سجل الملاحظات', 'action');
    };

    const deleteCaseNote = (noteId: string) => {
        if (isFinalized) return;
        const next = caseNotes.filter((n) => n.id !== noteId);
        setCaseNotes(next);
        persistAndMerge({ notes: next });
        appendCaseEvent('تم حذف ملاحظة من سجل الملاحظات', 'action');
    };

    const addAttachmentFile = (file: File) => {
        if (isFinalized) return;
        if (file.size > 8 * 1024 * 1024) {
            setAttachmentsError('حجم الملف كبير جداً. اختر ملفاً أصغر من 8MB.');
            return;
        }
        setAttachmentsError(null);
        const reader = new FileReader();
        reader.onload = () => {
            const url = typeof reader.result === 'string' ? reader.result : undefined;
            const item: CaseAttachment = {
                id: uuidv4(),
                kind: 'file',
                name: file.name,
                url,
                createdAt: new Date().toISOString(),
            };
            const next = [item, ...caseAttachments];
            setCaseAttachments(next);
            persistAndMerge({ attachments: next });
            appendCaseEvent(`أضيف مرفق: ${file.name}`, 'action');
        };
        reader.readAsDataURL(file);
    };

    const deleteAttachment = (attachmentId: string) => {
        if (isFinalized) return;
        const target = caseAttachments.find((a) => a.id === attachmentId);
        const next = caseAttachments.filter((a) => a.id !== attachmentId);
        setCaseAttachments(next);
        persistAndMerge({ attachments: next });
        appendCaseEvent(`حذف مرفق: ${target?.name || '—'}`, 'action');
    };

    const addFollowup = () => {
        if (isFinalized) return;
        const title = newFollowupTitle.trim();
        if (!title || !newFollowupDate) return;
        if (requestDateYmd && newFollowupDate < requestDateYmd) return;
        const item: CaseFollowup = {
            id: uuidv4(),
            title,
            date: newFollowupDate,
            completed: false,
            createdAt: new Date().toISOString(),
        };
        const next = [item, ...caseFollowups];
        setCaseFollowups(next);
        setNewFollowupTitle('');
        setNewFollowupDate('');
        persistAndMerge({ followups: next });
        appendCaseEvent(`أضيفت مهمة إدارية: ${title}`, 'action');
    };

    const toggleFollowupCompleted = (followupId: string) => {
        if (isFinalized) return;
        const prevItem = caseFollowups.find((f) => f.id === followupId);
        const next = caseFollowups.map((f) => (f.id === followupId ? { ...f, completed: !f.completed } : f));
        setCaseFollowups(next);
        persistAndMerge({ followups: next });
        const toggled = next.find((f) => f.id === followupId);
        if (prevItem && toggled) {
            appendCaseEvent(
                `تحديث مهمة إدارية: ${prevItem.title} (${toggled.completed ? 'مكتملة' : 'غير مكتملة'})`,
                'action',
            );
        }
    };

    const deleteFollowup = (followupId: string) => {
        if (isFinalized) return;
        const target = caseFollowups.find((f) => f.id === followupId);
        const next = caseFollowups.filter((f) => f.id !== followupId);
        setCaseFollowups(next);
        persistAndMerge({ followups: next });
        appendCaseEvent(`حذف مهمة إدارية: ${target?.title || '—'}`, 'action');
    };

    const attachmentInputId = useMemo(() => `urgent-attachment-${caseId || 'draft'}`, [caseId]);

    const sortedCaseEvents = useMemo(() => {
        return [...caseEvents].sort((a, b) => {
            const tb = Date.parse(String(b.createdAt || '')) || 0;
            const ta = Date.parse(String(a.createdAt || '')) || 0;
            if (tb !== ta) return tb - ta;
            return String(b.id || '').localeCompare(String(a.id || ''));
        });
    }, [caseEvents]);

    const caseEventDayGroups = useMemo((): CaseEventDayGroup[] => {
        const groups: CaseEventDayGroup[] = [];
        let current: CaseEventDayGroup | null = null;
        for (const ev of sortedCaseEvents) {
            const dayKey = eventDayKey(ev.createdAt);
            const dayLabel = dayKey === 'unknown' ? 'تاريخ غير محدد' : formatDateText(dayKey);
            if (!current || current.dayKey !== dayKey) {
                current = { dayKey, dayLabel, events: [] };
                groups.push(current);
            }
            current.events.push(ev);
        }
        return groups;
    }, [sortedCaseEvents]);

    return {
        newEventText,
        setNewEventText,
        newNoteText,
        setNewNoteText,
        newFollowupTitle,
        setNewFollowupTitle,
        newFollowupDate,
        setNewFollowupDate,
        attachmentsError,
        addManualEvent,
        addCaseNote,
        deleteCaseNote,
        addAttachmentFile,
        deleteAttachment,
        addFollowup,
        toggleFollowupCompleted,
        deleteFollowup,
        attachmentInputId,
        caseEventDayGroups,
    };
}
