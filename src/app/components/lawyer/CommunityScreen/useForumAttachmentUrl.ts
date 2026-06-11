import { useEffect, useState } from 'react';
import type { CommunityAttachment } from '@/app/services/lawyer-cloud';
import { resolveCommunityAttachmentUrl } from '@/app/services/forumAttachmentService';

export function useForumAttachmentUrl(attachment: CommunityAttachment | null | undefined): {
    url: string | null;
    loading: boolean;
} {
    const [url, setUrl] = useState<string | null>(attachment?.url ?? null);
    const [loading, setLoading] = useState(Boolean(attachment));

    useEffect(() => {
        let cancelled = false;
        let objectUrlToRevoke: string | null = null;

        if (!attachment) {
            setUrl(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        void resolveCommunityAttachmentUrl(attachment).then((resolved) => {
            if (cancelled) {
                if (resolved?.startsWith('blob:') && resolved !== attachment.url) {
                    try { URL.revokeObjectURL(resolved); } catch { /* ignore */ }
                }
                return;
            }
            if (resolved?.startsWith('blob:') && resolved !== attachment.url) {
                objectUrlToRevoke = resolved;
            }
            setUrl(resolved);
            setLoading(false);
        });

        return () => {
            cancelled = true;
            if (objectUrlToRevoke) {
                try { URL.revokeObjectURL(objectUrlToRevoke); } catch { /* ignore */ }
            }
        };
    }, [attachment?.url, attachment?.storagePath, attachment?.type, attachment?.name]);

    return { url, loading };
}
