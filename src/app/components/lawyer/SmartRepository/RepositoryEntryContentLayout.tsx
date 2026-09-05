import React from 'react';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { RepositoryEntryLayoutMode } from '@/app/services/repository/repositoryUnifiedFeed';
import { stripRepositoryHtml } from '@/app/services/repository/stripRepositoryHtml';
import { REPO_FEED_IMAGE, REPO_FEED_THUMB_IMAGE, VaultDocDisplayImage } from './VaultDocDisplayImage';
import { REPO_CARD_TITLE } from './smartRepositoryTheme';

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

function FeedBodyExcerpt({
    text,
    className,
}: {
    text: string;
    className: string;
}) {
    if (!text) return null;
    return <p className={className}>{text}</p>;
}

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
    const excerpt = stripRepositoryHtml(bodyHtml);
    const imageAttachment = attachment?.type === 'image' ? attachment : null;

    if (voiceSlot) {
        return (
            <div className={className}>
                <h3 className={`${REPO_CARD_TITLE} mb-1.5 ${titleClassName}`}>{title}</h3>
                {voiceSlot}
            </div>
        );
    }

    if (layout === 'image-dominant' && imageAttachment) {
        return (
            <div className={className}>
                <div className="mb-1.5 rounded-xl overflow-hidden border border-white/10 bg-[#0A0F1C]/40 flex justify-center">
                    <VaultDocDisplayImage
                        doc={imageAttachment}
                        alt={imageAttachment.title ?? title}
                        className={REPO_FEED_IMAGE}
                    />
                </div>
                <h3 className={`${REPO_CARD_TITLE} mb-1.5`}>{title}</h3>
                <FeedBodyExcerpt
                    text={excerpt}
                    className={`text-xs text-white/55 leading-relaxed border-t border-white/[0.06] pt-1.5 line-clamp-3 ${bodyClassName}`}
                />
            </div>
        );
    }

    if (layout === 'text-dominant' && imageAttachment) {
        return (
            <div className={className}>
                <h3 className={`${REPO_CARD_TITLE} mb-1.5 ${titleClassName}`}>{title}</h3>
                <FeedBodyExcerpt
                    text={excerpt}
                    className={`text-sm text-white/65 leading-relaxed mb-2 line-clamp-3 ${bodyClassName}`}
                />
                <div className="flex justify-end">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-[#0A0F1C]/40 flex items-center justify-center">
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
            <h3 className={`${REPO_CARD_TITLE} mb-1.5 ${titleClassName}`}>{title}</h3>
            <FeedBodyExcerpt
                text={excerpt}
                className={`text-sm text-white/65 leading-relaxed line-clamp-3 ${bodyClassName}`}
            />
        </div>
    );
}
