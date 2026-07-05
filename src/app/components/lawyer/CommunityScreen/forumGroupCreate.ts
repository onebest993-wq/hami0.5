import { ForumApiService } from '@/app/services/forumApiService';
import type { ForumGroup } from '@/app/services/forum/forumGroupTypes';
import { withForumAsyncTimeout } from './forumAsync';

const CREATE_GROUP_TIMEOUT_MS = 6_000;

/** إنشاء مجموعة — محلي فوراً عند بطء/تعلّق API */
export async function createForumGroupResilient(
    input: { name: string; description: string },
    creatorId: string,
): Promise<ForumGroup> {
    const fromApi = await withForumAsyncTimeout(
        ForumApiService.createGroup(input, creatorId),
        CREATE_GROUP_TIMEOUT_MS,
        null,
    );
    if (fromApi) return fromApi;

    const { ForumGroupLocalStore } = await import('@/app/services/forum/forumGroupLocalStore');
    return ForumGroupLocalStore.createGroup(creatorId, input);
}
