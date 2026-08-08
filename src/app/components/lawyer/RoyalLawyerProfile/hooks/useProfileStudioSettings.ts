import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';
import { setProfileWarmCache } from '@/app/services/profile/profileWarmCache';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
import { primeProfileStudio } from '@/app/runtime/profileShellPrime';
import {
    loadProfileSettingsSheetModule,
} from '@/app/utils/lazyComponentsIntent';
import type { createProfileSaveQueue } from '@/app/services/profile/profileSaveQueue';
import { canOpenProfileStudio } from '@/app/services/profile/profileStudioAccessLogic';
import { profileMediaPathsRemovedFrom } from '@/app/services/profile/profileMediaPaths';

type UseProfileStudioSettingsArgs = {
    userId: string;
    isOwnProfile: boolean;
    profileRef: React.MutableRefObject<LawyerProfileData | null>;
    setProfile: (profile: LawyerProfileData) => void;
    enqueueProfileSave: ReturnType<typeof createProfileSaveQueue>;
};

export type CloseProfileSettingsOptions = {
    /** إغلاق قسري عند تبديل الملف — يتخطى حظر الحفظ دون حذف وسائط الحفظ الجاري */
    force?: boolean;
    /**
     * إغلاق من useEffect/lifecycle — بلا flushSync.
     * (React يحذّر: flushSync من داخل lifecycle).
     */
    soft?: boolean;
};

export function useProfileStudioSettings({
    userId,
    isOwnProfile,
    profileRef,
    setProfile,
    enqueueProfileSave,
}: UseProfileStudioSettingsArgs) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const saveEpochRef = useRef(0);
    const savingAttemptRef = useRef(0);
    const savingSettingsRef = useRef(false);
    const settingsOpenRef = useRef(false);
    const discardOrphansRef = useRef<(() => void) | null>(null);
    const userIdRef = useRef(userId);
    userIdRef.current = userId;
    settingsOpenRef.current = settingsOpen;

    useEffect(() => {
        /* إبطال أي حفظ استوديو جاري عند تبديل الملف */
        saveEpochRef.current += 1;
        savingAttemptRef.current += 1;
        savingSettingsRef.current = false;
        setSavingSettings(false);
    }, [userId]);

    const registerStudioDiscard = useCallback((fn: (() => void) | null) => {
        discardOrphansRef.current = fn;
    }, []);

    const closeSettings = useCallback((options?: CloseProfileSettingsOptions): boolean => {
        const force = options?.force === true;
        const soft = options?.soft === true;
        /* أثناء الحفظ: لا تُغلق يدوياً ولا تُحذف وسائط ما زال الحفظ يعتمد عليها */
        if (!force && savingSettingsRef.current) {
            SmartToast.info('جاري حفظ الإعدادات — انتظر قليلاً');
            return false;
        }
        const wasSaving = savingSettingsRef.current;
        if (force) {
            savingAttemptRef.current += 1;
            savingSettingsRef.current = false;
            setSavingSettings(false);
        }
        /* force أثناء الحفظ: أغلق الواجهة دون discard — الحفظ الجاري ما زال يحتاج المسارات */
        if (!wasSaving) {
            try {
                discardOrphansRef.current?.();
            } catch {
                /* ignore discard errors */
            }
        }
        discardOrphansRef.current = null;
        if (settingsOpenRef.current) {
            settingsOpenRef.current = false;
            if (soft) {
                setSettingsOpen(false);
            } else {
                flushSync(() => {
                    setSettingsOpen(false);
                });
            }
        } else {
            setSettingsOpen(false);
        }
        releaseBodyScrollLock();
        return true;
    }, []);

    const openSettings = useCallback(() => {
        if (!canOpenProfileStudio(isOwnProfile)) return;
        if (settingsOpenRef.current) {
            dismissTransientOverlays('profile-settings');
            return;
        }
        /* افتح فوراً — أي تسخين/إغلاق طبقات أخرى بعد الإطار الأول */
        primeProfileStudio();
        void loadProfileSettingsSheetModule().catch(() => undefined);
        settingsOpenRef.current = true;
        flushSync(() => {
            setSettingsOpen(true);
        });
        dismissTransientOverlays('profile-settings');
    }, [isOwnProfile]);

    useEffect(() => {
        const onDismiss = (e: Event) => {
            const except = (e as CustomEvent<{ except?: TransientOverlayId }>).detail?.except;
            if (except === 'profile-settings' || except === 'profile') return;
            /* أثناء الحفظ: أبقِ الورقة مفتوحة واحتفظ بـ discard بعد اكتمال الحفظ */
            if (savingSettingsRef.current) return;
            try {
                discardOrphansRef.current?.();
            } catch {
                /* ignore */
            }
            discardOrphansRef.current = null;
            setSettingsOpen(false);
            releaseBodyScrollLock();
        };
        window.addEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
        return () => window.removeEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
    }, []);

    const saveCustomization = useCallback(
        async (next: ProfilePageCustomization, options?: { silent?: boolean }): Promise<boolean> => {
            if (!userId || !canOpenProfileStudio(isOwnProfile)) return false;
            const normalized = normalizeProfilePageCustomization(next);
            const current = profileRef.current;
            const previousCustomization = current?.customization
                ? normalizeProfilePageCustomization(current.customization)
                : null;
            const previousProfile = current
                ? {
                      ...current,
                      header: { ...current.header },
                      sections: current.sections.map((section) => ({ ...section })),
                      customization: current.customization,
                  }
                : null;
            if (current) {
                const optimistic: LawyerProfileData = {
                    ...current,
                    customization: normalized,
                };
                setProfile(optimistic);
                setProfileWarmCache(userId, optimistic);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                        new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }),
                    );
                }
            }
            /* ref قبل أي await — وإلا Escape/إغلاق يحذف وسائط الحفظ الجاري */
            savingSettingsRef.current = true;
            setSavingSettings(true);
            const saveEpoch = ++saveEpochRef.current;
            const savingAttempt = ++savingAttemptRef.current;
            try {
                const result = await enqueueProfileSave(async () => {
                        const latest = profileRef.current;
                        if (!latest) {
                            throw new Error('profile-missing');
                        }
                        const payload: LawyerProfileData = {
                            ...latest,
                            customization: normalized,
                        };
                        const { ProfileDB } = await import('@/app/services/cloud/lawyerProfileCloud');
                        const saveResult = await ProfileDB.saveProfile(userId, payload, userId);
                        /* GC بعد كتابة ناجحة — لا يعتمد على بقاء جلسة الواجهة */
                        if (saveResult.cloudSynced) {
                            const orphaned = profileMediaPathsRemovedFrom(
                                previousCustomization,
                                normalized,
                            );
                            if (orphaned.length > 0) {
                                void import('@/app/services/profileMediaService')
                                    .then((m) => m.removeProfileMediaPaths(orphaned))
                                    .catch(() => undefined);
                            }
                        }
                        if (saveEpoch === saveEpochRef.current && userId === userIdRef.current) {
                            setProfile(payload);
                            setProfileWarmCache(userId, payload);
                        }
                        return saveResult;
                    });
                if (saveEpoch !== saveEpochRef.current || userId !== userIdRef.current) {
                    return true;
                }
                if (!options?.silent) {
                    const { isKvProxyNetworkEnabled } = await import('@/app/services/kvProxyConfig');
                    if (result.cloudSynced === false && isKvProxyNetworkEnabled()) {
                        SmartToast.warning('حُفظ على الجهاز — تعذر المزامنة السحابية. أعد المحاولة لاحقاً');
                    } else {
                        SmartToast.success('تم حفظ إعدادات الصفحة');
                    }
                }
                return true;
            } catch (error) {
                const timedOut =
                    error instanceof Error && error.message === 'profile-save-timeout';
                if (timedOut) {
                    if (!options?.silent && saveEpoch === saveEpochRef.current) {
                        SmartToast.warning(
                            'الحفظ يستغرق وقتاً أطول من المتوقع — قد يكون اكتمل على الجهاز',
                        );
                    }
                    /* الحذف الصامت يحتاج تأكيداً — المهلة لا تُحسب نجاحاً لتجنّب إغلاق/تأكيد كاذب */
                    return options?.silent ? false : true;
                }
                if (previousProfile && saveEpoch === saveEpochRef.current) {
                    setProfile(previousProfile);
                    setProfileWarmCache(userId, previousProfile);
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                            new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }),
                        );
                    }
                }
                if (!options?.silent) {
                    SmartToast.error('فشل حفظ الإعدادات');
                }
                return false;
            } finally {
                if (savingAttempt === savingAttemptRef.current) {
                    savingSettingsRef.current = false;
                    setSavingSettings(false);
                }
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
        registerStudioDiscard,
    };
}
