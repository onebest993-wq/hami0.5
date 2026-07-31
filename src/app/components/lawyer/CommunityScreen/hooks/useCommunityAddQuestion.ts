import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { LawyerStorage } from '@/app/services/lawyer-cloud';
import { mergeCommunityPostsById, sortCommunityPosts } from '@/app/services/cloud/lawyerCommunityCloud';
import { ForumApiService } from '@/app/services/forumApiService';
import {
    createInstantForumAttachmentPreview,
    persistForumAttachmentFile,
    prepareForumAttachmentForPublish,
} from '@/app/services/forumAttachmentService';
import { applyAutoRedaction } from '../utils';
import { formatRepositoryTag, resolveCommunityPostTags } from '../repositoryTagUtils';
import {
    FORUM_ATTACHMENT_MAX_BYTES,
    VOICE_POST_DEFAULT_CONTENT,
    VOICE_RECORD_MAX_SEC,
} from '../communityScreenConstants';
import { prefetchCommunityAddQuestionOverlay } from '../communityOverlayPrefetch';
import type { CommunityDualPostLists } from './useCommunityDualPostLists';
import { withForumAsyncTimeout } from '../forumAsync';

const FORUM_ATTACHMENT_UPLOAD_TIMEOUT_MS = 8_000;

export type UseCommunityAddQuestionParams = {
    lists: Pick<CommunityDualPostLists, 'setPosts' | 'removePostFromList'>;
    currentUserId: string | null;
    persistedUserId?: string | null;
    authUser: { user_metadata?: { fullName?: string }; email?: string } | null;
    isBanned: boolean;
    activeGroupId: string | null;
    appendPublishedGroupPost: (saved: CommunityPost) => void;
    /** بعد نشر ناجح في الخلاصة العامة — إظهار المنشور فوراً */
    onForumPostPublished?: () => void;
};

export function useCommunityAddQuestion({
    lists,
    currentUserId,
    persistedUserId = null,
    authUser,
    isBanned,
    activeGroupId,
    appendPublishedGroupPost,
    onForumPostPublished,
}: UseCommunityAddQuestionParams) {
    const { setPosts } = lists;
    const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
    const [newPostText, setNewPostText] = useState('');
    const [newTagText, setNewTagText] = useState('');
    const [newIsAnonymous, setNewIsAnonymous] = useState(false);
    const [newIsUrgent, setNewIsUrgent] = useState(false);
    const [newAttachment, setNewAttachment] = useState<CommunityPost['attachment']>(null);
    const [submittingPost, setSubmittingPost] = useState(false);
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [voiceRecordingSec, setVoiceRecordingSec] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const voiceChunksRef = useRef<Blob[]>([]);
    const voiceStreamRef = useRef<MediaStream | null>(null);
    const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const pendingAttachmentFileRef = useRef<File | null>(null);
    const submitInFlightRef = useRef(false);
    const newAttachmentRef = useRef(newAttachment);
    newAttachmentRef.current = newAttachment;

    useEffect(() => {
        return () => {
            const att = newAttachmentRef.current;
            if (att?.url && att.url.startsWith('blob:')) {
                try {
                    URL.revokeObjectURL(att.url);
                } catch {
                    /* ignore */
                }
            }
        };
    }, []);

    useEffect(() => {
        return () => {
            if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
            if (mediaRecorderRef.current?.state !== 'inactive') {
                try {
                    mediaRecorderRef.current?.stop();
                } catch {
                    /* ignore */
                }
            }
            voiceStreamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    useEffect(() => {
        if (isAddQuestionOpen || !isRecordingVoice) return;
        const rec = mediaRecorderRef.current;
        if (rec && rec.state !== 'inactive') {
            try {
                rec.stop();
            } catch {
                /* ignore */
            }
        }
        if (voiceTimerRef.current) {
            clearInterval(voiceTimerRef.current);
            voiceTimerRef.current = null;
        }
        setIsRecordingVoice(false);
    }, [isAddQuestionOpen, isRecordingVoice]);

    const removeAttachment = useCallback(() => {
        pendingAttachmentFileRef.current = null;
        setNewAttachment((prev) => {
            if (prev?.url && prev.url.startsWith('blob:')) {
                try {
                    URL.revokeObjectURL(prev.url);
                } catch {
                    /* ignore */
                }
            }
            return null;
        });
    }, []);

    const applyInstantAttachmentPreview = useCallback(
        (file: File, kind: 'image' | 'document' | 'audio') => {
            const fallbackMime =
                kind === 'image' ? 'image/jpeg' : kind === 'audio' ? 'audio/webm' : 'application/octet-stream';
            const instant = createInstantForumAttachmentPreview(file);
            setNewAttachment((prev) => {
                if (prev?.url?.startsWith('blob:')) {
                    try {
                        URL.revokeObjectURL(prev.url);
                    } catch {
                        /* ignore */
                    }
                }
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
            SmartToast.success(
                kind === 'audio' ? 'تم إرفاق المقطع الصوتي' : 'تم إرفاق الملف',
            );

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
                    const storageCategory = kind === 'audio' ? 'audio' : 'drafts';
                    const uploaded = await withForumAsyncTimeout(
                        LawyerStorage.uploadSmartFile(userId, file, storageCategory),
                        FORUM_ATTACHMENT_UPLOAD_TIMEOUT_MS,
                        null,
                    );
                    if (!uploaded?.path && !uploaded?.fullPath) return;
                    setNewAttachment((prev) => {
                        if (!prev || prev.name !== file.name) return prev;
                        return {
                            ...prev,
                            storagePath: uploaded.path ?? uploaded.fullPath ?? prev.storagePath,
                        };
                    });
                } catch {
                    /* blob preview يكفي للنشر المحلي */
                }
            })();
        },
        [applyInstantAttachmentPreview, currentUserId, persistedUserId],
    );

    const stopVoiceRecording = useCallback(() => {
        const rec = mediaRecorderRef.current;
        if (rec && rec.state !== 'inactive') {
            try {
                rec.stop();
            } catch {
                /* ignore */
            }
        }
        if (voiceTimerRef.current) {
            clearInterval(voiceTimerRef.current);
            voiceTimerRef.current = null;
        }
        setIsRecordingVoice(false);
    }, []);

    const toggleVoiceRecording = useCallback(async () => {
        if (isRecordingVoice) {
            stopVoiceRecording();
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            SmartToast.warning('التسجيل الصوتي غير مدعوم في هذا المتصفح');
            return;
        }

        if (typeof window !== 'undefined' && !window.isSecureContext) {
            SmartToast.warning('التسجيل الصوتي يتطلب اتصالاً آمناً (HTTPS)');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            voiceStreamRef.current = stream;
            voiceChunksRef.current = [];

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) voiceChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                voiceStreamRef.current = null;

                const blob = new Blob(voiceChunksRef.current, { type: mimeType });
                if (blob.size === 0) {
                    SmartToast.warning('لم يُسجَّل أي صوت');
                    return;
                }
                const ext = mimeType.includes('webm') ? 'webm' : 'ogg';
                const fileName = `forum-voice-${Date.now()}.${ext}`;
                const file = new File([blob], fileName, {
                    type: mimeType.split(';')[0] ?? 'audio/webm',
                });
                await handleUploadAttachment(file, 'audio');
            };

            recorder.onerror = () => {
                SmartToast.error('تعذّر التسجيل الصوتي');
                stopVoiceRecording();
            };

            recorder.start(250);
            setIsRecordingVoice(true);
            setVoiceRecordingSec(0);
            voiceTimerRef.current = setInterval(() => {
                setVoiceRecordingSec((prev) => {
                    const next = prev + 1;
                    if (next >= VOICE_RECORD_MAX_SEC) {
                        const activeRec = mediaRecorderRef.current;
                        if (activeRec && activeRec.state !== 'inactive') {
                            try {
                                activeRec.stop();
                            } catch {
                                /* ignore */
                            }
                        }
                        if (voiceTimerRef.current) {
                            clearInterval(voiceTimerRef.current);
                            voiceTimerRef.current = null;
                        }
                        setIsRecordingVoice(false);
                        SmartToast.info('تم الوصول للحد الأقصى للتسجيل (3 دقائق)');
                    }
                    return next;
                });
            }, 1000);
        } catch {
            SmartToast.warning('لم نتمكن من الوصول إلى المايكروفون. تأكد من الإذن.');
        }
    }, [handleUploadAttachment, isRecordingVoice, stopVoiceRecording]);

    const handleAddPost = useCallback(async () => {
        if (submitInFlightRef.current) return;
        if (!currentUserId) {
            SmartToast.warning('سجّل الدخول للنشر');
            return;
        }
        if (isBanned) {
            SmartToast.warning('حسابك محظور من النشر في المنتدى');
            return;
        }
        const hasVoiceAttachment = newAttachment?.type === 'audio';
        const rawContent = newPostText.trim();
        const contentForPublish =
            rawContent.length >= 10
                ? rawContent
                : hasVoiceAttachment
                  ? VOICE_POST_DEFAULT_CONTENT
                  : '';
        if (contentForPublish.length < 10) {
            SmartToast.warning('اكتب تفاصيل أوضح (10 أحرف على الأقل) أو سجّل مقطعاً صوتياً');
            return;
        }
        submitInFlightRef.current = true;
        setSubmittingPost(true);
        let finalContent = contentForPublish;
        const redaction = applyAutoRedaction(contentForPublish);
        finalContent = redaction.redacted.trim();
        if (redaction.changed) {
            SmartToast.show('درع الخصوصية فعّال', {
                type: 'info',
                description: 'تم تنقيح البيانات حفاظاً على سرية الموكل.',
                duration: 3500,
            });
        }
        if (!finalContent) {
            SmartToast.warning('لا يمكن نشر محتوى فارغ');
            setSubmittingPost(false);
            return;
        }

        let attachmentForPublish = newAttachment;
        if (attachmentForPublish && currentUserId) {
            try {
                attachmentForPublish = await prepareForumAttachmentForPublish(
                    attachmentForPublish,
                    currentUserId,
                    pendingAttachmentFileRef.current,
                );
            } catch {
                SmartToast.error('تعذّر رفع المرفق — تحقق من الاتصال وحاول مرة أخرى');
                setSubmittingPost(false);
                return;
            }
        }
        pendingAttachmentFileRef.current = null;

        const id =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const manualTags = newTagText
            .split(/[,|\s]+/g)
            .map((x) => x.trim())
            .filter(Boolean)
            .map((x) => formatRepositoryTag(x))
            .filter(Boolean);
        const tags = resolveCommunityPostTags(contentForPublish, manualTags);
        const now = new Date().toISOString();
        const post: CommunityPost = {
            id,
            authorId: currentUserId,
            authorName: authUser?.user_metadata?.fullName || authUser?.email || 'محامي',
            content: finalContent,
            tags,
            createdAt: now,
            updatedAt: now,
            attachment: attachmentForPublish,
            upvoterIds: [],
            comments: [],
            bestCommentId: null,
            isAnonymous: newIsAnonymous || undefined,
            isUrgent: newIsUrgent || undefined,
            ...(activeGroupId ? { groupId: activeGroupId } : {}),
        };
        const optimistic = {
            ...post,
            tags: resolveCommunityPostTags(contentForPublish, tags),
        };

        flushSync(() => {
            setIsAddQuestionOpen(false);
            setNewPostText('');
            setNewTagText('');
            setNewIsAnonymous(false);
            setNewIsUrgent(false);
            setNewAttachment(null);
            pendingAttachmentFileRef.current = null;

            if (activeGroupId) {
                appendPublishedGroupPost(optimistic);
            } else {
                onForumPostPublished?.();
                setPosts((prev) => sortCommunityPosts(mergeCommunityPostsById(prev, [optimistic])));
            }
        });
        SmartToast.success(activeGroupId ? 'تم نشر المنشور في المجموعة' : 'تم نشر الاستشارة');

        try {
            const saved = await ForumApiService.createPost(post);
            if (post.attachment && !saved.attachment) {
                SmartToast.warning('نُشر المنشور لكن المرفق لم يُحفظ — أعد الإرفاق عند الحاجة');
            }
            const normalized = {
                ...saved,
                attachment: saved.attachment ?? post.attachment ?? optimistic.attachment ?? null,
                tags: resolveCommunityPostTags(saved.content, saved.tags),
            };
            if (saved.groupId ?? activeGroupId) {
                appendPublishedGroupPost(normalized);
            } else {
                setPosts((prev) =>
                    sortCommunityPosts(mergeCommunityPostsById(prev, [normalized])),
                );
            }
        } catch (err) {
            lists.removePostFromList(post.id);
            const message =
                err instanceof Error && err.message.trim()
                    ? err.message
                    : 'تعذّر نشر الاستشارة';
            SmartToast.error(message);
        } finally {
            submitInFlightRef.current = false;
            setSubmittingPost(false);
        }
    }, [
        activeGroupId,
        appendPublishedGroupPost,
        authUser,
        currentUserId,
        isBanned,
        newAttachment,
        newIsAnonymous,
        newIsUrgent,
        newPostText,
        newTagText,
        setPosts,
        lists,
        onForumPostPublished,
    ]);

    const isAddQuestionOpenRef = useRef(false);
    isAddQuestionOpenRef.current = isAddQuestionOpen;

    const openAddQuestion = useCallback(() => {
        prefetchCommunityAddQuestionOverlay();
        isAddQuestionOpenRef.current = true;
        flushSync(() => setIsAddQuestionOpen(true));
    }, []);
    const closeAddQuestion = useCallback((options?: { soft?: boolean }) => {
        if (!isAddQuestionOpenRef.current) {
            setIsAddQuestionOpen(false);
            return;
        }
        isAddQuestionOpenRef.current = false;
        /* soft: من useEffect/lifecycle — بلا flushSync (تحذير React) */
        if (options?.soft) {
            setIsAddQuestionOpen(false);
            return;
        }
        flushSync(() => setIsAddQuestionOpen(false));
    }, []);

    return {
        isAddQuestionOpen,
        openAddQuestion,
        closeAddQuestion,
        newPostText,
        setNewPostText,
        newTagText,
        setNewTagText,
        newIsAnonymous,
        setNewIsAnonymous,
        newIsUrgent,
        setNewIsUrgent,
        newAttachment,
        removeAttachment,
        submittingPost,
        isRecordingVoice,
        voiceRecordingSec,
        imageInputRef,
        docInputRef,
        toggleVoiceRecording,
        handleUploadAttachment,
        handleAddPost,
    };
}
