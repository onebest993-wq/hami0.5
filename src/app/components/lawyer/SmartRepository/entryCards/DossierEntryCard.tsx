import React, { useCallback, useMemo } from 'react';
import { Trash2 } from '@/app/components/ui/lucideIcons';
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
import { REPO_BADGE_GOLD, REPO_CARD_ACTIONS, REPO_CARD_EDIT_LINK, REPO_CARD_ICON_BTN, REPO_CARD_ICON_BTN_ACTIVE, REPO_CARD_META, REPO_CARD_TIMESTAMP } from '../smartRepositoryTheme';
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
                    <div className={REPO_CARD_META}>
                        <span className={REPO_CARD_TIMESTAMP}>{timestamp}</span>
                        <span className={REPO_BADGE_GOLD}>
                            {item.ref.dossierKind === 'lawsuit' ? 'دعوى' : 'تنفيذ'} — {item.ref.dossierLabel}
                        </span>
                    </div>
                    <RepositoryEntryContentLayout
                        layout={resolveRepositoryEntryLayout(item.body, null)}
                        title={item.ref.title}
                        bodyHtml={item.body}
                    />
                    <div className={REPO_CARD_ACTIONS}>
                        <button type="button" onClick={edit.startEdit} className={REPO_CARD_EDIT_LINK}>
                            تعديل
                        </button>
                        <button
                            type="button"
                            onClick={() => void deleteDossierNote()}
                            className={`${REPO_CARD_ICON_BTN} text-white/40 hover:text-red-400 hover:border-red-400/25`}
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
