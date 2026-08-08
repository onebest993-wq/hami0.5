import React from 'react';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { RepositoryEntryLayoutMode } from '@/app/services/repository/repositoryUnifiedFeed';
import { sanitizeRichNoteHtml } from './legalRichTextEditorUtils';
import { REPO_FEED_IMAGE, REPO_FEED_THUMB_IMAGE, VaultDocDisplayImage } from './VaultDocDisplayImage';

type RepositoryEntryContentLayoutProps = {
    layout: RepositoryEntryLayoutMode;
    title: string;
    bodyHtml: string;
    attachment?: SmartVaultDoc | null;
    voiceSlot?: React.ReactNode;
    className?: string;
    bodyClassName?: string;
    titleClassName?: string;
};

export function RepositoryEntryContentLayout({
    layout,
    title,
    bodyHtml,
    attachment,
    voiceSlot,
    className = '',
    bodyClassName = '',
    titleClassName = '',
}: RepositoryEntryContentLayoutProps) {
    const safeHtml = sanitizeRichNoteHtml(bodyHtml);
    const imageAttachment = attachment?.type === 'image' ? attachment : null;

    if (voiceSlot) {
        return (
            <div className={className}>
                <h3 className={`font-bold text-[#F4F0E8] mb-2 ${titleClassName}`}>{title}</h3>
                {voiceSlot}
            </div>
        );
    }

    if (layout === 'image-dominant' && imageAttachment) {
        return (
            <div className={className}>
                <div className="mb-2 rounded-xl overflow-hidden border border-white/10 bg-[#0A0F1C]/40 flex justify-center">
                    <VaultDocDisplayImage
                        doc={imageAttachment}
                        alt={imageAttachment.title ?? title}
                        className={REPO_FEED_IMAGE}
                    />
                </div>
                <h3 className="font-bold text-[#F4F0E8] mb-1.5">{title}</h3>
                {safeHtml ? (
                    <p
                        className={`text-xs text-white/55 leading-relaxed border-t border-white/[0.06] pt-2 line-clamp-3 ${bodyClassName}`}
                        dangerouslySetInnerHTML={{ __html: safeHtml }}
                    />
                ) : null}
            </div>
        );
    }

    if (layout === 'text-dominant' && imageAttachment) {
        return (
            <div className={className}>
                <h3 className={`font-bold text-[#F4F0E8] mb-2 ${titleClassName}`}>{title}</h3>
                <div
                    className={`text-sm text-white/65 leading-relaxed mb-3 line-clamp-3 ${bodyClassName}`}
                    dangerouslySetInnerHTML={{ __html: safeHtml }}
                />
                <div className="flex justify-end">
                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-[#0A0F1C]/40 flex items-center justify-center">
                        <VaultDocDisplayImage
                            doc={imageAttachment}
                            alt={imageAttachment.title ?? title}
                            className={REPO_FEED_THUMB_IMAGE}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            <h3 className={`font-bold text-[#F4F0E8] mb-2 line-clamp-2 ${titleClassName}`}>{title}</h3>
            <div
                className={`text-sm text-white/65 leading-relaxed line-clamp-3 ${bodyClassName}`}
                dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
        </div>
    );
}
