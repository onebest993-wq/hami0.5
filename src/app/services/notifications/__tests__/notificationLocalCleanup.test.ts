import { describe, expect, it, vi, beforeEach } from 'vitest';

const deleteItemMock = vi.fn();

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        deleteItemSync: (...args: unknown[]) => deleteItemMock(...args),
    },
}));

import { clearLocalNotificationCache } from '@/app/services/notifications/notificationLocalCleanup';

describe('notificationLocalCleanup', () => {
    beforeEach(() => {
        deleteItemMock.mockReset();
    });

    it('يمسح مفاتيح cache المحلية للمستخدم', () => {
        clearLocalNotificationCache('user-1');
        expect(deleteItemMock).toHaveBeenCalledWith('hami:notifications:v1:user-1');
        expect(deleteItemMock).toHaveBeenCalledWith('hami:notifications:v1');
    });
});
