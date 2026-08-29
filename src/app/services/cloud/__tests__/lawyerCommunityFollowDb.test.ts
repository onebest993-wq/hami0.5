import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('@/app/services/cloud/lawyerCloudKv', () => ({
    lawyerCloudKv: {
        set: vi.fn(async (key: string, value: unknown) => {
            store.set(key, value);
        }),
        del: vi.fn(async (key: string) => {
            store.delete(key);
        }),
        get: vi.fn(async (key: string) => store.get(key) ?? null),
        getByPrefix: vi.fn(async (prefix: string) =>
            [...store.entries()].filter(([key]) => key.startsWith(prefix)).map(([, value]) => value),
        ),
    },
}));

import { FollowDB } from '@/app/services/cloud/lawyerCommunityFollowDb';
import { lawyerCloudKv } from '@/app/services/cloud/lawyerCloudKv';

const ME = 'lawyer-me';
const OTHER = 'lawyer-other';

describe('FollowDB reverse index', () => {
    beforeEach(() => {
        store.clear();
        vi.mocked(lawyerCloudKv.set).mockImplementation(async (key: string, value: unknown) => {
            store.set(key, value);
        });
        vi.mocked(lawyerCloudKv.del).mockImplementation(async (key: string) => {
            store.delete(key);
        });
        vi.mocked(lawyerCloudKv.set).mockClear();
        vi.mocked(lawyerCloudKv.del).mockClear();
    });

    it('يكتب الاتجاهين ويسترجع المتابِعين من الفهرس العكسي', async () => {
        await FollowDB.follow(ME, OTHER);

        expect(store.get(`follow:${ME}:${OTHER}`)).toMatchObject({
            followerId: ME,
            followingId: OTHER,
        });
        expect(store.get(`followers:${OTHER}:${ME}`)).toMatchObject({
            followerId: ME,
            followingId: OTHER,
        });

        const inbound = await FollowDB.getFollowers(OTHER);
        expect(inbound).toHaveLength(1);
        expect(inbound[0]?.followerId).toBe(ME);
        expect(inbound[0]?.followingId).toBe(OTHER);

        const outbound = await FollowDB.getFollowing(ME);
        expect(outbound).toHaveLength(1);
        expect(outbound[0]?.followingId).toBe(OTHER);

        expect(await FollowDB.isFollowing(ME, OTHER)).toBe(true);
        expect(await FollowDB.getFollowerCount(OTHER)).toBe(1);
        expect(await FollowDB.getFollowingCount(ME)).toBe(1);
    });

    it('يحذف الاتجاهين عند إلغاء المتابعة', async () => {
        await FollowDB.follow(ME, OTHER);
        await FollowDB.unfollow(ME, OTHER);

        expect(store.has(`follow:${ME}:${OTHER}`)).toBe(false);
        expect(store.has(`followers:${OTHER}:${ME}`)).toBe(false);
        expect(await FollowDB.getFollowers(OTHER)).toEqual([]);
        expect(await FollowDB.getFollowing(ME)).toEqual([]);
        expect(await FollowDB.isFollowing(ME, OTHER)).toBe(false);
    });

    it('لا يكتب متابعة ذاتية', async () => {
        await FollowDB.follow(ME, ME);
        expect(store.size).toBe(0);
        expect(lawyerCloudKv.set).not.toHaveBeenCalled();
    });

    it('يلغي المفتاح الأمامي إن فشل الفهرس العكسي', async () => {
        vi.mocked(lawyerCloudKv.set)
            .mockImplementationOnce(async (key: string, value: unknown) => {
                store.set(key, value);
            })
            .mockImplementationOnce(async () => {
                throw new Error('inbound-failed');
            });

        await expect(FollowDB.follow(ME, OTHER)).rejects.toThrow('inbound-failed');
        expect(store.has(`follow:${ME}:${OTHER}`)).toBe(false);
        expect(store.has(`followers:${OTHER}:${ME}`)).toBe(false);
        expect(lawyerCloudKv.del).toHaveBeenCalledWith(`follow:${ME}:${OTHER}`);
    });
});
