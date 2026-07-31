import { beforeEach, describe, expect, it, vi } from 'vitest';

const isMutedByMock = vi.fn();

vi.mock('../forumMuteRepository', () => ({
    ForumMuteRepository: {
        isMutedBy: (...args: unknown[]) => isMutedByMock(...args),
    },
}));

const addNotificationMock = vi.fn();
const getNotificationsMock = vi.fn().mockResolvedValue([]);
const updateNotificationMock = vi.fn();

vi.mock('@/app/services/notifications/forumNotificationDbResolver', () => ({
    resolveForumNotificationDb: vi.fn().mockResolvedValue({
        addNotification: (...args: unknown[]) => addNotificationMock(...args),
        getNotifications: (...args: unknown[]) => getNotificationsMock(...args),
        updateNotification: (...args: unknown[]) => updateNotificationMock(...args),
    }),
}));

vi.mock('../forumFollowRepository', () => ({
    ForumFollowRepository: { getFollowers: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../forumPostFollowRepository', () => ({
    ForumPostFollowRepository: {
        isSubscribed: vi.fn().mockResolvedValue(true),
        subscribe: vi.fn(),
        getSubscribers: vi.fn().mockResolvedValue([]),
    },
}));
vi.mock('../forumGroupRepository', () => ({
    ForumGroupRepository: {
        listMemberIds: vi.fn().mockResolvedValue([]),
        getGroup: vi.fn().mockResolvedValue(null),
    },
}));

import { dispatchNewFollowerNotification } from '../forumNotificationDispatch';

describe('forum notification mute suppression', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getNotificationsMock.mockResolvedValue([]);
    });

    it('يمنع إشعار المتابعة إذا كتم المستلمُ الفاعلَ', async () => {
        isMutedByMock.mockResolvedValue(true);
        await dispatchNewFollowerNotification({
            followerId: 'actor-1',
            followerName: 'محامٍ',
            followingId: 'recipient-1',
        });
        expect(isMutedByMock).toHaveBeenCalledWith('recipient-1', 'actor-1');
        expect(addNotificationMock).not.toHaveBeenCalled();
    });

    it('يرسل الإشعار إذا لم يكن الفاعل مكتوماً', async () => {
        isMutedByMock.mockResolvedValue(false);
        await dispatchNewFollowerNotification({
            followerId: 'actor-2',
            followerName: 'محامٍ',
            followingId: 'recipient-2',
        });
        expect(addNotificationMock).toHaveBeenCalledTimes(1);
    });

    it('فشل فحص الكتم لا يحجب الإشعار (fail-open للوظيفة)', async () => {
        isMutedByMock.mockRejectedValue(new Error('mute store down'));
        await dispatchNewFollowerNotification({
            followerId: 'actor-3',
            followerName: 'محامٍ',
            followingId: 'recipient-3',
        });
        expect(addNotificationMock).toHaveBeenCalledTimes(1);
    });
});
