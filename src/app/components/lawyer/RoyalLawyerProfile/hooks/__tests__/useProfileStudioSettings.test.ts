import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProfileStudioSettings } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileStudioSettings';
import { defaultProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: vi.fn(),
    releaseBodyScrollLock: vi.fn(),
    HAMI_DISMISS_OVERLAYS_EVENT: 'hami:dismiss-overlays',
}));

vi.mock('@/app/utils/lazyComponentsIntent', () => ({
    loadProfileSettingsSheetModule: vi.fn(() => Promise.resolve({ ProfileSettingsSheet: () => null })),
}));

vi.mock('@/app/runtime/profileShellPrime', () => ({
    primeProfileStudio: vi.fn(),
}));

vi.mock('@/app/services/cloud/lawyerProfileCloud', () => ({
    ProfileDB: {
        saveProfile: vi.fn(),
    },
}));

vi.mock('@/app/services/lawyer-cloud', () => ({
    ProfileDB: {
        saveProfile: vi.fn(),
    },
}));

vi.mock('@/app/services/profile/profileWarmCache', () => ({
    setProfileWarmCache: vi.fn(),
}));

vi.mock('@/app/services/kvProxyConfig', () => ({
    isKvProxyNetworkEnabled: () => false,
}));

vi.mock('@/app/services/profile/profileSaveQueue', () => ({
    createProfileSaveQueue: () => (fn: () => Promise<void>) => fn(),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
    },
}));

import { ProfileDB } from '@/app/services/cloud/lawyerProfileCloud';
import { loadProfileSettingsSheetModule } from '@/app/utils/lazyComponentsIntent';
import { primeProfileStudio } from '@/app/runtime/profileShellPrime';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';
import { resetProfileOpenedThisPageForTests } from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

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
        resetProfileOpenedThisPageForTests();
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

    it('يفتح الاستوديو ويسخّن الورقة للمالك', async () => {
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

        await act(async () => {
            await Promise.resolve();
        });

        expect(primeProfileStudio).toHaveBeenCalledTimes(1);
        expect(loadProfileSettingsSheetModule).toHaveBeenCalledTimes(1);
        expect(document.documentElement.getAttribute('data-hami-profile-studio-open')).toBe('1');
    });

    it('يحفظ التخصيص ويحدّث الكاش', async () => {
        vi.mocked(ProfileDB.saveProfile).mockResolvedValue({ cloudSynced: true, localPersisted: true });
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

    it('بعد dismiss العام يُعاد فتح الاستوديو من الزر', async () => {
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
        act(() => {
            window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: {} }));
        });
        await waitFor(() => expect(result.current.settingsOpen).toBe(false));

        act(() => {
            result.current.openSettings();
        });
        expect(result.current.settingsOpen).toBe(true);
    });

    it('الحفظ الصامت لا يقفل واجهة الاستوديو', async () => {
        let resolveSave!: (value: { cloudSynced: boolean; localPersisted: boolean }) => void;
        vi.mocked(ProfileDB.saveProfile).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveSave = resolve;
                }),
        );

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

        let savePromise!: Promise<boolean>;
        act(() => {
            savePromise = result.current.saveCustomization(defaultProfilePageCustomization(), {
                silent: true,
            });
        });

        await act(async () => {
            await Promise.resolve();
        });
        expect(result.current.savingSettings).toBe(false);

        await act(async () => {
            resolveSave({ cloudSynced: true, localPersisted: true });
            await savePromise;
        });
        expect(result.current.savingSettings).toBe(false);
    });

    it('لا يغلق الاستوديو بـ dismiss أثناء الحفظ', async () => {
        let resolveSave!: (value: { cloudSynced: boolean; localPersisted: boolean }) => void;
        vi.mocked(ProfileDB.saveProfile).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveSave = resolve;
                }),
        );

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

        let savePromise!: Promise<boolean>;
        act(() => {
            savePromise = result.current.saveCustomization(defaultProfilePageCustomization());
        });

        await waitFor(() => expect(result.current.savingSettings).toBe(true));

        const discard = vi.fn();
        act(() => {
            result.current.registerStudioDiscard(discard);
        });

        act(() => {
            window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: {} }));
        });
        expect(result.current.settingsOpen).toBe(true);

        act(() => {
            result.current.closeSettings();
        });
        expect(result.current.settingsOpen).toBe(true);
        expect(discard).not.toHaveBeenCalled();

        act(() => {
            result.current.closeSettings({ force: true });
        });
        expect(result.current.settingsOpen).toBe(false);
        expect(discard).not.toHaveBeenCalled();

        await act(async () => {
            resolveSave({ cloudSynced: true, localPersisted: true });
            await savePromise;
        });
    });

    it('يمنع الإغلاق وحذف الوسائط فوراً بعد بدء الحفظ قبل إعادة الرسم', async () => {
        let resolveSave!: (value: { cloudSynced: boolean; localPersisted: boolean }) => void;
        vi.mocked(ProfileDB.saveProfile).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveSave = resolve;
                }),
        );
        const discard = vi.fn();

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
            result.current.registerStudioDiscard(discard);
        });

        let savePromise!: Promise<boolean>;
        let closed = true;
        act(() => {
            savePromise = result.current.saveCustomization(defaultProfilePageCustomization());
            /* نفس المزامنة — قبل أن يلتزم React بـ savingSettings=true */
            closed = result.current.closeSettings();
        });

        expect(closed).toBe(false);
        expect(result.current.settingsOpen).toBe(true);
        expect(discard).not.toHaveBeenCalled();
        expect(SmartToast.info).toHaveBeenCalled();

        await waitFor(() => expect(ProfileDB.saveProfile).toHaveBeenCalled());

        await act(async () => {
            resolveSave({ cloudSynced: true, localPersisted: true });
            await savePromise;
        });
    });

    it('يعيد فتح الاستوديو بعد إعادة التركيب إن بقيت نيته على html', () => {
        document.documentElement.setAttribute('data-hami-profile-studio-open', '1');
        const { result } = renderHook(() =>
            useProfileStudioSettings({
                userId: 'owner-1',
                isOwnProfile: true,
                profileRef,
                setProfile,
                enqueueProfileSave: (fn) => fn(),
            }),
        );
        expect(result.current.settingsOpen).toBe(true);
    });
});
