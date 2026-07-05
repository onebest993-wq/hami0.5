import { FollowDB } from '@/app/services/cloud/lawyerCommunityCloud';
import { ProfileDB } from '@/app/services/cloud/lawyerProfileCloud';
import { ForumFollowRepository } from '@/app/services/forum/forumFollowRepository';
import type { NetworkColleague } from './caseShareTypes';

/** شخصيات تجريبية — DEV فقط عند غياب شبكة حقيقية */
const DEV_NETWORK_COLLEAGUES: NetworkColleague[] = [
    { id: 'dev-colleague-sara', name: 'أ. سارة الحيدري (تجريبي)', relation: 'following' },
    { id: 'dev-colleague-karim', name: 'أ. كريم الجبouri (تجريبي)', relation: 'both' },
    { id: 'dev-colleague-noor', name: 'أ. نور الهاشمي (تجريبي)', relation: 'follower' },
];

function appendDevColleagues(colleagues: NetworkColleague[]): NetworkColleague[] {
    if (!import.meta.env.DEV) return colleagues;
    const ids = new Set(colleagues.map((c) => c.id));
    const extras = DEV_NETWORK_COLLEAGUES.filter((c) => !ids.has(c.id));
    return extras.length ? [...colleagues, ...extras] : colleagues;
}

/** محامون في شبكة المتابعة — من تتابعهم أو يتابعونك */
export async function listNetworkColleagues(userId: string): Promise<NetworkColleague[]> {
    if (!userId?.trim()) return appendDevColleagues([]);

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

    const colleagues: NetworkColleague[] = [];
    for (const id of ids) {
        let name = 'محامٍ';
        try {
            const profile = await ProfileDB.getProfile(id);
            name = profile.header?.name?.trim() || name;
        } catch {
            /* fallback name */
        }
        const isFollowing = followingSet.has(id);
        const isFollower = followerSet.has(id);
        colleagues.push({
            id,
            name,
            relation: isFollowing && isFollower ? 'both' : isFollowing ? 'following' : 'follower',
        });
    }

    const sorted = colleagues.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    return appendDevColleagues(sorted);
}
