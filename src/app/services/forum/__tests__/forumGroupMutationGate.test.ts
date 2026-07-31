import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assertForumPostGroupAccess } from '../forumGroupMutationGate';

const isMemberMock = vi.fn();

vi.mock('../forumGroupRepository', () => ({
    ForumGroupRepository: {
        isMember: (...args: unknown[]) => isMemberMock(...args),
    },
}));

describe('assertForumPostGroupAccess', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يتجاوز المنشورات العامة بدون فحص عضوية', async () => {
        await expect(assertForumPostGroupAccess({ groupId: undefined }, 'u1', false)).resolves.toBeUndefined();
        expect(isMemberMock).not.toHaveBeenCalled();
    });

    it('يسمح لعضو المجموعة', async () => {
        isMemberMock.mockResolvedValue(true);
        await expect(assertForumPostGroupAccess({ groupId: 'g1' }, 'u1', false)).resolves.toBeUndefined();
        expect(isMemberMock).toHaveBeenCalledWith('g1', 'u1');
    });

    it('يرفض غير العضو وغير المشرف', async () => {
        isMemberMock.mockResolvedValue(false);
        await expect(assertForumPostGroupAccess({ groupId: 'g1' }, 'u1', false)).rejects.toThrow(
            'الانضمام للمجموعة',
        );
    });

    it('يسمح للمشرف بدون عضوية', async () => {
        isMemberMock.mockResolvedValue(false);
        await expect(assertForumPostGroupAccess({ groupId: 'g1' }, 'admin', true)).resolves.toBeUndefined();
    });
});
