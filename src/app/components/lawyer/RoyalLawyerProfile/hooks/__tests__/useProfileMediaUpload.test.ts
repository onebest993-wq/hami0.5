import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileMediaUpload } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileMediaUpload';

vi.mock('@/app/services/lawyer-cloud', () => ({
    ProfileDB: {
        getProfile: vi.fn(),
    },
}));

vi.mock('@/app/services/profileMediaService', () => ({
    uploadProfileMedia: vi.fn(),
    profileMediaErrorMessage: vi.fn(() => 'خطأ رفع'),
    removeProfileMediaPaths: vi.fn(async () => undefined),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { uploadProfileMedia } from '@/app/services/profileMediaService';
import { SmartToast } from '@/app/components/ui/SmartToast';

const baseProfile = {
    header: { name: 'أحمد', title: '', coverImage: '', profileImage: '' },
    sections: [],
};

describe('useProfileMediaUpload', () => {
    const setProfile = vi.fn();
    const setDraft = vi.fn();
    const setIsEditing = vi.fn();
    const stageAvatarInDraft = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يمنع الرفع لملف الزائر', async () => {
        const { result } = renderHook(() =>
            useProfileMediaUpload({
                userId: 'visitor',
                isOwnProfile: false,
                profile: baseProfile as never,
                setProfile,
                draft: null,
                setDraft,
                setIsEditing,
                stageAvatarInDraft,
            }),
        );

        await act(async () => {
            await result.current.uploadImage(new File(['x'], 'a.jpg', { type: 'image/jpeg' }), 'avatar');
        });

        expect(uploadProfileMedia).not.toHaveBeenCalled();
    });

    it('يرفع للمعرض ويفتح التحرير تلقائياً', async () => {
        vi.mocked(uploadProfileMedia).mockResolvedValue({
            displayUrl: 'https://cdn/g.jpg',
            source: 'local',
            storagePath: undefined,
        });

        const { result } = renderHook(() =>
            useProfileMediaUpload({
                userId: 'owner-1',
                isOwnProfile: true,
                profile: baseProfile as never,
                setProfile,
                draft: null,
                setDraft,
                setIsEditing,
                stageAvatarInDraft,
            }),
        );

        await act(async () => {
            await result.current.uploadImage(new File(['x'], 'g.jpg', { type: 'image/jpeg' }), 'gallery');
        });

        expect(setIsEditing).toHaveBeenCalledWith(true);
        expect(setDraft).toHaveBeenCalled();
        expect(SmartToast.success).toHaveBeenCalled();
    });

    it('يمرّر الصورة الشخصية للمسودة', async () => {
        vi.mocked(uploadProfileMedia).mockResolvedValue({
            displayUrl: 'https://cdn/a.jpg',
            source: 'cloud',
            storagePath: 'profiles/a.jpg',
        });

        const { result } = renderHook(() =>
            useProfileMediaUpload({
                userId: 'owner-1',
                isOwnProfile: true,
                profile: baseProfile as never,
                setProfile,
                draft: {
                    header: { ...baseProfile.header },
                    actions: [],
                    gallery: [],
                },
                setDraft,
                setIsEditing,
                stageAvatarInDraft,
            }),
        );

        await act(async () => {
            await result.current.uploadImage(new File(['x'], 'a.jpg', { type: 'image/jpeg' }), 'avatar');
        });

        expect(stageAvatarInDraft).toHaveBeenCalledWith('https://cdn/a.jpg', 'profiles/a.jpg');
    });

    it('يتجاهل نتيجة الرفع بعد invalidateUploads', async () => {
        let resolveUpload!: (v: {
            displayUrl: string;
            source: 'cloud' | 'local';
            storagePath?: string;
        }) => void;
        vi.mocked(uploadProfileMedia).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveUpload = resolve;
                }),
        );

        const { result } = renderHook(() =>
            useProfileMediaUpload({
                userId: 'owner-1',
                isOwnProfile: true,
                profile: baseProfile as never,
                setProfile,
                draft: null,
                setDraft,
                setIsEditing,
                stageAvatarInDraft,
            }),
        );

        let uploadPromise!: Promise<void>;
        act(() => {
            uploadPromise = result.current.uploadImage(
                new File(['x'], 'g.jpg', { type: 'image/jpeg' }),
                'gallery',
            );
        });

        act(() => {
            result.current.invalidateUploads();
        });

        await act(async () => {
            resolveUpload({
                displayUrl: 'https://cdn/orphan.jpg',
                source: 'cloud',
                storagePath: 'profiles/orphan.jpg',
            });
            await uploadPromise;
        });

        expect(setDraft).not.toHaveBeenCalled();
        expect(setIsEditing).not.toHaveBeenCalled();
        expect(SmartToast.success).not.toHaveBeenCalled();
    });
});
