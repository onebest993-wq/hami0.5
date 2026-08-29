import React, { useState } from 'react';
import { FileText } from '@/app/components/ui/icons/FileText';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { DossierFastNoteComposer } from '@/app/components/lawyer/dossier-notes/DossierFastNoteComposer';
import { DossierNotesVault, type DossierVaultNote } from '@/app/components/lawyer/dossier-notes/DossierNotesVault';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { AddNoteModalProps } from '../../smartFile/modalFormTypes';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import {
    confirmSmartFileDestructiveAction,
    SMART_FILE_DELETE_NOTE_MESSAGE,
} from '../../smartFile/smartFileDestructiveConfirm';
import { MoroccanGlassShell } from '../../smartFile/moroccanGlassShell';
import { useSmartFileModalTheme } from '../../smartFile/smartFileModalTheme';
import { SmartModalHeader } from './shared';

export const AddNoteModal = ({
    isOpen,
    onClose,
    onAdd,
    editMode = false,
    editData,
    dossierContext,
    voiceUserId,
    savedNotes = [],
    onDeleteNote,
    browseOnly = false,
}: AddNoteModalProps) => {
    const T = useSmartFileModalTheme();
    const [title, setTitle] = useState('');
    const [bodyHtml, setBodyHtml] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

    const noteContext =
        dossierContext ??
        ({
            kind: 'lawsuit',
            lawsuitType: 'civil',
        } as const);

    const isEditing = Boolean(editingNoteId || (editMode && editData?.id));

    React.useEffect(() => {
        if (editMode && editData) {
            setTitle(editData.title || '');
            setBodyHtml(editData.details || '');
            setEditingNoteId(editData.id ? String(editData.id) : null);
        } else if (isOpen) {
            setTitle('');
            setBodyHtml('');
            setEditingNoteId(null);
        }
    }, [editMode, editData, isOpen]);

    const resetComposer = () => {
        setTitle('');
        setBodyHtml('');
        setEditingNoteId(null);
    };

    const commitNote = (payload: { title: string; bodyHtml: string }) => {
        onAdd({
            title: payload.title,
            details: payload.bodyHtml,
            ...(editingNoteId ? { id: editingNoteId } : editMode && editData?.id ? { id: editData.id } : {}),
        });
        resetComposer();
        SmartToast.success(isEditing ? 'تم تحديث الملاحظة' : 'تم حفظ الملاحظة في مخزن الإضبارة');
    };

    const handleVaultEdit = (note: DossierVaultNote) => {
        setTitle(note.title);
        setBodyHtml(note.body);
        setEditingNoteId(note.id);
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell
            onOverlayClick={onClose}
            overlayTestId={CIVIL_LAWSUIT_TEST_IDS.noteModal}
            maxWidth="max-w-xl"
        >
            <SmartModalHeader
                T={T}
                icon={FileText}
                title={browseOnly ? 'ملاحظات الإضبارة — للاطلاع' : isEditing ? 'تعديل ملاحظة' : 'ملاحظات الإضبارة'}
                onClose={onClose}
            />
            <div className={browseOnly ? 'p-3 sm:p-3.5' : T.body}>
                <div
                    className={
                        browseOnly
                            ? 'max-h-[min(52dvh,420px)] overflow-y-auto overscroll-contain rounded-xl border border-white/[0.08] bg-white/[0.03] p-2'
                            : 'max-h-[min(36vh,280px)] overflow-y-auto overscroll-contain rounded-xl border border-white/[0.08] bg-white/[0.03] p-2'
                    }
                >
                    <DossierNotesVault
                        notes={savedNotes}
                        onEdit={browseOnly ? undefined : handleVaultEdit}
                        onDelete={
                            browseOnly || !onDeleteNote
                                ? undefined
                                : (id) => {
                                      if (
                                          !confirmSmartFileDestructiveAction(
                                              SMART_FILE_DELETE_NOTE_MESSAGE,
                                          )
                                      ) {
                                          return;
                                      }
                                      onDeleteNote(id);
                                  }
                        }
                        variant="repo"
                        heading="مخزن الملاحظات"
                        emptyLabel={
                            browseOnly
                                ? 'لا توجد ملاحظات في هذه الإضبارة.'
                                : 'لا توجد ملاحظات محفوظة بعد — اكتب ملاحظة جديدة أدناه.'
                        }
                        lawContext={noteContext}
                    />
                </div>
                {!browseOnly ? (
                <div className="min-w-0 border-t border-white/[0.08] pt-3">
                    <p className="mb-2.5 text-xs font-bold text-[#E6C673]/85">
                        {isEditing ? 'تعديل الملاحظة' : 'ملاحظة جديدة'}
                    </p>
                    <DossierFastNoteComposer
                        title={title}
                        onTitleChange={setTitle}
                        bodyHtml={bodyHtml}
                        onBodyChange={setBodyHtml}
                        context={noteContext}
                        onSave={commitNote}
                        onCancel={() => {
                            if (isEditing) resetComposer();
                            else onClose();
                        }}
                        saveLabel={isEditing ? 'تحديث الملاحظة' : 'حفظ الملاحظة'}
                        voiceUserId={voiceUserId ?? resolveCalendarUserId()}
                        onVoiceNote={(voicePayload) => {
                            commitNote({ title: voicePayload.title, bodyHtml: voicePayload.body });
                        }}
                        expanded
                    />
                </div>
                ) : null}
            </div>
        </MoroccanGlassShell>
    );
};
