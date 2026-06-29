import React from 'react';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import { useVaultDocDisplayUrl } from './useVaultDocDisplayUrl';

type VaultDocDisplayImageProps = {
    doc: SmartVaultDoc;
    alt: string;
    className?: string;
};

export function VaultDocDisplayImage({ doc, alt, className }: VaultDocDisplayImageProps) {
    const url = useVaultDocDisplayUrl(doc);
    if (!url) return null;
    return <img src={url} alt={alt} className={className} loading="lazy" decoding="async" />;
}
