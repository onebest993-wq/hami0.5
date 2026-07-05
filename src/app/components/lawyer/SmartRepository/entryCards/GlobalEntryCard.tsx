import React, { useCallback, useMemo } from 'react';
import { Eye, Loader2, Pin, Trash2 } from 'lucide-react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { isVoiceNote } from '@/app/components/lawyer/dashboard/notepadNoteUtils';
import { VoiceNoteAudio } from '@/app/components/lawyer/dashboard/VoiceNoteAudio';
import {
    formatRepositoryTimestamp,
    resolveRepositoryEntryLayout,
} from '@/app/services/repository/repositoryUnifiedFeed';
import { RepositoryEntryContentLayout } from '../RepositoryEntryContentLayout';
import { RepositoryCardFrame } from '../RepositoryCardFrame';
import { VaultDossierLinkButton } from '../VaultDossierLinkButton';
import { REPO_BADGE_GOLD, REPO_CARD_ICON_BTN } from '../smartRepositoryTheme';
import type { RepositoryCardInnerLayout } from '../repositoryFeedLayout';
import { EntryCardInlineEditor } from './EntryCardInlineEditor';
import { useUniversalEntryCardEdit } from './useUniversalEntryCardEdit';
import type { UniversalEntryCardProps } from './universalEntryCardTypes';

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
        <>
            <span className="text-[11px] text-white/45 block">{timestamp}</span>
            <div className="flex flex-wrap items-center gap-1.5">
                {note.isPinned ? <Pin size={12} className="text-[#E6C673]" /> : null}
                {attachment ? <span className={REPO_BADGE_GOLD}>📎 {attachment.title}</span> : null}
            </div>
        </>
    );

    const footerNode = (
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2">
                {!voice ? (
                    <button type="button" onClick={edit.startEdit} className="inline-flex items-center min-h-[44px] text-xs font-bold text-[#E6C673] touch-manipulation">
                        تعديل
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={toggleGlobalPin}
                    className={`${REPO_CARD_ICON_BTN} border ${note.isPinned ? 'border-[#E6C673]/35 text-[#E6C673]' : 'border-white/10 text-white/45'}`}
                    aria-label={note.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                >
                    <Pin size={13} className={note.isPinned ? 'fill-current' : undefined} />
                </button>
                <VaultDossierLinkButton
                    dossiers={dossiers}
                    onConfirm={async (dossier) => onLinkGlobalToDossier(note, dossier)}
                />
                {note.attachmentDocId && onViewVaultDoc ? (
                    attachment ? (
                        <button
                            type="button"
                            onClick={() => void onViewVaultDoc(attachment)}
                            className={`${REPO_CARD_ICON_BTN} text-white/45 hover:text-[#E6C673]`}
                            aria-label="عرض المرفق"
                            data-testid={`repository-global-attachment-view-${attachment.id}`}
                        >
                            <Eye size={14} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className={`${REPO_CARD_ICON_BTN} text-white/30 opacity-60`}
                            aria-label="جاري تحميل المرفق"
                            title="جاري تحميل المرفق..."
                        >
                            <Loader2 size={14} className="animate-spin" />
                        </button>
                    )
                ) : null}
            </div>
            <button
                type="button"
                onClick={async () => {
                    const ok = await SmartDialog.confirm('حذف هذه البطاقة؟');
                    if (ok) onDeleteGlobal(note.id);
                }}
                className={`${REPO_CARD_ICON_BTN} text-white/40 hover:text-red-400`}
                aria-label="حذف"
            >
                <Trash2 size={14} />
            </button>
        </div>
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
                <div className="space-y-3">
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
                    {note.quickTaskLines?.length && innerLayout !== 'compact' ? (
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
