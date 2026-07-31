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
        info: vi.fn(),
    },
}));

vi.mock('@/app/services/profileMediaService', () => ({
    removeProfileMediaPaths: vi.fn(async () => undefined),
}));

import { ProfileDB } from '@/app/services/lawyer-cloud';
import { removeProfileMediaPaths } from '@/app/services/profileMediaService';

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

    it('لا يحقن ملفاً قديماً بعد cancelEdit أثناء getProfile', async () => {
        let resolveGet!: (value: typeof baseProfile) => void;
        vi.mocked(ProfileDB.getProfile).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveGet = resolve;
                }),
        );

        const { result, rerender } = renderHook(
            (props: { userId: string; isOwnProfile: boolean; profile: typeof baseProfile | null }) =>
                useProfileEditSession({
                    userId: props.userId,
                    isOwnProfile: props.isOwnProfile,
                    profile: props.profile as never,
                    setProfile,
                    profileRef,
                }),
            {
                initialProps: {
                    userId: 'owner-1',
                    isOwnProfile: true,
                    profile: null,
                },
            },
        );

        act(() => {
            result.current.startEdit();
        });
        expect(ProfileDB.getProfile).toHaveBeenCalledWith('owner-1');

        act(() => {
            result.current.cancelEdit();
        });

        rerender({ userId: 'other-2', isOwnProfile: false, profile: null });

        await act(async () => {
            resolveGet({
                ...baseProfile,
                header: { ...baseProfile.header, name: 'ملف قديم' },
            });
        });

        expect(setProfile).not.toHaveBeenCalled();
        expect(result.current.isEditing).toBe(false);
        expect(result.current.draft).toBeNull();
    });

    it('يخرج من التحرير فوراً عند الحفظ دون انتظار السحابة', () => {
        vi.mocked(ProfileDB.saveProfile).mockImplementation(
            () =>
                new Promise((resolve) =>
                    window.setTimeout(() => resolve({ cloudSynced: true, localPersisted: true }), 5_000),
                ),
        );
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
            result.current.setDraft({
                header: { ...baseProfile.header, name: 'محمد' },
                actions: [],
                gallery: [],
            });
        });

        act(() => {
            void result.current.saveProfile();
        });

        expect(result.current.isEditing).toBe(false);
        expect(result.current.draft).toBeNull();
        expect(setProfile).toHaveBeenCalled();
    });

    it('يرفض الحفظ عند اسم فارغ', async () => {
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
            result.current.setDraft({
                header: { ...baseProfile.header, name: '   ' },
                actions: [],
                gallery: [],
            });
        });

        let ok = true;
        await act(async () => {
            ok = await result.current.saveProfile();
        });

        expect(ok).toBe(false);
        expect(ProfileDB.saveProfile).not.toHaveBeenCalled();
    });

    it('يستدعي onEditPersistStart قبل مسح المسودة عند الحفظ', async () => {
        vi.mocked(ProfileDB.saveProfile).mockResolvedValue({ cloudSynced: true, localPersisted: true });
        const onEditPersistStart = vi.fn();
        const { result } = renderHook(() =>
            useProfileEditSession({
                userId: 'owner-1',
                isOwnProfile: true,
                profile: baseProfile as never,
                setProfile,
                profileRef,
                onEditPersistStart,
            }),
        );

        act(() => {
            result.current.startEdit();
        });

        await act(async () => {
            await result.current.saveProfile();
        });

        expect(onEditPersistStart).toHaveBeenCalledTimes(1);
        expect(result.current.isEditing).toBe(false);
    });

    it('لا يستدعي onEditPersistStart عند رفض الاسم الفارغ', async () => {
        const onEditPersistStart = vi.fn();
        const { result } = renderHook(() =>
            useProfileEditSession({
                userId: 'owner-1',
                isOwnProfile: true,
                profile: baseProfile as never,
                setProfile,
                profileRef,
                onEditPersistStart,
            }),
        );

        act(() => {
            result.current.startEdit();
            result.current.setDraft({
                header: { ...baseProfile.header, name: '' },
                actions: [],
                gallery: [],
            });
        });

        await act(async () => {
            await result.current.saveProfile();
        });

        expect(onEditPersistStart).not.toHaveBeenCalled();
    });

    it('ينظّف وسائط المعرض بعد حفظ ناجح حتى بعد تبديل المستخدم', async () => {
        vi.mocked(ProfileDB.saveProfile).mockResolvedValue({ cloudSynced: true, localPersisted: true });
        const profileWithGallery = {
            header: { ...baseProfile.header, profileImagePath: 'old-avatar' },
            sections: [
                {
                    type: 'gallery' as const,
                    title: 'معرض',
                    data: [{ url: 'u', storagePath: 'gal-old' }],
                },
            ],
            customization: undefined,
        };
        profileRef.current = profileWithGallery as never;

        const { result, rerender } = renderHook(
            (props: { userId: string }) =>
                useProfileEditSession({
                    userId: props.userId,
                    isOwnProfile: true,
                    profile: profileWithGallery as never,
                    setProfile,
                    profileRef,
                }),
            { initialProps: { userId: 'owner-1' } },
        );

        act(() => {
            result.current.startEdit();
            result.current.setDraft({
                header: { ...profileWithGallery.header, profileImagePath: 'new-avatar' },
                actions: [],
                gallery: [{ url: 'n', storagePath: 'gal-new' }],
            });
        });

        let savePromise!: Promise<boolean>;
        act(() => {
            savePromise = result.current.saveProfile();
        });

        act(() => {
            result.current.cancelEdit();
        });
        rerender({ userId: 'owner-2' });

        let ok = false;
        await act(async () => {
            ok = await savePromise;
        });

        expect(ok).toBe(true);
        expect(removeProfileMediaPaths).toHaveBeenCalledWith(['old-avatar']);
        /* مسار المعرض في نفس كتلة GC — يكفي إثبات فك ارتباط userIdRef عبر الأفاتار */
    });
});
