import React, { useCallback, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    formatRepositoryTimestamp,
    resolveRepositoryEntryLayout,
} from '@/app/services/repository/repositoryUnifiedFeed';
import {
    deleteExecutionDossierNote,
    deleteLawsuitDossierNote,
    parseDossierNoteRefId,
} from '@/app/services/repository/repositoryDossierNoteSync';
import { emitDossierNotesChanged } from '@/app/services/dossier-notes/dossierNoteSyncEvents';
import { RepositoryEntryContentLayout } from '../RepositoryEntryContentLayout';
import { REPO_BADGE_GOLD, REPO_CARD_ICON_BTN } from '../smartRepositoryTheme';
import { EntryCardInlineEditor } from './EntryCardInlineEditor';
import { useUniversalEntryCardEdit } from './useUniversalEntryCardEdit';
import type { UniversalEntryCardProps } from './universalEntryCardTypes';

type DossierEntryCardProps = Pick<
    UniversalEntryCardProps,
    'lawsuitFiles' | 'executionFiles' | 'onUpdateLawsuit' | 'onUpdateExecution' | 'onSaveGlobal'
> & {
    item: Extract<UniversalEntryCardProps['item'], { kind: 'dossier' }>;
    cardRef: React.RefObject<HTMLElement | null>;
    cardClass: string;
};

export const DossierEntryCard = React.memo(function DossierEntryCard({
    item,
    cardRef,
    cardClass,
    lawsuitFiles,
    executionFiles,
    onSaveGlobal,
    onUpdateLawsuit,
    onUpdateExecution,
}: DossierEntryCardProps) {
    const edit = useUniversalEntryCardEdit(
        item,
        cardRef,
        onSaveGlobal,
        onUpdateLawsuit,
        onUpdateExecution,
        lawsuitFiles,
        executionFiles,
    );

    const timestamp = useMemo(() => formatRepositoryTimestamp(item.ref.date), [item.ref.date]);

    const deleteDossierNote = useCallback(async () => {
        const ok = await SmartDialog.confirm('حذف هذه الملاحظة من الإضبارة؟');
        if (!ok) return;
        const parsed = parseDossierNoteRefId(item.ref.id);
        if (!parsed) return;
        if (parsed.kind === 'lawsuit') {
            const file = lawsuitFiles.find((f) => String(f.id) === parsed.dossierId);
            if (!file) return;
            onUpdateLawsuit(deleteLawsuitDossierNote(file, parsed.noteId));
        } else {
            const file = executionFiles.find((f) => String(f.id) === parsed.dossierId);
            if (!file) return;
            onUpdateExecution(deleteExecutionDossierNote(file, parsed.noteId));
        }
        emitDossierNotesChanged({
            dossierId: parsed.dossierId,
            dossierKind: parsed.kind,
            noteId: parsed.noteId,
        });
        SmartToast.success('تم حذف ملاحظة الإضبارة');
    }, [executionFiles, item.ref.id, lawsuitFiles, onUpdateExecution, onUpdateLawsuit]);

    return (
        <article
            ref={cardRef}
            className={cardClass}
            data-testid={`repository-feed-dossier-${item.ref.id}`}
            data-repository-editing={edit.editing ? 'true' : undefined}
        >
            {edit.editing ? (
                <EntryCardInlineEditor
                    title={edit.title}
                    bodyHtml={edit.bodyHtml}
                    editorReady={edit.editorReady}
                    onTitleChange={edit.setTitle}
                    onBodyChange={edit.setBodyHtml}
                    onSave={edit.saveEdit}
                    onCancel={edit.cancelEdit}
                />
            ) : (
                <>
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[11px] text-white/45">{timestamp}</span>
                        <span className={REPO_BADGE_GOLD}>
                            📌 {item.ref.dossierKind === 'lawsuit' ? 'إضبارة دعوى' : 'إضبارة تنفيذ'} —{' '}
                            {item.ref.dossierLabel}
                        </span>
                    </div>
                    <RepositoryEntryContentLayout
                        layout={resolveRepositoryEntryLayout(item.body, null)}
                        title={item.ref.title}
                        bodyHtml={item.body}
                    />
                    <button
                        type="button"
                        onClick={edit.startEdit}
                        className="mt-3 inline-flex items-center min-h-[44px] text-xs font-bold text-[#E6C673] hover:underline touch-manipulation"
                    >
                        تعديل مباشر
                    </button>
                    <div className="flex justify-end mt-2 pt-2 border-t border-white/[0.06]">
                        <button
                            type="button"
                            onClick={() => void deleteDossierNote()}
                            className={`${REPO_CARD_ICON_BTN} text-white/40 hover:text-red-400`}
                            aria-label="حذف"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </>
            )}
        </article>
    );
});
