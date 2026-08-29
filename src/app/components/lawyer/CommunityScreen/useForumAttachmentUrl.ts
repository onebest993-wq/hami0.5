import { useEffect, useRef, useState } from 'react';
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

/*
 * المرفق يصل كثيراً حرفاً داخل JSX، فمرجعه يتبدّل كل رسم. لو عُلِّق الأثر على
 * المرجع لدارت الحلقة: جلب ← تحديث حالة ← رسم ← كائن جديد ← جلب. المفتاح
 * محتوى لا عنوان ذاكرة، فلا يعيد الجلب إلا حين يتبدّل المرفق فعلاً.
 */
function attachmentIdentity(attachment: CommunityAttachment | null | undefined): string {
    if (!attachment) return '';
    const parts = attachment as unknown as Record<string, unknown>;
    return [
        String(parts.id ?? ''),
        String(parts.path ?? ''),
        String(attachment.storagePath ?? ''),
        String(attachment.type ?? ''),
        String(attachment.name ?? ''),
        String(attachment.url ?? ''),
    ].join('|');
}

export function useForumAttachmentUrl(
    attachment: CommunityAttachment | null | undefined,
    options?: { enabled?: boolean },
): {
    url: string | null;
    loading: boolean;
} {
    const enabled = options?.enabled !== false;
    const [url, setUrl] = useState<string | null>(() => getImmediateAttachmentUrl(attachment));
    const [loading, setLoading] = useState(
        Boolean(enabled && attachment && !getImmediateAttachmentUrl(attachment)),
    );

    const attachmentRef = useRef(attachment);
    attachmentRef.current = attachment;
    const attachmentKey = attachmentIdentity(attachment);

    useEffect(() => {
        let cancelled = false;
        let objectUrlToRevoke: string | null = null;
        const attachment = attachmentRef.current;
        const immediateUrl = getImmediateAttachmentUrl(attachment);

        if (!enabled) {
            setLoading(false);
            if (immediateUrl) setUrl(immediateUrl);
            return;
        }

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
    }, [attachmentKey, enabled]);

    return { url, loading };
}
