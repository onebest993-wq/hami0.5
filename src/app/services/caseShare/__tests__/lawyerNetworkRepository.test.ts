import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ForumFollowRecord } from '@/app/services/forum/forumFollowTypes';

vi.mock('@/app/services/forum/forumFollowRepository', () => ({
    ForumFollowRepository: {
        getFollowing: vi.fn(),
        getFollowers: vi.fn(),
    },
}));

vi.mock('@/app/services/cloud/lawyerProfileCloud', () => ({
    ProfileDB: {
        getProfile: vi.fn(),
    },
}));

vi.mock('@/app/services/cloud/lawyerCommunityCloud', () => ({
    FollowDB: {
        getFollowing: vi.fn(),
        getFollowers: vi.fn(),
    },
}));

import { ForumFollowRepository } from '@/app/services/forum/forumFollowRepository';
import { ProfileDB } from '@/app/services/cloud/lawyerProfileCloud';
import { listNetworkColleagues } from '../lawyerNetworkRepository';

function followRow(partial: Partial<ForumFollowRecord> & Pick<ForumFollowRecord, 'followerId' | 'followingId'>): ForumFollowRecord {
    return {
        notifyPosts: true,
        notifyComments: true,
        notifyReplies: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        ...partial,
    };
}

describe('listNetworkColleagues', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يعيد قائمة فارغة عند غياب معرّف المستخدم', async () => {
        await expect(listNetworkColleagues('')).resolves.toEqual([]);
    });

    it('لا يُلحق محامين تجريبيين عند غياب شبكة المتابعة', async () => {
        vi.mocked(ForumFollowRepository.getFollowing).mockResolvedValue([]);
        vi.mocked(ForumFollowRepository.getFollowers).mockResolvedValue([]);

        const result = await listNetworkColleagues('lawyer-ahmad');

        expect(result).toEqual([]);
        expect(result.some((c) => c.id.startsWith('dev-colleague'))).toBe(false);
    });

    it('يدمج المتابَعين والمتابِعين مع العلاقة الصحيحة', async () => {
        vi.mocked(ForumFollowRepository.getFollowing).mockResolvedValue([
            followRow({ followerId: 'lawyer-ahmad', followingId: 'col-a' }),
        ]);
        vi.mocked(ForumFollowRepository.getFollowers).mockResolvedValue([
            followRow({ followerId: 'col-b', followingId: 'lawyer-ahmad' }),
            followRow({ followerId: 'col-a', followingId: 'lawyer-ahmad' }),
        ]);
        vi.mocked(ProfileDB.getProfile).mockImplementation(async (id) => ({
            header: { name: id === 'col-a' ? 'أ. علي حسين' : 'أ. فاطمة عادل' },
        }) as Awaited<ReturnType<typeof ProfileDB.getProfile>>);

        const result = await listNetworkColleagues('lawyer-ahmad');

        expect(result).toHaveLength(2);
        expect(result.find((c) => c.id === 'col-a')).toMatchObject({
            name: 'أ. علي حسين',
            relation: 'both',
        });
        expect(result.find((c) => c.id === 'col-b')).toMatchObject({
            name: 'أ. فاطمة عادل',
            relation: 'follower',
        });
    });

    it('يستبعد المستخدم نفسه من القائمة', async () => {
        vi.mocked(ForumFollowRepository.getFollowing).mockResolvedValue([
            followRow({ followerId: 'lawyer-ahmad', followingId: 'lawyer-ahmad' }),
        ]);
        vi.mocked(ForumFollowRepository.getFollowers).mockResolvedValue([]);

        await expect(listNetworkColleagues('lawyer-ahmad')).resolves.toEqual([]);
    });
});
