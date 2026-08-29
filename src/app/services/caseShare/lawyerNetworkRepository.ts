import { FollowDB } from '@/app/services/cloud/lawyerCommunityCloud';
import { ProfileDB } from '@/app/services/cloud/lawyerProfileCloud';
import { ForumFollowRepository } from '@/app/services/forum/forumFollowRepository';
import { resolveLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';
import type { NetworkColleague } from './caseShareTypes';

function resolveRelation(
    id: string,
    followingSet: Set<string>,
    followerSet: Set<string>,
): NetworkColleague['relation'] {
    const isFollowing = followingSet.has(id);
    const isFollower = followerSet.has(id);
    if (isFollowing && isFollower) return 'both';
    if (isFollowing) return 'following';
    return 'follower';
}

async function resolveColleagueName(id: string, viewerId: string): Promise<string> {
    try {
        const profile = await ProfileDB.getProfile(id, viewerId);
        return resolveLawyerDisplayName(profile.header?.name, id);
    } catch {
        return resolveLawyerDisplayName(undefined, id);
    }
}

/** محامون في شبكة المتابعة — من تتابعهم أو يتابعونك (منتدى حقيقي فقط) */
export async function listNetworkColleagues(userId: string): Promise<NetworkColleague[]> {
    if (!userId?.trim()) return [];

    const [following, followers] = await Promise.all([
        ForumFollowRepository.getFollowing(userId).catch(() => FollowDB.getFollowing(userId)),
        ForumFollowRepository.getFollowers(userId).catch(() => FollowDB.getFollowers(userId)),
    ]);

    const followingSet = new Set(following.map((r) => r.followingId));
    const followerSet = new Set(followers.map((r) => r.followerId));
    const ids = new Set<string>();
    for (const id of followingSet) ids.add(id);
    for (const id of followerSet) ids.add(id);
    ids.delete(userId);

    if (ids.size === 0) return [];

    const colleagues = await Promise.all(
        [...ids].map(async (id) => ({
            id,
            name: await resolveColleagueName(id, userId),
            relation: resolveRelation(id, followingSet, followerSet),
        })),
    );

    return colleagues.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}
