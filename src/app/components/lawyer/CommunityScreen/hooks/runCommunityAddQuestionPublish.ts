import { flushSync } from 'react-dom';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { prepareForumAttachmentForPublish } from '@/app/services/forumAttachmentService';
import { publishForumPost } from '@/lib/forumService.js';
import { applyAutoRedaction } from '../utils';
import { checkForumRateLimit } from '../forumRateLimit';
import { buildForumPostDraft } from '../communityAddQuestionPublishDraft';
import {
    insertOptimisticForumPost,
    settlePublishedForumPost,
} from '../communityAddQuestionPublishCommit';
import { persistForumPostLocally } from '@/app/services/forum/forumApi/forumApiClientCore';
import type { CommunityDualPostLists } from './useCommunityDualPostLists';

type RunCommunityAddQuestionPublishArgs = {
    currentUserId: string;
    authUser: { user_metadata?: { fullName?: string }; email?: string } | null;
    publishContent: string;
    newAttachment: CommunityPost['attachment'];
    pendingAttachmentFileRef: { current: File | null };
    newTagText: string;
    newIsAnonymous: boolean;
    newIsUrgent: boolean;
    activeGroupId: string | null;
    appendPublishedGroupPost: (saved: CommunityPost) => void;
    onForumPostPublished?: () => void;
    setPosts: CommunityDualPostLists['setPosts'];
    removePostFromList: CommunityDualPostLists['removePostFromList'];
    setIsAddQuestionOpen: (open: boolean) => void;
    setNewPostText: (value: string) => void;
    setNewTagText: (value: string) => void;
    setNewIsAnonymous: (value: boolean) => void;
    setNewIsUrgent: (value: boolean) => void;
    setNewAttachment: (value: CommunityPost['attachment']) => void;
};

export async function runCommunityAddQuestionPublish(args: RunCommunityAddQuestionPublishArgs): Promise<void> {
    const redaction = applyAutoRedaction(args.publishContent);
    const finalContent = redaction.redacted.trim();
    if (redaction.changed) {
        SmartToast.show('درع الخصوصية فعّال', {
            type: 'info',
            description: 'تم تنقيح البيانات حفاظاً على سرية الموكل.',
            duration: 3500,
        });
    }
    if (!finalContent) {
        SmartToast.warning('لا يمكن نشر محتوى فارغ');
        return;
    }

    let attachmentForPublish = args.newAttachment;
    if (attachmentForPublish) {
        try {
            attachmentForPublish = await prepareForumAttachmentForPublish(
                attachmentForPublish,
                args.currentUserId,
                args.pendingAttachmentFileRef.current,
            );
        } catch {
            SmartToast.error('تعذّر رفع المرفق — تحقق من الاتصال وحاول مرة أخرى');
            return;
        }
    }
    args.pendingAttachmentFileRef.current = null;

    const post = buildForumPostDraft({
        currentUserId: args.currentUserId,
        authorName: args.authUser?.user_metadata?.fullName || args.authUser?.email || 'محامي',
        content: finalContent,
        tagText: args.newTagText,
        attachment: attachmentForPublish,
        isAnonymous: args.newIsAnonymous,
        isUrgent: args.newIsUrgent,
        activeGroupId: args.activeGroupId,
    });
    let optimistic = post;

    flushSync(() => {
        args.setIsAddQuestionOpen(false);
        args.setNewPostText('');
        args.setNewTagText('');
        args.setNewIsAnonymous(false);
        args.setNewIsUrgent(false);
        args.setNewAttachment(null);
        args.pendingAttachmentFileRef.current = null;

        optimistic = insertOptimisticForumPost({
            post,
            sourceContent: args.publishContent,
            activeGroupId: args.activeGroupId,
            appendPublishedGroupPost: args.appendPublishedGroupPost,
            onForumPostPublished: args.onForumPostPublished,
            setPosts: args.setPosts,
        });
    });

    void persistForumPostLocally(optimistic);

    try {
        const saved = await publishForumPost(post);
        checkForumRateLimit('post', args.currentUserId);
        if (post.attachment && !saved.attachment) {
            SmartToast.warning('نُشر المنشور لكن المرفق لم يُحفظ — أعد الإرفاق عند الحاجة');
        }
        settlePublishedForumPost({
            saved,
            post,
            optimistic,
            activeGroupId: args.activeGroupId,
            appendPublishedGroupPost: args.appendPublishedGroupPost,
            setPosts: args.setPosts,
        });
        SmartToast.success(args.activeGroupId ? 'تم نشر المنشور في المجموعة' : 'تم نشر الاستشارة');
    } catch (err) {
        args.removePostFromList(post.id);
        const message =
            err instanceof Error && err.message.trim() ? err.message : 'تعذّر نشر الاستشارة';
        SmartToast.error(message);
    }
}
