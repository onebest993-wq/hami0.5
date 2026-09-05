import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    parseDossierNoteRefId,
    patchExecutionFileNote,
    patchLawsuitDossierNote,
} from '@/app/services/repository/repositoryDossierNoteSync';
import { emitDossierNotesChanged } from '@/app/services/dossier-notes/dossierNoteSyncEvents';
import { stripRepositoryHtml } from '@/app/services/repository/stripRepositoryHtml';
import type { UniversalEntryCardProps } from './universalEntryCardTypes';

type EditableItem = Extract<UniversalEntryCardProps['item'], { kind: 'global' } | { kind: 'dossier' }>;

export function useUniversalEntryCardEdit(
    item: EditableItem,
    cardRef: RefObject<HTMLElement | null>,
    onSaveGlobal: UniversalEntryCardProps['onSaveGlobal'],
    onUpdateLawsuit: UniversalEntryCardProps['onUpdateLawsuit'],
    onUpdateExecution: UniversalEntryCardProps['onUpdateExecution'],
    lawsuitFiles: UniversalEntryCardProps['lawsuitFiles'],
    executionFiles: UniversalEntryCardProps['executionFiles'],
) {
    const [editing, setEditing] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [title, setTitle] = useState('');
    const [bodyHtml, setBodyHtml] = useState('');
    const savingRef = useRef(false);

    const beginInlineEdit = useCallback(
        (nextTitle: string, nextBody: string) => {
            setTitle(nextTitle);
            setBodyHtml(nextBody);
            setEditorReady(false);
            setEditing(true);
            requestAnimationFrame(() => {
                cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                setEditorReady(true);
            });
        },
        [cardRef],
    );

    const cancelEdit = useCallback(() => {
        setEditing(false);
        setEditorReady(false);
    }, []);

    const startEdit = useCallback(() => {
        if (item.kind === 'global') {
            beginInlineEdit(item.note.title || '', item.note.body || '');
            return;
        }
        beginInlineEdit(item.ref.title, item.body);
    }, [beginInlineEdit, item]);

    useEffect(() => {
        if (!editing) setEditorReady(false);
    }, [editing]);

    const saveEdit = useCallback(() => {
        if (savingRef.current) return;
        savingRef.current = true;
        void (async () => {
            try {
                const { sanitizeRichNoteHtml } = await import('../legalRichTextEditorUtils');
                const safeBody = sanitizeRichNoteHtml(bodyHtml);
                const plain = stripRepositoryHtml(safeBody);
                if (!title.trim() && !plain) {
                    SmartToast.error('أضف عنواناً أو نصاً');
                    return;
                }

                if (item.kind === 'global') {
                    await onSaveGlobal({
                        ...item.note,
                        title: title.trim() || 'ملاحظة بدون عنوان',
                        body: safeBody || plain,
                        date: item.note.date ?? new Date().toLocaleDateString('ar-EG'),
                    });
                    SmartToast.success('تم حفظ التعديلات');
                    cancelEdit();
                    return;
                }

                const parsed = parseDossierNoteRefId(item.ref.id);
                if (!parsed) {
                    SmartToast.error('تعذّر حفظ التعديلات');
                    return;
                }
                if (parsed.kind === 'lawsuit') {
                    const file = lawsuitFiles.find((f) => String(f.id) === parsed.dossierId);
                    if (!file) {
                        SmartToast.error('تعذّر العثور على إضبارة الدعوى');
                        return;
                    }
                    onUpdateLawsuit(
                        patchLawsuitDossierNote(file, parsed.noteId, {
                            title: title.trim() || item.ref.title,
                            meta: title.trim() || item.ref.title,
                            text: safeBody || plain,
                        }),
                    );
                } else {
                    const file = executionFiles.find((f) => String(f.id) === parsed.dossierId);
                    if (!file) {
                        SmartToast.error('تعذّر العثور على إضبارة التنفيذ');
                        return;
                    }
                    onUpdateExecution(
                        patchExecutionFileNote(file, parsed.noteId, {
                            title: title.trim() || item.ref.title,
                            body: safeBody || plain,
                        }),
                    );
                }
                emitDossierNotesChanged({
                    dossierId: parsed.dossierId,
                    dossierKind: parsed.kind,
                    noteId: parsed.noteId,
                });
                SmartToast.success('تم تحديث ملاحظة الإضبارة');
                cancelEdit();
            } catch {
                SmartToast.error('تعذّر حفظ التعديلات');
            } finally {
                savingRef.current = false;
            }
        })();
    }, [
        bodyHtml,
        cancelEdit,
        executionFiles,
        item,
        lawsuitFiles,
        onSaveGlobal,
        onUpdateExecution,
        onUpdateLawsuit,
        title,
    ]);

    return {
        editing,
        editorReady,
        title,
        setTitle,
        bodyHtml,
        setBodyHtml,
        startEdit,
        cancelEdit,
        saveEdit,
    };
}
