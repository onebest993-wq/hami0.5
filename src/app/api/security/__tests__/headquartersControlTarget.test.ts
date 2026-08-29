import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HAMI_PLATFORM_ADMIN_UUID } from '@/app/constants/hamiPlatformAdminId';

const { fetchUserMock } = vi.hoisted(() => ({
    fetchUserMock: vi.fn(),
}));

vi.mock('../headquartersUsers.ts', () => ({
    fetchHeadquartersUser: (...a: unknown[]) => fetchUserMock(...a),
}));

import { rejectHeadquartersTargetId, resolveHeadquartersControlTarget } from '../headquartersControlTarget.ts';

const ACTOR = '11111111-2222-4333-8444-555555555555';
const TARGET = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const admin = {} as never;

describe('rejectHeadquartersTargetId', () => {
    it('يرفض معرّفاً غير UUID قبل لمس القاعدة', () => {
        expect(rejectHeadquartersTargetId('victim', ACTOR)?.status).toBe(400);
    });

    it('يرفض تعديل الحساب الحالي', () => {
        expect(rejectHeadquartersTargetId(ACTOR, ACTOR)?.status).toBe(400);
    });

    it('يسمح بقراءة الحساب الحالي', () => {
        expect(rejectHeadquartersTargetId(ACTOR, ACTOR, { allowSelf: true })).toBeNull();
    });

    it('يرفض مدير المنصّة حتى مع السماح بالذات', () => {
        expect(rejectHeadquartersTargetId(HAMI_PLATFORM_ADMIN_UUID, ACTOR, { allowSelf: true })?.status).toBe(
            403,
        );
    });

    it('يرفض مدير المنصّة', () => {
        expect(rejectHeadquartersTargetId(HAMI_PLATFORM_ADMIN_UUID, ACTOR)?.status).toBe(403);
    });

    it('يمرّر هدفاً عادياً للفحص الحيّ', () => {
        expect(rejectHeadquartersTargetId(TARGET, ACTOR)).toBeNull();
    });
});

describe('resolveHeadquartersControlTarget', () => {
    beforeEach(() => {
        fetchUserMock.mockReset();
    });

    it('يرفض حساب إدارة بعد الجلب', async () => {
        fetchUserMock.mockResolvedValue({ id: TARGET, role: 'admin' });
        await expect(resolveHeadquartersControlTarget(admin, TARGET, ACTOR)).resolves.toEqual({
            ok: false,
            status: 403,
            error: 'لا يمكن تعديل حساب إدارة',
        });
    });

    it('يعيد 404 إن غاب الصف', async () => {
        fetchUserMock.mockResolvedValue(null);
        await expect(resolveHeadquartersControlTarget(admin, TARGET, ACTOR)).resolves.toEqual({
            ok: false,
            status: 404,
            error: 'المستخدم غير موجود',
        });
    });

    it('allowMissing يمرّر صفاً غائباً لرفع حظر يتيم', async () => {
        fetchUserMock.mockResolvedValue(null);
        await expect(
            resolveHeadquartersControlTarget(admin, TARGET, ACTOR, { allowMissing: true }),
        ).resolves.toEqual({ ok: true, user: null });
    });

    it('يمرّر محامياً حيّاً', async () => {
        const user = { id: TARGET, role: 'lawyer' };
        fetchUserMock.mockResolvedValue(user);
        await expect(resolveHeadquartersControlTarget(admin, TARGET, ACTOR)).resolves.toEqual({
            ok: true,
            user,
        });
        expect(fetchUserMock).toHaveBeenCalledWith(admin, TARGET);
    });
});
