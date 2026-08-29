import React, { useCallback, useMemo } from 'react';
import { Pin } from '@/app/components/ui/icons/Pin';
import { isVoiceNote } from '@/app/components/lawyer/dashboard/notepadNoteUtils';
import { VoiceNoteAudio } from '@/app/components/lawyer/dashboard/VoiceNoteAudio';
import {
    formatRepositoryTimestamp,
    resolveRepositoryEntryLayout,
} from '@/app/services/repository/repositoryUnifiedFeed';
import { RepositoryEntryContentLayout } from '../RepositoryEntryContentLayout';
import { RepositoryCardFrame } from '../RepositoryCardFrame';
import { REPO_BADGE_GOLD, REPO_CARD_TIMESTAMP } from '../smartRepositoryTheme';
import type { RepositoryCardInnerLayout } from '../repositoryFeedLayout';
import { EntryCardInlineEditor } from './EntryCardInlineEditor';
import { useUniversalEntryCardEdit } from './useUniversalEntryCardEdit';
import type { UniversalEntryCardProps } from './universalEntryCardTypes';
import { GlobalEntryCardActions } from './GlobalEntryCardActions';

type GlobalEntryCardProps = Pick<
    UniversalEntryCardProps,
    | 'vaultDocsById'
    | 'dossiers'
    | 'lawsuitFiles'
    | 'executionFiles'
    | 'onSaveGlobal'
    | 'onDeleteGlobal'
    | 'onUpdateLawsuit'
    | 'onUpdateExecution'
    | 'onLinkGlobalToDossier'
    | 'onViewVaultDoc'
    | 'rooms'
    | 'onMoveGlobalToRoom'
> & {
    item: Extract<UniversalEntryCardProps['item'], { kind: 'global' }>;
    cardRef: React.RefObject<HTMLElement | null>;
    cardClass: string;
    innerLayout: RepositoryCardInnerLayout;
    bodyClampClass: string;
};

export const GlobalEntryCard = React.memo(function GlobalEntryCard({
    item,
    cardRef,
    cardClass,
    innerLayout,
    bodyClampClass,
    vaultDocsById,
    dossiers,
    lawsuitFiles,
    executionFiles,
    onSaveGlobal,
    onDeleteGlobal,
    onUpdateLawsuit,
    onUpdateExecution,
    onLinkGlobalToDossier,
    onViewVaultDoc,
    rooms,
    onMoveGlobalToRoom,
}: GlobalEntryCardProps) {
    const note = item.note;
    const voice = isVoiceNote(note);
    const edit = useUniversalEntryCardEdit(
        item,
        cardRef,
        onSaveGlobal,
        onUpdateLawsuit,
        onUpdateExecution,
        lawsuitFiles,
        executionFiles,
    );

    const attachment = note.attachmentDocId ? vaultDocsById.get(note.attachmentDocId) : undefined;
    const layout = resolveRepositoryEntryLayout(note.body || '', attachment);
    const timestamp = useMemo(
        () => formatRepositoryTimestamp(note.createdAtIso ?? note.date),
        [note.createdAtIso, note.date],
    );

    const toggleGlobalPin = useCallback(() => {
        onSaveGlobal({ ...note, isPinned: !note.isPinned });
    }, [note, onSaveGlobal]);

    const headerNode = (
        <div className="space-y-1">
            <span className={`${REPO_CARD_TIMESTAMP} block`}>{timestamp}</span>
            <div className="flex flex-wrap items-center gap-1.5">
                {note.isPinned ? <Pin size={12} className="text-[#E6C673]" aria-hidden /> : null}
                {attachment ? <span className={REPO_BADGE_GOLD}>📎 {attachment.title}</span> : null}
            </div>
        </div>
    );

    const footerNode = (
        <GlobalEntryCardActions
            note={note}
            voice={voice}
            attachment={attachment}
            dossiers={dossiers}
            rooms={rooms}
            onStartEdit={edit.startEdit}
            onTogglePin={toggleGlobalPin}
            onLinkGlobalToDossier={onLinkGlobalToDossier}
            onMoveGlobalToRoom={onMoveGlobalToRoom}
            onViewVaultDoc={onViewVaultDoc}
            onDeleteGlobal={onDeleteGlobal}
        />
    );

    if (edit.editing && !voice) {
        return (
            <article
                ref={cardRef}
                className={cardClass}
                data-testid={`repository-feed-global-${note.id}`}
                data-note-id={String(note.id)}
                data-repository-editing="true"
            >
                <div className="space-y-2.5">
                    {headerNode}
                    <EntryCardInlineEditor
                        title={edit.title}
                        bodyHtml={edit.bodyHtml}
                        editorReady={edit.editorReady}
                        saveTestId="repository-note-save"
                        onTitleChange={edit.setTitle}
                        onBodyChange={edit.setBodyHtml}
                        onSave={edit.saveEdit}
                        onCancel={edit.cancelEdit}
                    />
                </div>
            </article>
        );
    }

    return (
        <RepositoryCardFrame
            innerLayout={innerLayout}
            articleClass={cardClass}
            testId={`repository-feed-global-${note.id}`}
            dataNoteId={String(note.id)}
            header={headerNode}
            body={
                <>
                    <RepositoryEntryContentLayout
                        layout={layout}
                        title={note.title}
                        bodyHtml={note.body || ''}
                        attachment={attachment}
                        voiceSlot={voice ? <VoiceNoteAudio body={note.body || ''} className="mb-2" /> : undefined}
                        bodyClassName={bodyClampClass.trim()}
                    />
                    {note.quickTaskLines?.length ? (
                        <ul className="space-y-1 mt-2">
                            {note.quickTaskLines.map((line) => (
                                <li key={line} className="flex items-center gap-2 text-xs text-white/70">
                                    <span className="text-[#E6C673]">☐</span>
                                    {line}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </>
            }
            footer={footerNode}
        />
    );
});
