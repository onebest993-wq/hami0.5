import { useEffect, useState } from 'react';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import { resolveVaultDocUrl } from '@/app/services/vaultUploadService';
import { revokeBlobUrlIfNeeded } from '@/app/services/vault/vaultDocUtils';

/**
 * يحلّ رابط عرض ملف الخزنة — يدعم التخزين المحلي (IDB) والروابط الموقّعة المنتهية.
 */
export function useVaultDocDisplayUrl(doc: SmartVaultDoc | null | undefined): string | null {
    const [url, setUrl] = useState<string | null>(() => doc?.signedUrl?.trim() || null);

    useEffect(() => {
        if (!doc) {
            setUrl(null);
            return;
        }

        let cancelled = false;
        let ownedBlob: string | null = null;
        const cached = doc.signedUrl?.trim() || null;

        if (cached) {
            setUrl(cached);
        }

        void resolveVaultDocUrl(doc).then((resolved) => {
            if (cancelled) {
                revokeBlobUrlIfNeeded(resolved);
                return;
            }
            if (resolved) {
                if (resolved.startsWith('blob:')) ownedBlob = resolved;
                setUrl(resolved);
            } else if (!cached) {
                setUrl(null);
            }
        });

        return () => {
            cancelled = true;
            revokeBlobUrlIfNeeded(ownedBlob);
        };
    }, [doc?.id, doc?.storagePath, doc?.signedUrl, doc?.updatedAt]);

    return url;
}
