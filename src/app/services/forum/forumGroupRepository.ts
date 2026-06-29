import { getForumSupabaseAdmin, isForumSupabaseConfigured } from './supabaseAdmin';
import { ForumGroupLocalStore } from './forumGroupLocalStore';
import type {
    CreateForumGroupInput,
    ForumGroup,
    ForumGroupMemberRow,
    ForumGroupRow,
} from './forumGroupTypes';

function createId(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function hydrateGroups(rows: ForumGroupRow[], viewerId: string | null): Promise<ForumGroup[]> {
    const admin = getForumSupabaseAdmin();
    if (!admin || rows.length === 0) {
        return ForumGroupLocalStore.listGroups(viewerId);
    }

    const groupIds = rows.map((r) => r.id);
    const { data: memberRows } = await admin
        .from('forum_group_members')
        .select('id, group_id, lawyer_id, role, joined_at')
        .in('group_id', groupIds);

    const members = (memberRows ?? []) as ForumGroupMemberRow[];
    const counts = new Map<string, number>();
    for (const id of groupIds) counts.set(id, 0);
    for (const m of members) {
        counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
    }

    return rows.map((row) => {
        const membership = viewerId
            ? members.find((m) => m.group_id === row.id && m.lawyer_id === viewerId)
            : undefined;
        return {
            id: row.id,
            name: row.name,
            description: row.description ?? '',
            coverImage: row.cover_image,
            creatorId: row.creator_id,
            isOfficial: row.is_official,
            createdAt: row.created_at,
            memberCount: counts.get(row.id) ?? 0,
            isMember: Boolean(membership),
            viewerRole: membership?.role ?? null,
        };
    });
}

import { escapePostgrestIlike } from './forumGroupSearch';

export const ForumGroupRepository = {
    isConfigured: isForumSupabaseConfigured,

    async listGroups(viewerId: string | null, query = ''): Promise<ForumGroup[]> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            return ForumGroupLocalStore.listGroups(viewerId, query);
        }

        let request = admin.from('forum_groups').select('*').order('created_at', { ascending: false });
        const q = query.trim();
        if (q) {
            const escaped = escapePostgrestIlike(q);
            request = request.or(`name.ilike.%${escaped}%,description.ilike.%${escaped}%`);
        }
        const { data, error } = await request;
        if (error || !data) {
            return ForumGroupLocalStore.listGroups(viewerId, query);
        }
        return hydrateGroups(data as ForumGroupRow[], viewerId);
    },

    async getGroup(groupId: string, viewerId: string | null): Promise<ForumGroup | null> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            return ForumGroupLocalStore.getGroup(groupId, viewerId);
        }
        const { data, error } = await admin.from('forum_groups').select('*').eq('id', groupId).maybeSingle();
        if (error || !data) return null;
        const [group] = await hydrateGroups([data as ForumGroupRow], viewerId);
        return group ?? null;
    },

    async createGroup(
        creatorId: string,
        input: CreateForumGroupInput,
        allowOfficial: boolean,
    ): Promise<ForumGroup> {
        const admin = getForumSupabaseAdmin();
        const isOfficial = allowOfficial && input.isOfficial === true;
        if (!admin) {
            return ForumGroupLocalStore.createGroup(creatorId, { ...input, isOfficial });
        }

        const now = new Date().toISOString();
        const groupId = createId();
        const { error: groupError } = await admin.from('forum_groups').insert({
            id: groupId,
            name: input.name.trim(),
            description: input.description.trim(),
            cover_image: input.coverImage?.trim() || null,
            creator_id: creatorId,
            is_official: isOfficial,
            created_at: now,
        });
        if (groupError) throw new Error(groupError.message);

        const { error: memberError } = await admin.from('forum_group_members').insert({
            id: createId(),
            group_id: groupId,
            lawyer_id: creatorId,
            role: 'admin',
            joined_at: now,
        });
        if (memberError) throw new Error(memberError.message);

        const group = await this.getGroup(groupId, creatorId);
        if (!group) throw new Error('تعذّر إنشاء المجموعة');
        return group;
    },

    async joinGroup(groupId: string, lawyerId: string): Promise<ForumGroup | null> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            ForumGroupLocalStore.joinGroup(groupId, lawyerId);
            return ForumGroupLocalStore.getGroup(groupId, lawyerId);
        }

        const existing = await this.isMember(groupId, lawyerId);
        if (!existing) {
            const { error } = await admin.from('forum_group_members').insert({
                id: createId(),
                group_id: groupId,
                lawyer_id: lawyerId,
                role: 'member',
                joined_at: new Date().toISOString(),
            });
            if (error) throw new Error(error.message);
        }
        return this.getGroup(groupId, lawyerId);
    },

    async leaveGroup(groupId: string, lawyerId: string): Promise<void> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            ForumGroupLocalStore.leaveGroup(groupId, lawyerId);
            return;
        }
        const { error } = await admin
            .from('forum_group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('lawyer_id', lawyerId);
        if (error) throw new Error(error.message);
    },

    async isMember(groupId: string, lawyerId: string): Promise<boolean> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            return ForumGroupLocalStore.isMember(groupId, lawyerId);
        }
        const { data, error } = await admin
            .from('forum_group_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('lawyer_id', lawyerId)
            .maybeSingle();
        if (error) return false;
        return Boolean(data);
    },

    async listMemberIds(groupId: string): Promise<string[]> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            return ForumGroupLocalStore.listMemberIds(groupId);
        }
        const { data, error } = await admin
            .from('forum_group_members')
            .select('lawyer_id')
            .eq('group_id', groupId);
        if (error || !data) return ForumGroupLocalStore.listMemberIds(groupId);
        return (data as Array<{ lawyer_id: string }>).map((r) => r.lawyer_id);
    },
};
