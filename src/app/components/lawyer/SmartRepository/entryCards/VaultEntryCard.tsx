import React, { useMemo } from 'react';
import { Eye, Loader2, Pencil, Trash2 } from 'lucide-react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import {
    formatRepositoryTimestamp,
    resolveRepositoryEntryLayout,
} from '@/app/services/repository/repositoryUnifiedFeed';
import { VaultDossierLinkButton } from '../VaultDossierLinkButton';
import { VaultDocDisplayImage } from '../VaultDocDisplayImage';
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
    const layout = resolveRepositoryEntryLayout(doc.lawyerNote ?? '', doc.type === 'image' ? doc : null);
    const timestamp = useMemo(
        () => formatRepositoryTimestamp(doc.createdAt ?? doc.updatedAt),
        [doc.createdAt, doc.updatedAt],
    );

    return (
        <article ref={cardRef} className={cardClass} data-testid={`repository-feed-vault-${doc.id}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-[11px] text-white/45">{timestamp}</span>
                <span className={REPO_BADGE_GOLD}>📎 ملف / صورة</span>
            </div>
            {layout === 'image-dominant' && doc.type === 'image' ? (
                <>
                    <div className="mb-2 rounded-xl overflow-hidden border border-white/10">
                        <VaultDocDisplayImage
                            doc={doc}
                            alt={doc.title}
                            className="w-full max-h-[min(38vh,280px)] object-cover"
                        />
                    </div>
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
                    {doc.type === 'image' ? (
                        <div className="flex justify-end mb-3">
                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                                <VaultDocDisplayImage
                                    doc={doc}
                                    alt={doc.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    ) : null}
                </>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06] mt-auto">
                <VaultDossierLinkButton
                    dossiers={dossiers}
                    onConfirm={async (dossier) => onBindVaultDoc(doc, dossier)}
                />
                <div className="flex items-center gap-1">
                    {onViewVaultDoc ? (
                        <button
                            type="button"
                            disabled={isViewing}
                            onClick={(e) => {
                                e.stopPropagation();
                                void onViewVaultDoc(doc);
                            }}
                            className={`${REPO_CARD_ICON_BTN} text-white/45 hover:text-[#E6C673] disabled:opacity-50`}
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
                                e.stopPropagation();
                                onEditVaultDoc(doc);
                            }}
                            className={`${REPO_CARD_ICON_BTN} text-white/45 hover:text-[#E6C673]`}
                            aria-label="تعديل"
                            data-testid={`repository-vault-edit-${doc.id}`}
                        >
                            <Pencil size={14} />
                        </button>
                    ) : null}
                    {onDeleteVaultDoc ? (
                        <button
                            type="button"
                            onClick={async () => {
                                const ok = await SmartDialog.confirm(`حذف "${doc.title}"؟`);
                                if (ok) void onDeleteVaultDoc(doc);
                            }}
                            className={`${REPO_CARD_ICON_BTN} text-white/40 hover:text-red-400`}
                            aria-label="حذف"
                        >
                            <Trash2 size={14} />
                        </button>
                    ) : null}
                </div>
            </div>
        </article>
    );
});
