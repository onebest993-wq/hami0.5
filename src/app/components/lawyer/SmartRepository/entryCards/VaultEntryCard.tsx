import React, { useMemo } from 'react';
import { FileText } from '@/app/components/ui/icons/FileText';
import {
    formatRepositoryTimestamp,
    resolveRepositoryEntryLayout,
} from '@/app/services/repository/repositoryUnifiedFeed';
import { resolveVaultMediaKind } from '@/app/services/vault/vaultDocUtils';
import { REPO_FEED_THUMB_IMAGE, VaultDocDisplayImage } from '../VaultDocDisplayImage';
import { confirmRepositoryAction } from '../repositoryDialog';
import { RepositoryMediaKindBadge } from '../RepositoryMediaKindBadge';
import {
    REPO_CARD_META,
    REPO_CARD_NOTE,
    REPO_CARD_TIMESTAMP,
    REPO_CARD_TITLE,
} from '../smartRepositoryTheme';
import { plainTextFromPossiblyHtml } from '../legalRichTextEditorUtils';
import type { RepositoryFeedLayoutId } from '../repositoryFeedLayout';
import type { UniversalEntryCardProps } from './universalEntryCardTypes';
import { VaultEntryCardActions } from './VaultEntryCardActions';

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
        <VaultEntryCardActions
            doc={doc}
            dossiers={dossiers}
            rooms={rooms}
            onMoveVaultDocToRoom={onMoveVaultDocToRoom}
            onBindVaultDoc={onBindVaultDoc}
            onDeleteVaultDoc={onDeleteVaultDoc}
            onEditVaultDoc={onEditVaultDoc}
            onViewVaultDoc={onViewVaultDoc}
            isViewing={isViewing}
            onView={handleView}
            onDelete={handleDelete}
        />
    );

    const meta = (
        <div className={REPO_CARD_META}>
            <span className={REPO_CARD_TIMESTAMP}>{timestamp}</span>
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
                <div className="hami-repo-card-list-main flex items-start gap-3 min-w-0">
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
                        <h3 className={REPO_CARD_TITLE} data-testid="repository-entry-title">
                            {doc.title}
                        </h3>
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
                    <h3 className={REPO_CARD_TITLE} data-testid="repository-entry-title">
                        {doc.title}
                    </h3>
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
