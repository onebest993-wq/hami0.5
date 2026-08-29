import { describe, expect, it } from 'vitest';
import {
    foldHqUserSearchText,
    matchesHqUserCreatedFilter,
    matchesHqUserQuery,
    matchesHqUserStatusFilter,
} from '@/app/components/admin/hqUserFilters';
import type { AdminUser } from '@/app/domain/admin/AdminUser';

const NOW = Date.parse('2026-08-27T21:00:00.000Z');

const lawyer = (
    verificationStatus: AdminUser['verificationStatus'],
    status: AdminUser['status'] = 'active',
): AdminUser => ({
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    email: 'a@b.c',
    fullName: 'محام',
    familyName: '',
    phone: '',
    governorate: '',
    lawyerBarRoom: '',
    role: 'lawyer',
    status,
    createdAt: '2026-08-27T10:00:00.000Z',
    freezeUntil: null,
    verificationStatus,
});

describe('matchesHqUserCreatedFilter', () => {
    it('يقبل الكل ويتجاهل التاريخ', () => {
        expect(matchesHqUserCreatedFilter('', 'all', NOW)).toBe(true);
        expect(matchesHqUserCreatedFilter('not-a-date', 'all', NOW)).toBe(true);
    });

    it('يحصر 24 ساعة و7 أيام حسب تاريخ الإنشاء', () => {
        expect(matchesHqUserCreatedFilter('2026-08-27T10:00:00.000Z', '24h', NOW)).toBe(true);
        expect(matchesHqUserCreatedFilter('2026-08-26T20:59:00.000Z', '24h', NOW)).toBe(false);
        expect(matchesHqUserCreatedFilter('2026-08-21T21:00:00.000Z', '7d', NOW)).toBe(true);
        expect(matchesHqUserCreatedFilter('2026-08-20T20:59:00.000Z', '7d', NOW)).toBe(false);
        expect(matchesHqUserCreatedFilter('invalid', '24h', NOW)).toBe(false);
    });
});

describe('matchesHqUserStatusFilter', () => {
    it('لا يعد المحامي غير المعتمد نشطاً', () => {
        expect(matchesHqUserStatusFilter(lawyer('none'), 'active')).toBe(false);
        expect(matchesHqUserStatusFilter(lawyer('none'), 'pending')).toBe(false);
        expect(matchesHqUserStatusFilter(lawyer('none'), 'unsubmitted')).toBe(true);
        expect(matchesHqUserStatusFilter(lawyer('pending'), 'pending')).toBe(true);
        expect(matchesHqUserStatusFilter(lawyer('pending'), 'unsubmitted')).toBe(false);
        expect(matchesHqUserStatusFilter(lawyer('active'), 'active')).toBe(true);
        expect(matchesHqUserStatusFilter(lawyer('rejected'), 'rejected')).toBe(true);
        expect(matchesHqUserStatusFilter(lawyer('pending', 'suspended'), 'frozen')).toBe(true);
        expect(matchesHqUserStatusFilter(lawyer('pending', 'suspended'), 'pending')).toBe(false);
        expect(
            matchesHqUserStatusFilter({ ...lawyer('active'), loginBlocked: true }, 'locked'),
        ).toBe(true);
        expect(matchesHqUserStatusFilter({ ...lawyer('active'), isDeleted: true }, 'deleted')).toBe(true);
        expect(matchesHqUserStatusFilter({ ...lawyer('active'), isDeleted: true }, 'active')).toBe(false);
        expect(
            matchesHqUserStatusFilter(
                { ...lawyer('active'), fullName: 'علي حسن محمد', kycSubmittedName: 'علي محمد حسن' },
                'name_mismatch',
            ),
        ).toBe(true);
        expect(matchesHqUserStatusFilter(lawyer('active'), 'name_mismatch')).toBe(false);
    });
});

describe('matchesHqUserQuery', () => {
    const ali: AdminUser = {
        ...lawyer('active'),
        fullName: 'أحمد علي',
        familyName: 'العبودي',
        email: 'ahmad@example.com',
        phone: '07701234567',
        governorate: 'بغداد',
        lawyerBarRoom: 'غرفة محاميي بغداد',
    };

    it('يطوي الألف والأرقام العربية ويطابق حقول الهوية', () => {
        expect(foldHqUserSearchText('أحمد')).toContain('احمد');
        expect(matchesHqUserQuery(ali, 'احمد')).toBe(true);
        expect(matchesHqUserQuery(ali, '٠٧٧٠١٢٣٤٥٦٧')).toBe(true);
        expect(matchesHqUserQuery(ali, 'أحمد بغداد')).toBe(true);
        expect(matchesHqUserQuery(ali, 'غرفة محاميي')).toBe(true);
        expect(matchesHqUserQuery(ali, 'مشرف')).toBe(false);
        expect(matchesHqUserQuery(ali, 'محامي')).toBe(true);
        expect(matchesHqUserQuery(lawyer('pending'), 'قيد التدقيق')).toBe(true);
        expect(matchesHqUserQuery(lawyer('none'), 'قيد التدقيق')).toBe(false);
        expect(matchesHqUserQuery(lawyer('none'), 'بلا طلب')).toBe(true);
        expect(matchesHqUserQuery(ali, 'معتمد')).toBe(true);
        expect(matchesHqUserQuery(ali, '')).toBe(true);
        expect(
            matchesHqUserQuery(
                { ...ali, previousLegalDisplayName: 'حسين علي كاظم', legalDisplayNameCorrections: 1 },
                'حسين علي',
            ),
        ).toBe(true);
        expect(
            matchesHqUserQuery({ ...ali, legalDisplayNameCorrections: 1 }, 'تصحيح الاسم'),
        ).toBe(true);
        expect(
            matchesHqUserQuery({ ...ali, kycSubmittedName: 'اسم الطلب المختلف' }, 'اختلاف الاسم'),
        ).toBe(true);
    });
});
