import { UserRole } from '@/app/types/admin-types';
import type { CommunityComment, CommunityPost } from '@/app/services/lawyer-cloud';

export function canEditPost(
    post: CommunityPost,
    currentUserId: string | null,
    isAdmin = false,
): boolean {
    if (!currentUserId) return false;
    if (isAdmin) return true;
    return post.authorId === currentUserId;
}

export function canDeletePost(
    post: CommunityPost,
    currentUserId: string | null,
    isAdmin: boolean,
): boolean {
    if (!currentUserId) return false;
    if (isAdmin) return true;
    return post.authorId === currentUserId;
}

export function canPinPost(isAdmin: boolean): boolean {
    return isAdmin;
}

export function canDeleteComment(
    post: CommunityPost,
    comment: CommunityComment,
    currentUserId: string | null,
    isAdmin: boolean,
): boolean {
    if (!currentUserId) return false;
    if (isAdmin) return true;
    if (comment.authorId === currentUserId) return true;
    if (post.authorId === currentUserId) return true;
    return false;
}

export function canEditComment(
    comment: CommunityComment,
    currentUserId: string | null,
    post?: CommunityPost,
): boolean {
    if (!currentUserId) return false;
    if (comment.authorId !== currentUserId) return false;
    // قفل النص بعد تمييزه كأفضل إجابة (يحمي مالك المنشور من تبديل المحتوى)
    if (post && post.bestCommentId === comment.id) return false;
    return true;
}

export function canUpvotePost(post: CommunityPost, currentUserId: string | null): boolean {
    if (!currentUserId) return false;
    return post.authorId !== currentUserId;
}
