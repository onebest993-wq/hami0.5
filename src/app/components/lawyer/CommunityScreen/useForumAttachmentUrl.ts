import { useEffect, useState } from 'react';
import type { CommunityAttachment } from '@/app/services/lawyer-cloud';
import { resolveCommunityAttachmentUrl } from '@/app/services/forumAttachmentService';
import { isSafeForumAttachmentUrl } from '@/app/services/forum/forumUrlSafety';

const RESOLVE_TIMEOUT_MS = 4_000;

function getImmediateAttachmentUrl(attachment: CommunityAttachment | null | undefined): string | null {
    const initial = attachment?.url?.trim() ?? '';
    if (!initial) return null;
    if (initial.startsWith('blob:')) return null;
    if (!isSafeForumAttachmentUrl(initial)) return null;
    return initial;
}

export function useForumAttachmentUrl(attachment: CommunityAttachment | null | undefined): {
    url: string | null;
    loading: boolean;
} {
    const [url, setUrl] = useState<string | null>(() => getImmediateAttachmentUrl(attachment));
    const [loading, setLoading] = useState(Boolean(attachment && !getImmediateAttachmentUrl(attachment)));

    useEffect(() => {
        let cancelled = false;
        let objectUrlToRevoke: string | null = null;
        const immediateUrl = getImmediateAttachmentUrl(attachment);

        if (!attachment) {
            setUrl(null);
            setLoading(false);
            return;
        }

        if (immediateUrl) {
            setUrl(immediateUrl);
            setLoading(false);
        } else {
            setLoading(true);
        }

        const timeoutId = window.setTimeout(() => {
            if (cancelled) return;
            setLoading(false);
            if (!immediateUrl) setUrl(null);
        }, RESOLVE_TIMEOUT_MS);

        void resolveCommunityAttachmentUrl(attachment)
            .then((resolved) => {
                if (cancelled) {
                    if (resolved?.startsWith('blob:') && resolved !== attachment.url) {
                        try {
                            URL.revokeObjectURL(resolved);
                        } catch {
                            /* ignore */
                        }
                    }
                    return;
                }
                window.clearTimeout(timeoutId);
                if (resolved?.startsWith('blob:') && resolved !== attachment.url) {
                    objectUrlToRevoke = resolved;
                }
                setUrl(resolved);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                window.clearTimeout(timeoutId);
                setUrl(immediateUrl);
                setLoading(false);
            });

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
            if (objectUrlToRevoke) {
                try {
                    URL.revokeObjectURL(objectUrlToRevoke);
                } catch {
                    /* ignore */
                }
            }
        };
    }, [attachment]);

    return { url, loading };
}
