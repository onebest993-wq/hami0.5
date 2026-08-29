import { useInViewOnce } from './useInViewOnce';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { canFollowPostAuthor } from '../communityPermissions';
import { isActiveUrgentConsultation } from '../forumUrgentConsultation';
import {
    isProcedureGuidePost,
    stripProcedureGuideMachineLines,
} from '@/app/services/transactions/procedureGuideNavigation';

export function useQuestionCardModel(
    post: CommunityPost,
    currentUserId: string | null,
    followingIds: Set<string>,
    userStats: Record<string, { followerCount: number; postCount: number }>,
    preferEagerImage: boolean,
    isAdmin: boolean,
) {
    const { ref: cardRef, inView: attachmentInView } = useInViewOnce(preferEagerImage, '240px 0px');

    const authorId = post.authorId || post.author_id || '';
    const isUpvoted = currentUserId ? post.upvoterIds.includes(currentUserId) : false;
    const upvoteCount = post.upvoterIds.length;
    const isOwner = !!currentUserId && authorId === currentUserId;
    const isAnonymous = post.isAnonymous === true;
    const isActiveUrgent = isActiveUrgentConsultation(post);
    const isPinned = post.isPinned === true;
    const isLocked = post.isLocked === true;
    const displayName = isAnonymous ? 'زميل مجهول' : post.authorName;
    const isEdited = post.isEdited === true;
    const editCount = post.editCount ?? (isEdited ? 1 : 0);
    const isFollowing = currentUserId ? followingIds.has(authorId) : false;
    const canFollow = canFollowPostAuthor(post, currentUserId);
    const stats = userStats[authorId];
    const isProcedureGuide = isProcedureGuidePost(post);
    const displayContent = isProcedureGuide
        ? stripProcedureGuideMachineLines(post.content)
        : post.content;

    return {
        cardRef,
        attachmentInView,
        authorId,
        isUpvoted,
        upvoteCount,
        isOwner,
        isAnonymous,
        isActiveUrgent,
        isPinned,
        isLocked,
        canLockUnlock: isOwner || isAdmin,
        displayName,
        isEdited,
        editCount,
        isFollowing,
        canFollow,
        followerCount: stats?.followerCount ?? 0,
        postCount: stats?.postCount ?? 0,
        isProcedureGuide,
        displayContent,
    };
}
