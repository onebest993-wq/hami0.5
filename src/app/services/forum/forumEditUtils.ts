import type { CommunityPost, ForumEditHistoryEntry } from '@/app/services/lawyer-cloud';
import { resolveCommunityPostTags } from '@/app/components/lawyer/CommunityScreen/repositoryTagUtils';

export function buildForumEditPatch(
    post: CommunityPost,
    newContent: string,
): Pick<CommunityPost, 'content' | 'isEdited' | 'updatedAt' | 'editCount' | 'editHistory' | 'tags'> {
    const now = new Date().toISOString();
    return {
        content: newContent,
        isEdited: true,
        updatedAt: now,
        editCount: (post.editCount ?? 0) + 1,
        editHistory: [
            ...(post.editHistory ?? []),
            {
                content: post.content,
                editedAt: post.updatedAt || post.createdAt,
            } satisfies ForumEditHistoryEntry,
        ].slice(-10),
        tags: resolveCommunityPostTags(newContent, post.tags),
    };
}
