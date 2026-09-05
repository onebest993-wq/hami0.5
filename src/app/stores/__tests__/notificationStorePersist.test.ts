import { describe, expect, it, vi } from 'vitest';
import type { NotificationModel } from '@/app/infrastructure/notificationModel';
import {
    commitReadReconcileIfMembershipChanged,
    isNotificationStoreOwnerMismatch,
    notificationListMembershipChanged,
    persistLiveListIfSameUser,
} from '@/app/stores/notificationStorePersist';

function makeNotif(id: string, isRead = false): NotificationModel {
    return {
        id,
        title: id,
        message: id,
        type: 'system_alert',
        isRead,
        createdAt: new Date().toISOString(),
    };
}

describe('notificationStorePersist', () => {
    it('isNotificationStoreOwnerMismatch يتجاهل المالك الفارغ ويرفض التبديل', () => {
        expect(isNotificationStoreOwnerMismatch(null, 'a')).toBe(false);
        expect(isNotificationStoreOwnerMismatch('a', 'a')).toBe(false);
        expect(isNotificationStoreOwnerMismatch('a', 'b')).toBe(true);
    });

    it('persistLiveListIfSameUser لا يحفظ بعد تبديل الحساب', () => {
        const save = vi.fn().mockResolvedValue(undefined);
        persistLiveListIfSameUser(
            () => ({ currentUserId: 'b', notifications: [makeNotif('1')] }),
            'a',
            save,
        );
        expect(save).not.toHaveBeenCalled();
        persistLiveListIfSameUser(
            () => ({ currentUserId: 'a', notifications: [makeNotif('1')] }),
            'a',
            save,
        );
        expect(save).toHaveBeenCalledWith('a', [expect.objectContaining({ id: '1' })]);
    });

    it('العضوية تتغيّر عند استبدال عنصر بنفس الطول', () => {
        expect(
            notificationListMembershipChanged([makeNotif('a')], [makeNotif('a')]),
        ).toBe(false);
        expect(
            notificationListMembershipChanged(
                [makeNotif('a'), makeNotif('b')],
                [makeNotif('c'), makeNotif('b')],
            ),
        ).toBe(true);
        expect(
            notificationListMembershipChanged([makeNotif('a')], [makeNotif('a'), makeNotif('b')]),
        ).toBe(true);
    });

    it('commitReadReconcileIfMembershipChanged يحفظ عند الاستبدال لا عند نفس المعرّفات', () => {
        const set = vi.fn();
        const save = vi.fn().mockResolvedValue(undefined);
        const same = [makeNotif('a', true)];
        commitReadReconcileIfMembershipChanged(set, save, 'u', same, same);
        expect(set).not.toHaveBeenCalled();
        expect(save).not.toHaveBeenCalled();

        const swapped = [makeNotif('b'), makeNotif('a', true)];
        commitReadReconcileIfMembershipChanged(set, save, 'u', [makeNotif('a'), makeNotif('c')], swapped);
        expect(set).toHaveBeenCalledWith({
            notifications: swapped,
            unreadCount: 1,
        });
        expect(save).toHaveBeenCalledWith('u', swapped);
    });
});
