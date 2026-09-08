import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import {
    forumApiPostJson,
    getForumSessionUserId,
    hasForumRemoteSession,
    withForumMutationFallback,
    withForumReadFallback,
    type ForumApiOk,
} from '@/app/services/forum/forumApi/forumApiClientCore';
import type { ForumGroup } from '@/app/services/forum/forumGroupTypes';
import { ForumGroupLocalStore } from '@/app/services/forum/forumGroupLocalStore';

type ApiOk<T> = ForumApiOk<T>;

async function listGroupsLocal(query = ''): Promise<ForumGroup[]> {
    const viewerId = await getForumSessionUserId();
    return ForumGroupLocalStore.listGroups(viewerId, query.trim());
}

export async function listForumGroups(query = ''): Promise<ForumGroup[]> {
    const q = query.trim();
    if (!(await hasForumRemoteSession())) {
        return listGroupsLocal(q);
    }

    const url = q ? `/api/forum/groups?q=${encodeURIComponent(q)}` : '/api/forum/groups';
    return withForumReadFallback(
        async () => {
            const res = await SecureAPIClient.fetchSecure<{
                ok: boolean;
                groups?: ForumGroup[];
            }>(url, { method: 'GET' });
            if (!res.ok || !Array.isArray(res.groups)) {
                return listGroupsLocal(q);
            }
            return res.groups;
        },
        async () => listGroupsLocal(q),
    );
}

export async function createForumGroup(
    input: {
        name: string;
        description: string;
        coverImage?: string | null;
        isOfficial?: boolean;
    },
    requesterId?: string | null,
): Promise<ForumGroup> {
    if (!(await hasForumRemoteSession())) {
        const creatorId = await getForumSessionUserId(requesterId);
        if (!creatorId) throw new Error('[forumApi:groups:opcode] يجب تسجيل الدخول');
        return ForumGroupLocalStore.createGroup(creatorId, input);
    }
    return withForumMutationFallback(
        async () => {
            const res = await forumApiPostJson<ApiOk<{ group: ForumGroup }>>('/api/forum/groups', input);
            if (!res.group) throw new Error('[forumApi:groups:opcode] استجابة غير صالحة');
            return res.group;
        },
        async () => {
            const creatorId = await getForumSessionUserId(requesterId);
            if (!creatorId) throw new Error('[forumApi:groups:opcode] يجب تسجيل الدخول');
            return ForumGroupLocalStore.createGroup(creatorId, input);
        },
    );
}

export async function joinForumGroup(
    groupId: string,
    requesterId?: string | null,
): Promise<ForumGroup> {
    if (!(await hasForumRemoteSession())) {
        const lawyerId = await getForumSessionUserId(requesterId);
        if (!lawyerId) throw new Error('[forumApi:groups:opcode] يجب تسجيل الدخول');
        ForumGroupLocalStore.joinGroup(groupId, lawyerId);
        const group = ForumGroupLocalStore.getGroup(groupId, lawyerId);
        if (!group) throw new Error('[forumApi:groups:opcode] المجموعة غير موجودة');
        return group;
    }
    return withForumMutationFallback(
        async () => {
            const res = await forumApiPostJson<ApiOk<{ group: ForumGroup }>>('/api/forum/groups/join', {
                groupId,
            });
            if (!res.group) throw new Error('[forumApi:groups:opcode] استجابة غير صالحة');
            return res.group;
        },
        async () => {
            const lawyerId = await getForumSessionUserId(requesterId);
            if (!lawyerId) throw new Error('[forumApi:groups:opcode] يجب تسجيل الدخول');
            ForumGroupLocalStore.joinGroup(groupId, lawyerId);
            const group = ForumGroupLocalStore.getGroup(groupId, lawyerId);
            if (!group) throw new Error('[forumApi:groups:opcode] المجموعة غير موجودة');
            return group;
        },
    );
}

export async function leaveForumGroup(groupId: string, requesterId?: string | null): Promise<void> {
    if (!(await hasForumRemoteSession())) {
        const lawyerId = await getForumSessionUserId(requesterId);
        if (!lawyerId) throw new Error('[forumApi:groups:opcode] يجب تسجيل الدخول');
        ForumGroupLocalStore.leaveGroup(groupId, lawyerId);
        return;
    }
    await withForumMutationFallback(
        async () => {
            await forumApiPostJson<ApiOk<Record<string, never>>>('/api/forum/groups/leave', { groupId });
        },
        async () => {
            const lawyerId = await getForumSessionUserId(requesterId);
            if (!lawyerId) throw new Error('[forumApi:groups:opcode] يجب تسجيل الدخول');
            ForumGroupLocalStore.leaveGroup(groupId, lawyerId);
        },
    );
}
