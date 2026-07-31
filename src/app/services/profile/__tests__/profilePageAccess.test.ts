import { describe, expect, it } from 'vitest';
import {
    canViewProfilePage,
    nextProfilePageAccess,
    resolveProfilePageAccess,
} from '@/app/services/profile/profilePageAccess';

describe('profilePageAccess', () => {
    it('يعتبر الصفحة عامة افتراضياً', () => {
        expect(resolveProfilePageAccess(undefined)).toBe('public');
        expect(resolveProfilePageAccess({ pageAccess: undefined })).toBe('public');
    });

    it('يدور بين مستويات الدخول بالترتيب', () => {
        expect(nextProfilePageAccess('public')).toBe('followers');
        expect(nextProfilePageAccess('followers')).toBe('private');
        expect(nextProfilePageAccess('private')).toBe('public');
    });

    it('يمنع الزائر عند الخصوصية أو عدم المتابعة', () => {
        expect(
            canViewProfilePage({ pageAccess: 'public', isOwner: false, isFollowing: false }),
        ).toBe(true);
        expect(
            canViewProfilePage({ pageAccess: 'followers', isOwner: false, isFollowing: true }),
        ).toBe(true);
        expect(
            canViewProfilePage({ pageAccess: 'followers', isOwner: false, isFollowing: false }),
        ).toBe(false);
        expect(
            canViewProfilePage({ pageAccess: 'private', isOwner: false, isFollowing: true }),
        ).toBe(false);
        expect(canViewProfilePage({ pageAccess: 'private', isOwner: true, isFollowing: false })).toBe(
            true,
        );
    });
});
