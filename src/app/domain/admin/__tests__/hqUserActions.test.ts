import { describe, expect, it } from 'vitest';
import { HAMI_PLATFORM_ADMIN_UUID } from '@/app/constants/hamiPlatformAdminId';
import { isHqAccountLoginLocked, isHqUserMutationLocked } from '../hqUserActions';

describe('isHqUserMutationLocked', () => {
    it('يقفل مدير المنصّة وأي دور إدارة', () => {
        expect(
            isHqUserMutationLocked({ id: HAMI_PLATFORM_ADMIN_UUID, role: 'admin' }),
        ).toBe(true);
        expect(
            isHqUserMutationLocked({
                id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                role: 'admin',
            }),
        ).toBe(true);
        expect(
            isHqUserMutationLocked({
                id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                role: 'lawyer',
            }),
        ).toBe(false);
        expect(
            isHqUserMutationLocked({
                id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                role: 'moderator',
            }),
        ).toBe(false);
    });
});

describe('isHqAccountLoginLocked', () => {
    it('يعدّ الحذف وقفل الدخول الدائم والمؤقت', () => {
        expect(isHqAccountLoginLocked({ isDeleted: true })).toBe(true);
        expect(isHqAccountLoginLocked({ loginBlocked: true })).toBe(true);
        expect(
            isHqAccountLoginLocked({ loginUntil: new Date(Date.now() + 60_000).toISOString() }),
        ).toBe(true);
        expect(
            isHqAccountLoginLocked({ loginUntil: new Date(Date.now() - 60_000).toISOString() }),
        ).toBe(false);
        expect(isHqAccountLoginLocked({})).toBe(false);
    });
});
