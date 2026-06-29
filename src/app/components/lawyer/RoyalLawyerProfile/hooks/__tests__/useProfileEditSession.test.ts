import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileEditSession } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileEditSession';

vi.mock('@/app/services/lawyer-cloud', () => ({
    ProfileDB: {
        getProfile: vi.fn(),
        saveProfile: vi.fn(),
    },
}));

vi.mock('@/app/services/profile/profileSaveQueue', () => ({
    createProfileSaveQueue: () => (fn: () => Promise<void>) => fn(),
}));

vi.mock('@/app/services/profile/profileWarmCache', () => ({
    setProfileWarmCache: vi.fn(),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

import { ProfileDB } from '@/app/services/lawyer-cloud';

const baseProfile = {
    header: { name: 'أحمد', title: 'محامٍ', coverImage: '', profileImage: '' },
    sections: [],
    customization: undefined,
};

describe('useProfileEditSession', () => {
    const setProfile = vi.fn();
    const profileRef = { current: baseProfile as typeof baseProfile };

    beforeEach(() => {
        vi.clearAllMocks();
        profileRef.current = { ...baseProfile, header: { ...baseProfile.header } };
    });

    it('يمنع startEdit لملف الزائر', () => {
        const { result } = renderHook(() =>
            useProfileEditSession({
                userId: 'visitor',
                isOwnProfile: false,
                profile: baseProfile as never,
                setProfile,
                profileRef,
            }),
        );

        act(() => {
            result.current.startEdit();
        });

        expect(result.current.isEditing).toBe(false);
        expect(result.current.draft).toBeNull();
        expect(ProfileDB.getProfile).not.toHaveBeenCalled();
    });

    it('يفتح جلسة تحرير لملف المالك', () => {
        const { result } = renderHook(() =>
            useProfileEditSession({
                userId: 'owner-1',
                isOwnProfile: true,
                profile: baseProfile as never,
                setProfile,
                profileRef,
            }),
        );

        act(() => {
            result.current.startEdit();
        });

        expect(result.current.isEditing).toBe(true);
        expect(result.current.draft?.header.name).toBe('أحمد');
    });

    it('يلغي التحرير ويمسح المسودة', () => {
        const { result } = renderHook(() =>
            useProfileEditSession({
                userId: 'owner-1',
                isOwnProfile: true,
                profile: baseProfile as never,
                setProfile,
                profileRef,
            }),
        );

        act(() => {
            result.current.startEdit();
        });
        act(() => {
            result.current.cancelEdit();
        });

        expect(result.current.isEditing).toBe(false);
        expect(result.current.draft).toBeNull();
    });
});
