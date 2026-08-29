import { afterEach, describe, expect, it, vi } from 'vitest';
import { HAMI_PLATFORM_ADMIN_UUID } from '../roleResolver.ts';
import {
    isHeadquartersAdminRole,
    isHeadquartersProtectedAdminId,
    mapHeadquartersUser,
} from '../headquartersUserMap.ts';

describe('headquartersUserMap', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('يرفض صفوفاً بلا UUID ويعيد المحذوف للاستعادة', () => {
        expect(mapHeadquartersUser({ id: 'not-a-uuid', role: 'lawyer' })).toBeNull();
        const deleted = mapHeadquartersUser({
            id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            is_deleted: true,
        });
        expect(deleted?.isDeleted).toBe(true);
        expect(deleted?.loginBlocked).toBe(false);
    });

    it('يحسب الحالة من الأعلام والحقل النصي', () => {
        const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
        expect(mapHeadquartersUser({ id, is_banned: true })?.status).toBe('suspended');
        expect(mapHeadquartersUser({ id, is_active: false })?.status).toBe('suspended');
        expect(mapHeadquartersUser({ id, status: 'frozen' })?.status).toBe('suspended');
        expect(mapHeadquartersUser({ id, role: 'moderator' })?.role).toBe('moderator');
        expect(mapHeadquartersUser({ id, role: 'client' })?.role).toBe('lawyer');
        expect(mapHeadquartersUser({ id, role: 'unknown' })?.role).toBe('lawyer');
    });

    it('يعدّ دور admin إدارة سواء كان النص كبيراً أو صغيراً', () => {
        expect(isHeadquartersAdminRole('admin')).toBe(true);
        expect(isHeadquartersAdminRole('Admin')).toBe(true);
        expect(isHeadquartersAdminRole(' lawyer ')).toBe(false);
        expect(isHeadquartersAdminRole('moderator')).toBe(false);
        expect(isHeadquartersAdminRole(null)).toBe(false);
    });

    it('يحمي UUID مدير المنصّة حتى لو ADMIN_UUID وهمي', () => {
        vi.stubEnv('ADMIN_UUID', 'admin-uuid-1');
        expect(isHeadquartersProtectedAdminId(HAMI_PLATFORM_ADMIN_UUID)).toBe(true);
        expect(isHeadquartersProtectedAdminId('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(false);
    });

    it('يمرّر الاسم واللقب والهاتف من هوية التسجيل', () => {
        const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
        const mapped = mapHeadquartersUser(
            { id, role: 'lawyer' },
            {
                email: 'ali@gmail.com',
                fullName: 'علي محمد حسن',
                familyName: 'العبودي',
                phone: '07701234567',
                governorate: 'بغداد',
                lawyerBarRoom: 'غرفة محاميي بغداد',
            },
        );
        expect(mapped?.fullName).toBe('علي محمد حسن');
        expect(mapped?.familyName).toBe('العبودي');
        expect(mapped?.phone).toBe('07701234567');
        expect(mapped?.governorate).toBe('بغداد');
        expect(mapped?.lawyerBarRoom).toBe('غرفة محاميي بغداد');
        expect(mapped?.freezeUntil).toBeNull();
        expect(mapped?.verificationStatus).toBe('none');
        expect(mapped?.publicVerifiedBadge).toBe(false);
        expect(mapped?.previousLegalDisplayName).toBeNull();
        expect(mapped?.legalDisplayNameCorrections).toBe(0);
    });

    it('يمرّر الاسم السابق وتاريخ التصحيح للمقر', () => {
        const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
        const mapped = mapHeadquartersUser({
            id,
            previous_legal_display_name: 'علي محمد حسن',
            legal_display_name_corrections: 1,
            legal_display_name_corrected_at: '2026-08-20T00:00:00.000Z',
        });
        expect(mapped?.previousLegalDisplayName).toBe('علي محمد حسن');
        expect(mapped?.legalDisplayNameCorrections).toBe(1);
        expect(mapped?.legalDisplayNameCorrectedAt).toBe('2026-08-20T00:00:00.000Z');
    });

    it('يقدّم الاسم الكانوني من profiles على بيانات GoTrue القديمة', () => {
        const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
        const mapped = mapHeadquartersUser(
            { id, legal_display_name: 'علي حسن محمد' },
            { fullName: 'علي محمد حسن' },
        );
        expect(mapped?.fullName).toBe('علي حسن محمد');
        expect(
            mapHeadquartersUser(
                { id, legal_display_name: 'علي حسن محمد' },
                { fullName: 'قديم', kycSubmittedName: 'علي محمد حسن' },
            )?.kycSubmittedName,
        ).toBe('علي محمد حسن');
    });

    it('يربط علامة التوثيق العامة من العمود لا من حالة الهوية', () => {
        const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
        expect(mapHeadquartersUser({ id, role: 'lawyer' }, undefined, 'active')?.publicVerifiedBadge).toBe(
            false,
        );
        expect(
            mapHeadquartersUser(
                { id, role: 'lawyer', public_verified_badge: true },
                undefined,
                'pending',
            )?.publicVerifiedBadge,
        ).toBe(true);
    });

    it('يربط حالة التوثيق دون افتراض الاعتماد', () => {
        const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
        expect(mapHeadquartersUser({ id, role: 'lawyer' }, undefined, 'pending')?.verificationStatus).toBe(
            'pending',
        );
        expect(mapHeadquartersUser({ id, role: 'lawyer' }, undefined, 'active')?.verificationStatus).toBe(
            'active',
        );
        expect(mapHeadquartersUser({ id, role: 'lawyer' }, undefined, 'rejected')?.verificationStatus).toBe(
            'rejected',
        );
    });

    it('يعرض freezeUntil عند التجميد المؤقت', () => {
        const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
        const until = new Date(Date.now() + 86_400_000).toISOString();
        const mapped = mapHeadquartersUser({ id, freeze_until: until, is_banned: true });
        expect(mapped?.status).toBe('suspended');
        expect(mapped?.freezeUntil).toBe(until);
    });

    it('يحمي ADMIN_UUID الحقيقي', () => {
        const configured = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
        vi.stubEnv('ADMIN_UUID', configured);
        expect(isHeadquartersProtectedAdminId(configured)).toBe(true);
        expect(isHeadquartersProtectedAdminId(HAMI_PLATFORM_ADMIN_UUID)).toBe(true);
    });
});
