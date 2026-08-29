import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { formatRepositoryTag, resolveCommunityPostTags } from './repositoryTagUtils';
import { parseForumManualTags } from './communityAddQuestionPublishGuard';
import { newForumEntityId } from './forumEntityId';

type BuildForumPostDraftParams = {
    currentUserId: string;
    authorName: string;
    content: string;
    tagText: string;
    attachment: CommunityPost['attachment'];
    isAnonymous: boolean;
    isUrgent: boolean;
    activeGroupId: string | null;
};

export function buildForumPostDraft({
    currentUserId,
    authorName,
    content,
    tagText,
    attachment,
    isAnonymous,
    isUrgent,
    activeGroupId,
}: BuildForumPostDraftParams): CommunityPost {
    const id = newForumEntityId();
    const manualTags = parseForumManualTags(tagText, formatRepositoryTag);
    const tags = resolveCommunityPostTags(content, manualTags);
    const now = new Date().toISOString();
    return {
        id,
        authorId: currentUserId,
        authorName,
        content,
        tags,
        createdAt: now,
        updatedAt: now,
        attachment,
        upvoterIds: [],
        comments: [],
        bestCommentId: null,
        isAnonymous: isAnonymous || undefined,
        isUrgent: isUrgent || undefined,
        ...(activeGroupId ? { groupId: activeGroupId } : {}),
    };
}
