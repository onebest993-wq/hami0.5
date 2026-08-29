import { lawyerCloudKv as kv } from '@/app/services/cloud/lawyerCloudKv';
import type { FollowRecord } from '@/app/services/cloud/lawyerCommunityTypes';

function isFollowRecord(value: unknown): value is FollowRecord {
    if (!value || typeof value !== 'object') return false;
    const o = value as Record<string, unknown>;
    return (
        typeof o.followerId === 'string' &&
        typeof o.followingId === 'string' &&
        typeof o.createdAt === 'string'
    );
}

function followForwardKey(followerId: string, followingId: string): string {
    return `follow:${followerId}:${followingId}`;
}

function followInboundKey(followingId: string, followerId: string): string {
    return `followers:${followingId}:${followerId}`;
}

function sortByCreatedAtDesc(rows: FollowRecord[]): FollowRecord[] {
    return [...rows].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** تخزين KV لمتابعات المنتدى — اتجاهان بلا مسح عام */
export const FollowDB = {
    async follow(followerId: string, followingId: string): Promise<void> {
        if (followerId === followingId) return;
        const record: FollowRecord = { followerId, followingId, createdAt: new Date().toISOString() };
        const forward = followForwardKey(followerId, followingId);
        const inbound = followInboundKey(followingId, followerId);
        await kv.set(forward, record);
        try {
            await kv.set(inbound, record);
        } catch (err) {
            await kv.del(forward).catch(() => undefined);
            throw err;
        }
    },

    async unfollow(followerId: string, followingId: string): Promise<void> {
        await Promise.allSettled([
            kv.del(followForwardKey(followerId, followingId)),
            kv.del(followInboundKey(followingId, followerId)),
        ]);
    },

    async isFollowing(followerId: string, followingId: string): Promise<boolean> {
        try {
            const raw = await kv.get(followForwardKey(followerId, followingId));
            return isFollowRecord(raw);
        } catch {
            return false;
        }
    },

    async getFollowers(userId: string): Promise<FollowRecord[]> {
        try {
            const all = await kv.getByPrefix(`followers:${userId}:`);
            if (!Array.isArray(all)) return [];
            return sortByCreatedAtDesc(
                all.filter((row): row is FollowRecord => isFollowRecord(row) && row.followingId === userId),
            );
        } catch {
            return [];
        }
    },

    async getFollowing(userId: string): Promise<FollowRecord[]> {
        try {
            const all = await kv.getByPrefix(`follow:${userId}:`);
            if (!Array.isArray(all)) return [];
            return sortByCreatedAtDesc(
                all.filter((row): row is FollowRecord => isFollowRecord(row) && row.followerId === userId),
            );
        } catch {
            return [];
        }
    },

    async getFollowerCount(userId: string): Promise<number> {
        const followers = await this.getFollowers(userId);
        return followers.length;
    },

    async getFollowingCount(userId: string): Promise<number> {
        const following = await this.getFollowing(userId);
        return following.length;
    },
};
