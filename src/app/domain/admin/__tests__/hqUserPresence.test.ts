import { describe, expect, it } from 'vitest';
import {
    hqDirectoryStatusLabel,
    hqUserPresenceLabel,
    isAccreditedLawyer,
    isHqDirectoryActive,
    parseAdminVerificationStatus,
    resolveHqDirectoryKycStatus,
    resolveHqUserPresence,
} from '@/app/domain/admin/hqUserPresence';
import type { AdminUser } from '@/app/domain/admin/AdminUser';

function user(
    patch: Partial<Pick<AdminUser, 'role' | 'status' | 'verificationStatus'>>,
): Pick<AdminUser, 'role' | 'status' | 'verificationStatus'> {
    return {
        role: 'lawyer',
        status: 'active',
        verificationStatus: 'none',
        ...patch,
    };
}

describe('hqUserPresence', () => {
    it('parse يعيد none لأي قيمة غير معروفة', () => {
        expect(parseAdminVerificationStatus('active')).toBe('active');
        expect(parseAdminVerificationStatus('pending')).toBe('pending');
        expect(parseAdminVerificationStatus('rejected')).toBe('rejected');
        expect(parseAdminVerificationStatus(undefined)).toBe('none');
        expect(parseAdminVerificationStatus('weird')).toBe('none');
    });

    it('المحامي بلا طلب منفصل عن قيد التدقيق، والمعتمد شارتُه معتمد', () => {
        expect(resolveHqUserPresence(user({ verificationStatus: 'none' }))).toBe('unsubmitted');
        expect(resolveHqUserPresence(user({ verificationStatus: 'pending' }))).toBe('pending');
        expect(hqUserPresenceLabel('pending')).toBe('قيد التدقيق');
        expect(hqUserPresenceLabel('unsubmitted')).toBe('بلا طلب');
        expect(hqDirectoryStatusLabel(user({ verificationStatus: 'none' }))).toBe('بلا طلب');
        expect(hqDirectoryStatusLabel(user({ verificationStatus: 'pending' }))).toBe('قيد التدقيق');
        expect(hqDirectoryStatusLabel(user({ verificationStatus: 'active' }))).toBe('معتمد');
        expect(hqDirectoryStatusLabel(user({ role: 'admin', verificationStatus: 'none' }))).toBe('نشط');
        expect(isHqDirectoryActive(user({ verificationStatus: 'pending' }))).toBe(false);
        expect(isHqDirectoryActive(user({ verificationStatus: 'none' }))).toBe(false);
        expect(isHqDirectoryActive(user({ verificationStatus: 'active' }))).toBe(true);
        expect(isAccreditedLawyer(user({ verificationStatus: 'active' }))).toBe(false);
        expect(
            isAccreditedLawyer({
                role: 'lawyer',
                publicVerifiedBadge: true,
            }),
        ).toBe(true);
        expect(
            isAccreditedLawyer({
                role: 'lawyer',
                verificationStatus: 'active',
                publicVerifiedBadge: true,
                isDeleted: true,
            }),
        ).toBe(false);
        expect(hqUserPresenceLabel('active')).toBe('نشط');
    });

    it('KV الصالح يتقدّم؛ غياب الصف يلجأ لـ app_metadata', () => {
        expect(resolveHqDirectoryKycStatus(undefined, true, 'pending')).toBe('pending');
        expect(resolveHqDirectoryKycStatus(undefined, true, 'active')).toBe('active');
        expect(resolveHqDirectoryKycStatus(undefined, true, 'none')).toBe('none');
        expect(resolveHqDirectoryKycStatus('active', true, 'pending')).toBe('active');
        expect(resolveHqDirectoryKycStatus('pending', true, 'active')).toBe('pending');
        expect(resolveHqDirectoryKycStatus(undefined, false, 'pending')).toBe('pending');
        expect(resolveHqDirectoryKycStatus(undefined, false, 'weird')).toBe('none');
    });

    it('التجميد يتقدّم على التوثيق، والرفض يظهر مرفوضاً', () => {
        expect(
            resolveHqUserPresence(user({ status: 'suspended', verificationStatus: 'active' })),
        ).toBe('frozen');
        expect(resolveHqUserPresence(user({ verificationStatus: 'rejected' }))).toBe('rejected');
        expect(hqUserPresenceLabel('rejected')).toBe('مرفوض');
        expect(hqUserPresenceLabel('frozen')).toBe('موقوف');
    });

    it('المشرف والإدارة غير الموقوفين نشطون بلا سجل توثيق محامٍ', () => {
        expect(resolveHqUserPresence(user({ role: 'admin', verificationStatus: 'none' }))).toBe('active');
        expect(resolveHqUserPresence(user({ role: 'moderator', verificationStatus: 'none' }))).toBe(
            'active',
        );
    });

    it('الحذف وقفل الدخول يتقدّمان على التجميد', () => {
        expect(
            resolveHqUserPresence({
                role: 'lawyer',
                status: 'suspended',
                verificationStatus: 'active',
                isDeleted: true,
            }),
        ).toBe('deleted');
        expect(
            resolveHqUserPresence({
                role: 'lawyer',
                status: 'active',
                verificationStatus: 'active',
                loginBlocked: true,
            }),
        ).toBe('locked');
        expect(hqUserPresenceLabel('deleted')).toBe('محذوف');
        expect(hqUserPresenceLabel('locked')).toBe('مقفل الدخول');
        expect(
            isHqDirectoryActive({
                role: 'lawyer',
                status: 'active',
                verificationStatus: 'active',
                loginBlocked: true,
            }),
        ).toBe(false);
    });
});
