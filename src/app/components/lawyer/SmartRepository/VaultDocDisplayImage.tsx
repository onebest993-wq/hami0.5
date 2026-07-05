import React from 'react';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { useVaultDocDisplayUrl } from './useVaultDocDisplayUrl';

type VaultDocDisplayImageProps = {
    doc: SmartVaultDoc;
    alt: string;
    className?: string;
};

const REPO_FEED_IMAGE =
    'block mx-auto max-w-full max-h-[min(42vh,320px)] w-auto h-auto object-contain';
const REPO_FEED_THUMB_IMAGE = 'block w-full h-full object-contain';

export function VaultDocDisplayImage({
    doc,
    alt,
    className,
}: VaultDocDisplayImageProps) {
    const url = useVaultDocDisplayUrl(doc);
    if (!url) return null;
    const resolvedClass = className ?? REPO_FEED_IMAGE;
    const eager = url.startsWith('blob:') || url.startsWith('data:');
    return (
        <img
            src={url}
            alt={alt}
            className={resolvedClass}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
        />
    );
}

export { REPO_FEED_IMAGE, REPO_FEED_THUMB_IMAGE };
