import { FollowDB } from '@/app/services/cloud/lawyerCommunityCloud';
import type { FollowRecord } from '@/app/services/cloud/lawyerCommunityTypes';
import { getForumSupabaseAdmin } from './supabaseAdmin';

import type { ForumFollowPrefs, ForumFollowRecord } from './forumFollowTypes';

const DEFAULT_PREFS: ForumFollowPrefs = {
    notifyPosts: true,
    notifyComments: true,
    notifyReplies: true,
};

const PREFS_LOCAL_KEY = 'hami:forum:follow:prefs:v1';

function rowToRecord(row: Record<string, unknown>): ForumFollowRecord {
    return {
        followerId: String(row.follower_id),
        followingId: String(row.following_id),
        createdAt: String(row.created_at ?? new Date().toISOString()),
        notifyPosts: row.notify_posts !== false,
        notifyComments: row.notify_comments !== false,
        notifyReplies: row.notify_replies !== false,
    };
}

async function loadLocalPrefs(): Promise<Record<string, ForumFollowPrefs>> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(PREFS_LOCAL_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, ForumFollowPrefs>;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

async function saveLocalPrefs(map: Record<string, ForumFollowPrefs>): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(PREFS_LOCAL_KEY, JSON.stringify(map));
    } catch {
        /* silent */
    }
}

function prefsKey(followerId: string, followingId: string): string {
    return `${followerId}:${followingId}`;
}

function attachLocalPrefs(records: FollowRecord[], prefsMap: Record<string, ForumFollowPrefs>): ForumFollowRecord[] {
    return records.map((r) => {
        const prefs = prefsMap[prefsKey(r.followerId, r.followingId)] ?? DEFAULT_PREFS;
        return { ...r, ...prefs };
    });
}

export const ForumFollowRepository = {
    async follow(
        followerId: string,
        followingId: string,
        prefs: Partial<ForumFollowPrefs> = {},
    ): Promise<ForumFollowRecord> {
        if (followerId === followingId) {
            throw new Error('لا يمكنك متابعة نفسك');
        }
        const merged: ForumFollowPrefs = { ...DEFAULT_PREFS, ...prefs };
        const admin = getForumSupabaseAdmin();
        const createdAt = new Date().toISOString();

        if (!admin) {
            await FollowDB.follow(followerId, followingId);
            const map = await loadLocalPrefs();
            map[prefsKey(followerId, followingId)] = merged;
            await saveLocalPrefs(map);
            return { followerId, followingId, createdAt, ...merged };
        }

        const { error } = await admin.from('forum_follows').upsert(
            {
                follower_id: followerId,
                following_id: followingId,
                notify_posts: merged.notifyPosts,
                notify_comments: merged.notifyComments,
                notify_replies: merged.notifyReplies,
                created_at: createdAt,
            },
            { onConflict: 'follower_id,following_id' },
        );
        if (error) throw new Error(error.message);
        return { followerId, followingId, createdAt, ...merged };
    },

    async unfollow(followerId: string, followingId: string): Promise<void> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            await FollowDB.unfollow(followerId, followingId);
            const map = await loadLocalPrefs();
            delete map[prefsKey(followerId, followingId)];
            await saveLocalPrefs(map);
            return;
        }
        const { error } = await admin
            .from('forum_follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('following_id', followingId);
        if (error) throw new Error(error.message);
    },

    async isFollowing(followerId: string, followingId: string): Promise<boolean> {
        const admin = getForumSupabaseAdmin();
        if (!admin) return FollowDB.isFollowing(followerId, followingId);
        const { data } = await admin
            .from('forum_follows')
            .select('follower_id')
            .eq('follower_id', followerId)
            .eq('following_id', followingId)
            .maybeSingle();
        return Boolean(data);
    },

    async getFollowing(followerId: string): Promise<ForumFollowRecord[]> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const prefsMap = await loadLocalPrefs();
            return attachLocalPrefs(await FollowDB.getFollowing(followerId), prefsMap);
        }
        const { data, error } = await admin
            .from('forum_follows')
            .select('*')
            .eq('follower_id', followerId)
            .order('created_at', { ascending: false });
        if (error || !data) return [];
        return (data as Record<string, unknown>[]).map(rowToRecord);
    },

    async getFollowers(followingId: string): Promise<ForumFollowRecord[]> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const prefsMap = await loadLocalPrefs();
            return attachLocalPrefs(await FollowDB.getFollowers(followingId), prefsMap);
        }
        const { data, error } = await admin
            .from('forum_follows')
            .select('*')
            .eq('following_id', followingId)
            .order('created_at', { ascending: false });
        if (error || !data) return [];
        return (data as Record<string, unknown>[]).map(rowToRecord);
    },

    async getFollowerCount(userId: string): Promise<number> {
        const followers = await this.getFollowers(userId);
        return followers.length;
    },

    async updatePreferences(
        followerId: string,
        followingId: string,
        prefs: Partial<ForumFollowPrefs>,
    ): Promise<ForumFollowRecord> {
        const existing = await this.getFollowing(followerId);
        const row = existing.find((r) => r.followingId === followingId);
        if (!row) throw new Error('لم تعد تتابع هذا المحامي');
        const merged: ForumFollowPrefs = {
            notifyPosts: prefs.notifyPosts ?? row.notifyPosts,
            notifyComments: prefs.notifyComments ?? row.notifyComments,
            notifyReplies: prefs.notifyReplies ?? row.notifyReplies,
        };

        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const map = await loadLocalPrefs();
            map[prefsKey(followerId, followingId)] = merged;
            await saveLocalPrefs(map);
            return { ...row, ...merged };
        }

        const { error } = await admin
            .from('forum_follows')
            .update({
                notify_posts: merged.notifyPosts,
                notify_comments: merged.notifyComments,
                notify_replies: merged.notifyReplies,
            })
            .eq('follower_id', followerId)
            .eq('following_id', followingId);
        if (error) throw new Error(error.message);
        return { ...row, ...merged };
    },
};
