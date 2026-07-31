import React, { useMemo } from 'react';
import { Eye, FileText, Loader2, Pencil, Trash2 } from 'lucide-react';
import {
    formatRepositoryTimestamp,
    resolveRepositoryEntryLayout,
} from '@/app/services/repository/repositoryUnifiedFeed';
import { resolveVaultMediaKind } from '@/app/services/vault/vaultDocUtils';
import { VaultDossierLinkButton } from '../VaultDossierLinkButton';
import { RepositoryMoveToRoomButton } from '../RepositoryMoveToRoomButton';
import { REPO_FEED_THUMB_IMAGE, VaultDocDisplayImage } from '../VaultDocDisplayImage';
import { confirmRepositoryAction } from '../repositoryDialog';
import { RepositoryMediaKindBadge } from '../RepositoryMediaKindBadge';
import {
    REPO_CARD_ACTIONS,
    REPO_CARD_ICON_BTN,
    REPO_CARD_META,
    REPO_CARD_NOTE,
    REPO_CARD_TITLE,
} from '../smartRepositoryTheme';
import { plainTextFromPossiblyHtml } from '../legalRichTextEditorUtils';
import type { RepositoryFeedLayoutId } from '../repositoryFeedLayout';
import type { UniversalEntryCardProps } from './universalEntryCardTypes';

type VaultEntryCardProps = Pick<
    UniversalEntryCardProps,
    | 'dossiers'
    | 'rooms'
    | 'onMoveVaultDocToRoom'
    | 'onBindVaultDoc'
    | 'onDeleteVaultDoc'
    | 'onEditVaultDoc'
    | 'onViewVaultDoc'
    | 'viewingVaultDocId'
> & {
    item: Extract<UniversalEntryCardProps['item'], { kind: 'vault_doc' }>;
    cardRef: React.RefObject<HTMLElement | null>;
    cardClass: string;
    feedLayout?: RepositoryFeedLayoutId;
};

const CARD_ACTION_BTN = `${REPO_CARD_ICON_BTN} relative z-[2] pointer-events-auto`;

export const VaultEntryCard = React.memo(function VaultEntryCard({
    item,
    cardRef,
    cardClass,
    feedLayout = 'grid',
    dossiers,
    rooms,
    onMoveVaultDocToRoom,
    onBindVaultDoc,
    onDeleteVaultDoc,
    onEditVaultDoc,
    onViewVaultDoc,
    viewingVaultDocId,
}: VaultEntryCardProps) {
    const doc = item.doc;
    const isViewing = viewingVaultDocId === doc.id;
    const mediaKind = resolveVaultMediaKind(doc);
    const isImageDoc = mediaKind === 'image';
    const isPdfDoc = mediaKind === 'pdf';
    const layout = resolveRepositoryEntryLayout(doc.lawyerNote ?? '', isImageDoc ? doc : null);
    const imageOnly = isImageDoc && !plainTextFromPossiblyHtml(doc.lawyerNote || '');
    const showHeroImage = isImageDoc && (layout === 'image-dominant' || imageOnly);
    const timestamp = useMemo(
        () => formatRepositoryTimestamp(doc.createdAt ?? doc.updatedAt),
        [doc.createdAt, doc.updatedAt],
    );
    const lawyerNotePlain = useMemo(
        () => plainTextFromPossiblyHtml(doc.lawyerNote || ''),
        [doc.lawyerNote],
    );

    const handleView = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!onViewVaultDoc || isViewing) return;
        void onViewVaultDoc(doc);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!onDeleteVaultDoc) return;
        const ok = await confirmRepositoryAction(`حذف "${doc.title}"؟`);
        if (ok) void onDeleteVaultDoc(doc);
    };

    const actions = (
        <div className={REPO_CARD_ACTIONS} data-testid={`repository-vault-actions-${doc.id}`}>
            <VaultDossierLinkButton
                dossiers={dossiers}
                onConfirm={async (dossier) => onBindVaultDoc(doc, dossier)}
            />
            {rooms && onMoveVaultDocToRoom ? (
                <RepositoryMoveToRoomButton
                    rooms={rooms}
                    currentRoomId={doc.roomId}
                    onMove={(roomId) => onMoveVaultDocToRoom(doc, roomId)}
                />
            ) : null}
            <div className="flex items-center gap-0.5 pointer-events-auto">
                {onViewVaultDoc ? (
                    <button
                        type="button"
                        disabled={isViewing}
                        onClick={handleView}
                        className={`${CARD_ACTION_BTN} disabled:opacity-50`}
                        aria-label={`عرض ${doc.title}`}
                        data-testid={`repository-vault-view-${doc.id}`}
                    >
                        {isViewing ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Eye size={14} />
                        )}
                    </button>
                ) : null}
                {onEditVaultDoc ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEditVaultDoc(doc);
                        }}
                        className={CARD_ACTION_BTN}
                        aria-label={`تعديل ${doc.title}`}
                        data-testid={`repository-vault-edit-${doc.id}`}
                    >
                        <Pencil size={14} />
                    </button>
                ) : null}
                {onDeleteVaultDoc ? (
                    <button
                        type="button"
                        onClick={(e) => void handleDelete(e)}
                        className={`${CARD_ACTION_BTN} hover:text-rose-400`}
                        aria-label={`حذف ${doc.title}`}
                        data-testid={`repository-vault-delete-${doc.id}`}
                    >
                        <Trash2 size={14} />
                    </button>
                ) : null}
            </div>
        </div>
    );

    const meta = (
        <div className={REPO_CARD_META}>
            <span className="text-[10px] tabular-nums text-white/40">{timestamp}</span>
            <RepositoryMediaKindBadge kind={mediaKind} />
        </div>
    );

    /** قائمة أفقية — صورة/أيقونة + نص + أفعال */
    if (feedLayout === 'list') {
        return (
            <article
                ref={cardRef}
                className={`${cardClass} relative`}
                data-testid={`repository-feed-vault-${doc.id}`}
            >
                <div className="flex items-start gap-3 min-w-0">
                    {isImageDoc ? (
                        <button
                            type="button"
                            onClick={handleView}
                            className="shrink-0 size-[4.75rem] overflow-hidden rounded-xl border border-white/[0.08] bg-black/25 cursor-zoom-in touch-manipulation"
                            aria-label={`عرض ${doc.title}`}
                        >
                            <VaultDocDisplayImage
                                doc={doc}
                                alt={doc.title}
                                className={REPO_FEED_THUMB_IMAGE}
                                slot="thumb"
                            />
                        </button>
                    ) : (
                        <span
                            className="shrink-0 size-[4.75rem] inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]"
                            aria-hidden
                        >
                            <FileText size={20} className="text-rose-300/70" />
                        </span>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                        {meta}
                        <h3 className={REPO_CARD_TITLE}>{doc.title}</h3>
                        {lawyerNotePlain ? <p className={REPO_CARD_NOTE}>{lawyerNotePlain}</p> : null}
                    </div>
                </div>
                {actions}
            </article>
        );
    }

    return (
        <article
            ref={cardRef}
            className={`${cardClass} relative`}
            data-testid={`repository-feed-vault-${doc.id}`}
        >
            {meta}

            {showHeroImage ? (
                <button
                    type="button"
                    onClick={handleView}
                    className={`mb-2 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-black/25 cursor-zoom-in touch-manipulation ${
                        imageOnly ? 'hami-repo-img-hero' : ''
                    }`}
                    aria-label={`عرض ${doc.title}`}
                >
                    <VaultDocDisplayImage doc={doc} alt={doc.title} slot="feed" />
                </button>
            ) : null}

            <div className={isImageDoc && !showHeroImage ? 'flex gap-2.5 items-start' : undefined}>
                <div className="min-w-0 flex-1 space-y-1">
                    <h3 className={REPO_CARD_TITLE}>{doc.title}</h3>
                    {lawyerNotePlain ? <p className={REPO_CARD_NOTE}>{lawyerNotePlain}</p> : null}
                    {!lawyerNotePlain && isPdfDoc ? (
                        <p className="text-[11px] text-white/35 flex items-center gap-1.5">
                            <FileText size={12} className="shrink-0 text-rose-300/70" aria-hidden />
                            مستند جاهز للعرض
                        </p>
                    ) : null}
                </div>

                {isImageDoc && !showHeroImage ? (
                    <button
                        type="button"
                        onClick={handleView}
                        className="shrink-0 size-[4.25rem] rounded-xl overflow-hidden border border-white/[0.08] bg-black/25 cursor-zoom-in touch-manipulation"
                        aria-label={`عرض ${doc.title}`}
                    >
                        <VaultDocDisplayImage
                            doc={doc}
                            alt={doc.title}
                            className={REPO_FEED_THUMB_IMAGE}
                            slot="thumb"
                        />
                    </button>
                ) : null}
            </div>

            {actions}
        </article>
    );
});
