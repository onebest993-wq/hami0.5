import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

const setIsEditing = vi.fn();
const setDraft = vi.fn();
const loaderReturn = {
    profile: {
        header: { name: 'أحمد', title: 'محامٍ', coverImage: '', profileImage: '', phone: '0770', city: 'بغداد' },
        sections: [],
    },
    setProfile: vi.fn(),
    profileRef: { current: null },
    loading: false,
    customization: {
        privacy: {
            showContactChannels: true,
            showGallery: true,
            showCustomBlocks: true,
            showPhoneMeta: true,
            showCityMeta: true,
            showSyndicate: true,
            hiddenContactIds: [],
        },
        appearance: { accentColor: 'gold', material: 'glass' },
        customBlocks: [],
    } as ProfilePageCustomization,
};

vi.mock('@/app/context/AuthContext', () => ({
    useAuthUser: () => ({
        id: 'viewer-1',
        email: 'viewer@test.local',
        user_metadata: { fullName: 'مشاهد' },
    }),
}));

vi.mock('@/app/services/calendarBridge', () => ({
    resolveCalendarUserId: (id: string | null) => id,
}));

vi.mock('../useProfileLoader', () => ({
    useProfileLoader: vi.fn(() => loaderReturn),
}));

vi.mock('../useProfileEditSession', () => ({
    useProfileEditSession: () => ({
        isEditing: false,
        setIsEditing,
        draft: null,
        setDraft,
        saving: false,
        startEdit: vi.fn(),
        cancelEdit: vi.fn(),
        saveProfile: vi.fn(),
        ensureEditDraft: vi.fn(),
        stageAvatarInDraft: vi.fn(),
        addContactChannel: vi.fn(),
        enqueueProfileSave: { current: vi.fn() },
    }),
}));

vi.mock('../useProfileMediaUpload', () => ({
    useProfileMediaUpload: () => ({
        uploading: null,
        avatarRef: { current: null },
        galleryRef: { current: null },
        uploadImage: vi.fn(),
    }),
}));

vi.mock('../useProfileStudioSettings', () => ({
    useProfileStudioSettings: () => ({
        settingsOpen: false,
        savingSettings: false,
        openSettings: vi.fn(),
        closeSettings: vi.fn(),
        saveCustomization: vi.fn(),
    }),
}));

vi.mock('../useProfileScreenEscape', () => ({
    useProfileScreenEscape: vi.fn(),
}));

vi.mock('../useProfileLifecycle', () => ({
    useProfileLifecycle: vi.fn(() => ({ isShellReady: true, hadWarmCache: false })),
}));

import { useRoyalLawyerProfile } from '../useRoyalLawyerProfile';

describe('useRoyalLawyerProfile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('isOwnProfile=true للمشاهد نفسه', () => {
        const { result } = renderHook(() => useRoyalLawyerProfile());
        expect(result.current.isOwnProfile).toBe(true);
        expect(result.current.profileUserId).toBe('viewer-1');
    });

    it('isOwnProfile=false عند targetUserId مختلف', () => {
        const { result } = renderHook(() =>
            useRoyalLawyerProfile({ targetUserId: 'other-lawyer', displayNameHint: 'زائر' }),
        );
        expect(result.current.isOwnProfile).toBe(false);
        expect(result.current.profileUserId).toBe('other-lawyer');
    });

    it('يعيد ضبط التحرير عند تبديل profileUserId', () => {
        const { rerender } = renderHook(
            ({ targetUserId }: { targetUserId?: string }) =>
                useRoyalLawyerProfile(targetUserId ? { targetUserId } : {}),
            { initialProps: { targetUserId: 'lawyer-a' } },
        );

        rerender({ targetUserId: 'lawyer-b' });

        expect(setIsEditing).toHaveBeenCalledWith(false);
        expect(setDraft).toHaveBeenCalledWith(null);
    });
});
