import React, { useMemo } from 'react';

import { Eye, Loader2, Pencil, Trash2 } from 'lucide-react';

import {

    formatRepositoryTimestamp,

    resolveRepositoryEntryLayout,

} from '@/app/services/repository/repositoryUnifiedFeed';

import { resolveVaultMediaKind, vaultMediaKindLabel } from '@/app/services/vault/vaultDocUtils';

import { VaultDossierLinkButton } from '../VaultDossierLinkButton';

import { REPO_FEED_IMAGE, REPO_FEED_THUMB_IMAGE, VaultDocDisplayImage } from '../VaultDocDisplayImage';

import { confirmRepositoryAction } from '../repositoryDialog';

import { REPO_BADGE_GOLD, REPO_CARD_ICON_BTN } from '../smartRepositoryTheme';

import type { UniversalEntryCardProps } from './universalEntryCardTypes';



type VaultEntryCardProps = Pick<

    UniversalEntryCardProps,

    | 'dossiers'

    | 'onBindVaultDoc'

    | 'onDeleteVaultDoc'

    | 'onEditVaultDoc'

    | 'onViewVaultDoc'

    | 'viewingVaultDocId'

> & {

    item: Extract<UniversalEntryCardProps['item'], { kind: 'vault_doc' }>;

    cardRef: React.RefObject<HTMLElement | null>;

    cardClass: string;

};



const CARD_ACTION_BTN =

    `${REPO_CARD_ICON_BTN} relative z-[2] pointer-events-auto touch-manipulation`;



export const VaultEntryCard = React.memo(function VaultEntryCard({

    item,

    cardRef,

    cardClass,

    dossiers,

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

    const layout = resolveRepositoryEntryLayout(doc.lawyerNote ?? '', isImageDoc ? doc : null);

    const timestamp = useMemo(

        () => formatRepositoryTimestamp(doc.createdAt ?? doc.updatedAt),

        [doc.createdAt, doc.updatedAt],

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



    return (

        <article

            ref={cardRef}

            className={`${cardClass} relative`}

            data-testid={`repository-feed-vault-${doc.id}`}

        >

            <div className="flex items-start justify-between gap-2 mb-3">

                <span className="text-[11px] text-white/45">{timestamp}</span>

                <span className={REPO_BADGE_GOLD}>

                    {mediaKind === 'image' ? '🖼️' : mediaKind === 'pdf' ? '📄' : mediaKind === 'audio' ? '🎵' : '📎'}{' '}

                    {vaultMediaKindLabel(mediaKind)}

                </span>

            </div>

            {layout === 'image-dominant' && isImageDoc ? (

                <>

                    <button

                        type="button"

                        onClick={handleView}

                        className="mb-2 w-full rounded-xl overflow-hidden border border-white/10 bg-[#0A0F1C]/40 flex justify-center cursor-zoom-in touch-manipulation"

                        aria-label={`عرض ${doc.title}`}

                    >

                        <VaultDocDisplayImage

                            doc={doc}

                            alt={doc.title}

                            className={REPO_FEED_IMAGE}

                        />

                    </button>

                    <h3 className="font-bold text-[#F4F0E8] mb-1 truncate">{doc.title}</h3>

                    {doc.lawyerNote ? (

                        <p className="text-xs text-white/55 border-t border-white/[0.06] pt-2 line-clamp-2">

                            {doc.lawyerNote}

                        </p>

                    ) : null}

                </>

            ) : (

                <>

                    <h3 className="font-bold text-[#F4F0E8] mb-1 truncate">{doc.title}</h3>

                    {doc.lawyerNote ? (

                        <p className="text-sm text-white/60 mb-3 line-clamp-4">{doc.lawyerNote}</p>

                    ) : null}

                    {isImageDoc ? (

                        <div className="flex justify-end mb-3">

                            <div className="w-24 h-24 rounded-lg overflow-hidden border border-white/10 bg-[#0A0F1C]/40 flex items-center justify-center">

                                <VaultDocDisplayImage

                                    doc={doc}

                                    alt={doc.title}

                                    className={REPO_FEED_THUMB_IMAGE}

                                />

                            </div>

                        </div>

                    ) : null}

                </>

            )}

            <div

                className="relative z-[2] flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06] mt-auto pointer-events-auto"

                data-testid={`repository-vault-actions-${doc.id}`}

            >

                <VaultDossierLinkButton

                    dossiers={dossiers}

                    onConfirm={async (dossier) => onBindVaultDoc(doc, dossier)}

                />

                <div className="flex items-center gap-1 pointer-events-auto">

                    {onViewVaultDoc ? (

                        <button

                            type="button"

                            disabled={isViewing}

                            onClick={handleView}

                            className={`${CARD_ACTION_BTN} text-white/45 hover:text-[#E6C673] disabled:opacity-50`}

                            aria-label="عرض"

                            data-testid={`repository-vault-view-${doc.id}`}

                        >

                            {isViewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}

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

                            className={`${CARD_ACTION_BTN} text-white/45 hover:text-[#E6C673]`}

                            aria-label="تعديل"

                            data-testid={`repository-vault-edit-${doc.id}`}

                        >

                            <Pencil size={14} />

                        </button>

                    ) : null}

                    {onDeleteVaultDoc ? (

                        <button

                            type="button"

                            onClick={(e) => void handleDelete(e)}

                            className={`${CARD_ACTION_BTN} text-white/40 hover:text-red-400`}

                            aria-label="حذف"

                            data-testid={`repository-vault-delete-${doc.id}`}

                        >

                            <Trash2 size={14} />

                        </button>

                    ) : null}

                </div>

            </div>

        </article>

    );

});


