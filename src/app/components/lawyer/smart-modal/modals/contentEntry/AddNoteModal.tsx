import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { DossierFastNoteComposer } from '@/app/components/lawyer/dossier-notes/DossierFastNoteComposer';
import { DossierNotesVault, type DossierVaultNote } from '@/app/components/lawyer/dossier-notes/DossierNotesVault';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { AddNoteModalProps } from '../../smartFile/modalFormTypes';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
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
            maxWidth="max-w-4xl"
        >
            <SmartModalHeader
                T={T}
                icon={FileText}
                title={isEditing ? 'تعديل ملاحظة' : 'ملاحظات الإضبارة'}
                onClose={onClose}
            />
            <div
                className={
                    T.useMoroccanCorners
                        ? 'grid grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-2 md:items-start'
                        : T.body
                }
            >
                <div className="order-2 max-h-[28vh] overflow-y-auto overscroll-contain rounded-[20px] border border-white/[0.08] bg-black/10 p-2.5 sm:p-3 md:order-1 md:max-h-[min(68dvh,560px)]">
                    <DossierNotesVault
                        notes={savedNotes}
                        onEdit={handleVaultEdit}
                        onDelete={onDeleteNote}
                        variant="repo"
                        heading="مخزن الملاحظات"
                        emptyLabel="لا توجد ملاحظات محفوظة بعد — اكتب ملاحظة جديدة أدناه."
                        lawContext={noteContext}
                    />
                </div>
                <div className="order-1 min-w-0 border-b border-white/[0.08] pb-3 md:order-2 md:border-b-0 md:border-r md:pb-0 md:pr-4">
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
            </div>
        </MoroccanGlassShell>
    );
};
