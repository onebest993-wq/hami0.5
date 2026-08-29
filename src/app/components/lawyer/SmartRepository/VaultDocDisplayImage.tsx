import React, { useCallback, useState } from 'react';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { useVaultDocDisplayUrl } from './useVaultDocDisplayUrl';

type VaultDocDisplayImageProps = {
    doc: SmartVaultDoc;
    alt: string;
    className?: string;
    /** feed = معاينة متكيّفة — thumb = مصغّرة — tile = مربع تغطية للمعرض */
    slot?: 'feed' | 'thumb' | 'tile';
};

/** حدود التكيّف: لا مبالغة طولية/عرضية */
const FEED_MAX_H = 16 * 16; // 16rem
const FEED_MIN_RATIO = 0.55;
const FEED_MAX_RATIO = 1.9;

const REPO_FEED_IMAGE = 'hami-repo-feed-img';
const REPO_FEED_THUMB_IMAGE = 'hami-repo-thumb-img';

/**
 * دائماً يحجز مساحة — لا يُرجع null حتى لا تقفز البطاقة عند وصول رابط الصورة.
 * feed: يعرض بنسبة الصورة الطبيعية ضمن max-height/width معتدلة.
 */
export function VaultDocDisplayImage({
    doc,
    alt,
    className,
    slot = 'feed',
}: VaultDocDisplayImageProps) {
    const url = useVaultDocDisplayUrl(doc);
    const isThumb = slot === 'thumb';
    const isTile = slot === 'tile';
    const [aspect, setAspect] = useState<number | null>(null);
    const eager = Boolean(url && (url.startsWith('blob:') || url.startsWith('data:')));

    const onImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (!img.naturalWidth || !img.naturalHeight) return;
        const raw = img.naturalWidth / img.naturalHeight;
        setAspect(Math.min(FEED_MAX_RATIO, Math.max(FEED_MIN_RATIO, raw)));
    }, []);

    const feedSlotStyle =
        !isThumb && !isTile && aspect
            ? ({
                  aspectRatio: String(aspect),
                  maxHeight: `${FEED_MAX_H}px`,
                  width: '100%',
              } as React.CSSProperties)
            : undefined;

    const slotClass = isTile
        ? 'hami-repo-img-slot hami-repo-img-slot--tile'
        : isThumb
          ? 'hami-repo-img-slot hami-repo-img-slot--thumb'
          : 'hami-repo-img-slot hami-repo-img-slot--feed';

    return (
        <span className={slotClass} style={feedSlotStyle} aria-busy={!url}>
            {url ? (
                <img
                    src={url}
                    alt={alt}
                    className={className ?? (isThumb || isTile ? REPO_FEED_THUMB_IMAGE : REPO_FEED_IMAGE)}
                    loading={eager ? 'eager' : 'lazy'}
                    fetchPriority={eager ? 'high' : 'low'}
                    decoding="async"
                    onLoad={isThumb || isTile ? undefined : onImgLoad}
                />
            ) : (
                <span className="hami-repo-img-slot__pulse" aria-hidden />
            )}
        </span>
    );
}

export { REPO_FEED_IMAGE, REPO_FEED_THUMB_IMAGE };
