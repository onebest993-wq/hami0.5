import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import {
    dismissTransientOverlays,
    HAMI_DISMISS_OVERLAYS_EVENT,
    releaseBodyScrollLock,
    type TransientOverlayId,
} from '@/app/utils/bodyScrollLock';
import {
    normalizeProfilePageCustomization,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { LawyerProfileData } from '@/app/services/lawyer-cloud';
import { ProfileDB } from '@/app/services/lawyer-cloud';
import { setProfileWarmCache } from '@/app/services/profile/profileWarmCache';
import {
    loadProfileSettingsSheetModule,
    prefetchProfileSettingsSheet,
    prefetchProfileSettingsStudioTabs,
} from '@/app/utils/lazyComponents';
import type { createProfileSaveQueue } from '@/app/services/profile/profileSaveQueue';
import { canOpenProfileStudio } from '@/app/services/profile/profileStudioAccessLogic';

type UseProfileStudioSettingsArgs = {
    userId: string;
    isOwnProfile: boolean;
    profileRef: React.MutableRefObject<LawyerProfileData | null>;
    setProfile: (profile: LawyerProfileData) => void;
    enqueueProfileSave: ReturnType<typeof createProfileSaveQueue>;
};

const PROFILE_SAVE_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error(message)), ms);
        promise
            .then((value) => {
                window.clearTimeout(timer);
                resolve(value);
            })
            .catch((err) => {
                window.clearTimeout(timer);
                reject(err);
            });
    });
}
export function useProfileStudioSettings({
    userId,
    isOwnProfile,
    profileRef,
    setProfile,
    enqueueProfileSave,
}: UseProfileStudioSettingsArgs) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    const closeSettings = useCallback(() => {
        setSettingsOpen(false);
        releaseBodyScrollLock();
    }, []);

    const openSettings = useCallback(() => {
        if (!canOpenProfileStudio(isOwnProfile)) return;
        prefetchProfileSettingsSheet();
        prefetchProfileSettingsStudioTabs();
        void loadProfileSettingsSheetModule().catch(() => undefined);
        dismissTransientOverlays('profile-settings');
        flushSync(() => {
            setSettingsOpen(true);
        });
    }, [isOwnProfile]);

    useEffect(() => {
        const onDismiss = (e: Event) => {
            const except = (e as CustomEvent<{ except?: TransientOverlayId }>).detail?.except;
            if (except !== 'profile-settings') {
                setSettingsOpen(false);
                releaseBodyScrollLock();
            }
        };
        window.addEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
        return () => window.removeEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
    }, []);

    const saveCustomization = useCallback(
        async (next: ProfilePageCustomization, options?: { silent?: boolean }): Promise<boolean> => {
            if (!userId || !canOpenProfileStudio(isOwnProfile)) return false;
            const normalized = normalizeProfilePageCustomization(next);
            setSavingSettings(true);
            try {
                await withTimeout(
                    enqueueProfileSave(async () => {
                        const current = profileRef.current;
                        if (!current) return;
                        const payload: LawyerProfileData = {
                            ...current,
                            customization: normalized,
                        };
                        await ProfileDB.saveProfile(userId, payload, userId);
                        setProfile(payload);
                        setProfileWarmCache(userId, payload);
                    }),
                    PROFILE_SAVE_TIMEOUT_MS,
                    'profile-save-timeout',
                );
                if (!options?.silent) {
                    SmartToast.success('تم حفظ إعدادات الصفحة');
                }
                return true;
            } catch {
                SmartToast.error('فشل حفظ الإعدادات');
                return false;
            } finally {
                setSavingSettings(false);
            }
        },
        [userId, isOwnProfile, enqueueProfileSave, profileRef, setProfile],
    );

    return {
        settingsOpen,
        savingSettings,
        openSettings,
        closeSettings,
        saveCustomization,
    };
}
