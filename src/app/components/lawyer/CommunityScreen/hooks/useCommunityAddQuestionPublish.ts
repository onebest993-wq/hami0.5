import { useCallback, useRef, useState, type MutableRefObject } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { resolveForumPostPublishContent } from '../communityAddQuestionPublishGuard';
import { peekForumRateLimit } from '../forumRateLimit';
import type { CommunityDualPostLists } from './useCommunityDualPostLists';
import { runCommunityAddQuestionPublish } from './runCommunityAddQuestionPublish';

type UseCommunityAddQuestionPublishParams = {
    lists: Pick<CommunityDualPostLists, 'setPosts' | 'removePostFromList'>;
    currentUserId: string | null;
    authUser: { user_metadata?: { fullName?: string }; email?: string } | null;
    isBanned: boolean;
    activeGroupId: string | null;
    appendPublishedGroupPost: (saved: CommunityPost) => void;
    onForumPostPublished?: () => void;
    newPostText: string;
    setNewPostText: (value: string) => void;
    newTagText: string;
    setNewTagText: (value: string) => void;
    newIsAnonymous: boolean;
    setNewIsAnonymous: (value: boolean) => void;
    newIsUrgent: boolean;
    setNewIsUrgent: (value: boolean) => void;
    newAttachment: CommunityPost['attachment'];
    setNewAttachment: (value: CommunityPost['attachment']) => void;
    setIsAddQuestionOpen: (open: boolean) => void;
    pendingAttachmentFileRef: MutableRefObject<File | null>;
};

export function useCommunityAddQuestionPublish({
    lists,
    currentUserId,
    authUser,
    isBanned,
    activeGroupId,
    appendPublishedGroupPost,
    onForumPostPublished,
    newPostText,
    setNewPostText,
    newTagText,
    setNewTagText,
    newIsAnonymous,
    setNewIsAnonymous,
    newIsUrgent,
    setNewIsUrgent,
    newAttachment,
    setNewAttachment,
    setIsAddQuestionOpen,
    pendingAttachmentFileRef,
}: UseCommunityAddQuestionPublishParams) {
    const { setPosts } = lists;
    const [submittingPost, setSubmittingPost] = useState(false);
    const submitInFlightRef = useRef(false);

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
        const publishContent = resolveForumPostPublishContent(
            newPostText,
            newAttachment?.type === 'audio',
        );
        if (!publishContent.ok) {
            SmartToast.warning('اكتب تفاصيل أوضح (10 أحرف على الأقل) أو سجّل مقطعاً صوتياً');
            return;
        }

        const peeked = peekForumRateLimit('post', currentUserId);
        if (!peeked.allowed) {
            SmartToast.warning(`انتظر ${peeked.retryAfterSec} ثانية قبل نشر منشور آخر`);
            return;
        }

        submitInFlightRef.current = true;
        try {
            setSubmittingPost(true);
            await runCommunityAddQuestionPublish({
                currentUserId,
                authUser,
                publishContent: publishContent.content,
                newAttachment,
                pendingAttachmentFileRef,
                newTagText,
                newIsAnonymous,
                newIsUrgent,
                activeGroupId,
                appendPublishedGroupPost,
                onForumPostPublished,
                setPosts,
                removePostFromList: lists.removePostFromList,
                setIsAddQuestionOpen,
                setNewPostText,
                setNewTagText,
                setNewIsAnonymous,
                setNewIsUrgent,
                setNewAttachment,
            });
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
        lists,
        newAttachment,
        newIsAnonymous,
        newIsUrgent,
        newPostText,
        newTagText,
        onForumPostPublished,
        pendingAttachmentFileRef,
        setIsAddQuestionOpen,
        setNewAttachment,
        setNewIsAnonymous,
        setNewIsUrgent,
        setNewPostText,
        setNewTagText,
        setPosts,
    ]);

    return { submittingPost, handleAddPost };
}
