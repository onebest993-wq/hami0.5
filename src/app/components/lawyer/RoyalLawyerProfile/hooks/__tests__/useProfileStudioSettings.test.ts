import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProfileStudioSettings } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileStudioSettings';
import { defaultProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: vi.fn(),
    releaseBodyScrollLock: vi.fn(),
    HAMI_DISMISS_OVERLAYS_EVENT: 'hami:dismiss-overlays',
}));

vi.mock('@/app/utils/lazyComponents', () => ({
    prefetchProfileSettingsSheet: vi.fn(),
    prefetchProfileSettingsStudioTabs: vi.fn(),
    loadProfileSettingsSheetModule: vi.fn(() => Promise.resolve({ ProfileSettingsSheet: () => null })),
}));

vi.mock('@/app/services/lawyer-cloud', () => ({
    ProfileDB: {
        saveProfile: vi.fn(),
    },
}));

vi.mock('@/app/services/profile/profileWarmCache', () => ({
    setProfileWarmCache: vi.fn(),
}));

vi.mock('@/app/services/profile/profileSaveQueue', () => ({
    createProfileSaveQueue: () => (fn: () => Promise<void>) => fn(),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { ProfileDB } from '@/app/services/lawyer-cloud';
import {
    prefetchProfileSettingsSheet,
    prefetchProfileSettingsStudioTabs,
    loadProfileSettingsSheetModule,
} from '@/app/utils/lazyComponents';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';

const baseProfile = {
    header: { name: 'أحمد', title: 'محامٍ', coverImage: '', profileImage: '' },
    sections: [],
    customization: defaultProfilePageCustomization(),
};

describe('useProfileStudioSettings', () => {
    const setProfile = vi.fn();
    const profileRef = { current: baseProfile as typeof baseProfile };

    beforeEach(() => {
        vi.clearAllMocks();
        profileRef.current = { ...baseProfile, customization: defaultProfilePageCustomization() };
    });

    it('يمنع فتح الاستوديو لملف الزائر', () => {
        const { result } = renderHook(() =>
            useProfileStudioSettings({
                userId: 'visitor',
                isOwnProfile: false,
                profileRef,
                setProfile,
                enqueueProfileSave: (fn) => fn(),
            }),
        );

        act(() => {
            result.current.openSettings();
        });

        expect(result.current.settingsOpen).toBe(false);
        expect(loadProfileSettingsSheetModule).not.toHaveBeenCalled();
    });

    it('يفتح الاستوديو ويسخّن الورقة للمالك', () => {
        const { result } = renderHook(() =>
            useProfileStudioSettings({
                userId: 'owner-1',
                isOwnProfile: true,
                profileRef,
                setProfile,
                enqueueProfileSave: (fn) => fn(),
            }),
        );

        act(() => {
            result.current.openSettings();
        });

        expect(result.current.settingsOpen).toBe(true);
        expect(prefetchProfileSettingsSheet).toHaveBeenCalledTimes(1);
        expect(prefetchProfileSettingsStudioTabs).toHaveBeenCalledTimes(1);
        expect(loadProfileSettingsSheetModule).toHaveBeenCalledTimes(1);
    });

    it('يحفظ التخصيص ويحدّث الكاش', async () => {
        vi.mocked(ProfileDB.saveProfile).mockResolvedValue(undefined as never);
        const nextCustomization = {
            ...defaultProfilePageCustomization(),
            accentColor: 'emerald' as const,
        };

        const { result } = renderHook(() =>
            useProfileStudioSettings({
                userId: 'owner-1',
                isOwnProfile: true,
                profileRef,
                setProfile,
                enqueueProfileSave: (fn) => fn(),
            }),
        );

        let ok = false;
        await act(async () => {
            ok = await result.current.saveCustomization(nextCustomization);
        });

        expect(ok).toBe(true);
        expect(ProfileDB.saveProfile).toHaveBeenCalled();
        expect(setProfile).toHaveBeenCalled();
        expect(SmartToast.success).toHaveBeenCalledWith('تم حفظ إعدادات الصفحة');
    });

    it('يعرض خطأ عند فشل الحفظ', async () => {
        vi.mocked(ProfileDB.saveProfile).mockRejectedValue(new Error('network'));

        const { result } = renderHook(() =>
            useProfileStudioSettings({
                userId: 'owner-1',
                isOwnProfile: true,
                profileRef,
                setProfile,
                enqueueProfileSave: (fn) => fn(),
            }),
        );

        let ok = true;
        await act(async () => {
            ok = await result.current.saveCustomization(defaultProfilePageCustomization());
        });

        expect(ok).toBe(false);
        expect(SmartToast.error).toHaveBeenCalledWith('فشل حفظ الإعدادات');
    });

    it('يغلق الاستوديو عند حدث dismiss العام', async () => {
        const { result } = renderHook(() =>
            useProfileStudioSettings({
                userId: 'owner-1',
                isOwnProfile: true,
                profileRef,
                setProfile,
                enqueueProfileSave: (fn) => fn(),
            }),
        );

        act(() => {
            result.current.openSettings();
        });
        expect(result.current.settingsOpen).toBe(true);

        act(() => {
            window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: {} }));
        });

        await waitFor(() => expect(result.current.settingsOpen).toBe(false));
    });
});
