import { useCallback, useEffect, useRef, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { LawyerStorage } from '@/app/services/lawyer-cloud';
import { mergeCommunityPostsById, sortCommunityPosts } from '@/app/services/cloud/lawyerCommunityCloud';
import { ForumApiService } from '@/app/services/forumApiService';
import { cacheForumAttachmentFile } from '@/app/services/forumAttachmentService';
import { applyAutoRedaction } from '../utils';
import { formatRepositoryTag, resolveCommunityPostTags } from '../repositoryTagUtils';
import {
    FORUM_ATTACHMENT_MAX_BYTES,
    VOICE_POST_DEFAULT_CONTENT,
    VOICE_RECORD_MAX_SEC,
} from '../communityScreenConstants';
import type { CommunityDualPostLists } from './useCommunityDualPostLists';

export type UseCommunityAddQuestionParams = {
    lists: Pick<CommunityDualPostLists, 'setPosts'>;
    currentUserId: string | null;
    persistedUserId?: string | null;
    authUser: { user_metadata?: { fullName?: string }; email?: string } | null;
    isBanned: boolean;
    activeGroupId: string | null;
    appendPublishedGroupPost: (saved: CommunityPost) => void;
};

export function useCommunityAddQuestion({
    lists,
    currentUserId,
    persistedUserId = null,
    authUser,
    isBanned,
    activeGroupId,
    appendPublishedGroupPost,
}: UseCommunityAddQuestionParams) {
    const { setPosts } = lists;
    const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
    const [newPostText, setNewPostText] = useState('');
    const [newTagText, setNewTagText] = useState('');
    const [newIsAnonymous, setNewIsAnonymous] = useState(false);
    const [newIsUrgent, setNewIsUrgent] = useState(false);
    const [newAttachment, setNewAttachment] = useState<CommunityPost['attachment']>(null);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [submittingPost, setSubmittingPost] = useState(false);
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [voiceRecordingSec, setVoiceRecordingSec] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const voiceChunksRef = useRef<Blob[]>([]);
    const voiceStreamRef = useRef<MediaStream | null>(null);
    const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
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

    const attachForumFileLocally = useCallback(async (file: File, kind: 'image' | 'document' | 'audio') => {
        const fallbackMime =
            kind === 'image' ? 'image/jpeg' : kind === 'audio' ? 'audio/webm' : 'application/octet-stream';
        const cached = await cacheForumAttachmentFile(file);
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
                url: cached.url,
                name: file.name,
                mimeType: file.type || fallbackMime,
                storagePath: cached.storagePath,
            };
        });
    }, []);

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

            const userId = currentUserId ?? persistedUserId ?? null;
            if (!userId) {
                await attachForumFileLocally(file, kind);
                SmartToast.success(kind === 'audio' ? 'تم إرفاق المقطع الصوتي' : 'تم إرفاق الملف');
                return;
            }

            setUploadingAttachment(true);
            try {
                const storageCategory = kind === 'audio' ? 'audio' : 'drafts';
                const uploaded = await LawyerStorage.uploadSmartFile(userId, file, storageCategory);
                if (!uploaded?.downloadUrl) {
                    throw new Error('missing download url');
                }
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
                        url: uploaded.downloadUrl,
                        name: file.name,
                        mimeType: file.type,
                        storagePath: uploaded.path ?? uploaded.fullPath,
                    };
                });
                SmartToast.success(kind === 'audio' ? 'تم إرفاق المقطع الصوتي' : 'تم إرفاق الملف');
            } catch {
                await attachForumFileLocally(file, kind);
                SmartToast.success(
                    import.meta.env.DEV
                        ? kind === 'audio'
                            ? 'تم إرفاق المقطع الصوتي (معاينة محلية)'
                            : 'تم إرفاق الملف (معاينة محلية)'
                        : kind === 'audio'
                          ? 'تم إرفاق المقطع الصوتي على هذا الجهاز'
                          : 'تم إرفاق الملف على هذا الجهاز',
                );
            } finally {
                setUploadingAttachment(false);
            }
        },
        [attachForumFileLocally, currentUserId, persistedUserId],
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
        if (uploadingAttachment) return;

        if (isRecordingVoice) {
            stopVoiceRecording();
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            SmartToast.warning('التسجيل الصوتي غير مدعوم في هذا المتصفح');
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
    }, [handleUploadAttachment, isRecordingVoice, stopVoiceRecording, uploadingAttachment]);

    const handleAddPost = useCallback(async () => {
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
            attachment: newAttachment,
            upvoterIds: [],
            comments: [],
            bestCommentId: null,
            isAnonymous: newIsAnonymous || undefined,
            isUrgent: newIsUrgent || undefined,
            ...(activeGroupId ? { groupId: activeGroupId } : {}),
        };
        setIsAddQuestionOpen(false);
        setNewPostText('');
        setNewTagText('');
        setNewIsAnonymous(false);
        setNewIsUrgent(false);
        removeAttachment();
        try {
            const saved = await ForumApiService.createPost(post);
            const normalized = {
                ...saved,
                tags: resolveCommunityPostTags(saved.content, saved.tags),
            };
            if (saved.groupId ?? activeGroupId) {
                appendPublishedGroupPost(normalized);
            } else {
                setPosts((prev) =>
                    sortCommunityPosts(mergeCommunityPostsById(prev, [normalized])),
                );
            }
            SmartToast.success(activeGroupId ? 'تم نشر المنشور في المجموعة' : 'تم نشر الاستشارة');
        } catch (err) {
            const message =
                err instanceof Error && err.message.trim()
                    ? err.message
                    : 'تعذّر نشر الاستشارة';
            SmartToast.error(message);
        } finally {
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
        removeAttachment,
        setPosts,
    ]);

    const openAddQuestion = useCallback(() => setIsAddQuestionOpen(true), []);
    const closeAddQuestion = useCallback(() => setIsAddQuestionOpen(false), []);

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
        uploadingAttachment,
        isRecordingVoice,
        voiceRecordingSec,
        imageInputRef,
        docInputRef,
        toggleVoiceRecording,
        handleUploadAttachment,
        handleAddPost,
    };
}
