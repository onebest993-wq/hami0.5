import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { LawyerStorage } from '@/app/services/lawyer-cloud';
import {
    createInstantForumAttachmentPreview,
    persistForumAttachmentFile,
} from '@/app/services/forumAttachmentService';
import { isSafeForumAttachmentUrl } from '@/app/services/forum/forumUrlSafety';
import { FORUM_ATTACHMENT_MAX_BYTES } from '../communityScreenConstants';
import { withForumAsyncTimeout } from '../forumAsync';
import { revokeForumBlobUrl } from '../forumBlobUrl';

const FORUM_ATTACHMENT_UPLOAD_TIMEOUT_MS = 8_000;

export function useCommunityAddQuestionAttachment(
    currentUserId: string | null,
    persistedUserId: string | null,
) {
    const [newAttachment, setNewAttachment] = useState<CommunityPost['attachment']>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const pendingAttachmentFileRef = useRef<File | null>(null);
    const newAttachmentRef = useRef(newAttachment);
    newAttachmentRef.current = newAttachment;

    useEffect(() => {
        return () => {
            revokeForumBlobUrl(newAttachmentRef.current?.url);
        };
    }, []);

    const removeAttachment = useCallback(() => {
        pendingAttachmentFileRef.current = null;
        setNewAttachment((prev) => {
            revokeForumBlobUrl(prev?.url);
            return null;
        });
    }, []);

    const applyInstantAttachmentPreview = useCallback(
        (file: File, kind: 'image' | 'document' | 'audio') => {
            const fallbackMime =
                kind === 'image' ? 'image/jpeg' : kind === 'audio' ? 'audio/webm' : 'application/octet-stream';
            const instant = createInstantForumAttachmentPreview(file);
            setNewAttachment((prev) => {
                revokeForumBlobUrl(prev?.url);
                return {
                    type: kind,
                    url: instant.url,
                    name: file.name,
                    mimeType: file.type || fallbackMime,
                    storagePath: instant.storagePath,
                };
            });
        },
        [],
    );

    const handleUploadAttachment = useCallback(
        async (file: File, kind: 'image' | 'document' | 'audio') => {
            if (file.size > FORUM_ATTACHMENT_MAX_BYTES) {
                SmartToast.warning('حجم الملف كبير جداً (الحد 25MB)');
                return;
            }
            if (
                kind === 'image' &&
                !file.type.startsWith('image/') &&
                !/\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name)
            ) {
                SmartToast.warning('يرجى اختيار صورة صالحة');
                return;
            }
            if (
                kind === 'audio' &&
                !file.type.startsWith('audio/') &&
                !/\.(webm|ogg|mp3|m4a|wav)$/i.test(file.name)
            ) {
                SmartToast.warning('يرجى تسجيل مقطع صوتي صالح');
                return;
            }

            flushSync(() => {
                pendingAttachmentFileRef.current = file;
                applyInstantAttachmentPreview(file, kind);
            });
            SmartToast.success(kind === 'audio' ? 'تم إرفاق المقطع الصوتي' : 'تم إرفاق الملف');

            void Promise.resolve().then(() =>
                persistForumAttachmentFile(file)
                    .then((storagePath) => {
                        setNewAttachment((prev) =>
                            prev && prev.name === file.name ? { ...prev, storagePath } : prev,
                        );
                    })
                    .catch(() => undefined),
            );

            const userId = currentUserId ?? persistedUserId ?? null;
            if (!userId) return;

            void (async () => {
                try {
                    const storageCategory =
                        kind === 'image' ? 'forum-media' : kind === 'audio' ? 'audio' : 'drafts';
                    const uploaded = await withForumAsyncTimeout(
                        LawyerStorage.uploadSmartFile(userId, file, storageCategory),
                        FORUM_ATTACHMENT_UPLOAD_TIMEOUT_MS,
                        null,
                    );
                    if (!uploaded?.path && !uploaded?.fullPath) return;
                    const cloudPath = uploaded.path || uploaded.fullPath;
                    const downloadUrl = uploaded.downloadUrl?.trim() || '';
                    if (!downloadUrl || !isSafeForumAttachmentUrl(downloadUrl) || downloadUrl.startsWith('blob:')) {
                        return;
                    }
                    setNewAttachment((prev) => {
                        if (!prev || prev.name !== file.name) return prev;
                        return {
                            ...prev,
                            storagePath: cloudPath,
                            bucket: uploaded.bucket || (kind === 'image' ? 'forum-media' : prev.bucket),
                            url: downloadUrl,
                        };
                    });
                } catch {
                    /* الرفع النهائي يتم عند النشر */
                }
            })();
        },
        [applyInstantAttachmentPreview, currentUserId, persistedUserId],
    );

    return {
        newAttachment,
        setNewAttachment,
        removeAttachment,
        handleUploadAttachment,
        pendingAttachmentFileRef,
        imageInputRef,
        docInputRef,
    };
}
