import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
    dismissTransientOverlays,
    HAMI_DISMISS_OVERLAYS_EVENT,
    releaseBodyScrollLock,
    type TransientOverlayId,
} from '@/app/utils/bodyScrollLock';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { primeProfileStudio } from '@/app/runtime/profileShellPrime';
import { loadProfileSettingsSheetModule } from '@/app/utils/lazyComponentsIntent';
import { canOpenProfileStudio } from '@/app/services/profile/profileShellPolicy';
import {
    clearProfileStudioOpen,
    isProfileStudioMarkedOpen,
    markProfileStudioOpen,
} from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

export type CloseProfileSettingsOptions = {
    /** إغلاق قسري عند تبديل الملف — يتخطى حظر الحفظ دون حذف وسائط الحفظ الجاري */
    force?: boolean;
    /**
     * إغلاق من useEffect/lifecycle — بلا flushSync.
     * (React يحذّر: flushSync من داخل lifecycle).
     */
    soft?: boolean;
};

type Args = {
    isOwnProfile: boolean;
    userId: string;
    /** هل حفظ التخصيص جارٍ — يمنع الإغلاق اليدوي وdiscard أثناء الكتابة */
    isSavingRef: React.MutableRefObject<boolean>;
    bumpSavingAttempt: () => void;
    clearSavingUi: () => void;
    invalidateSaveOnUserSwitch: () => void;
};

/** فتح/إغلاق ورقة الاستوديو + dismiss overlays + تسجيل discard */
export function useProfileStudioSheetLifecycle({
    isOwnProfile,
    userId,
    isSavingRef,
    bumpSavingAttempt,
    clearSavingUi,
    invalidateSaveOnUserSwitch,
}: Args) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const settingsOpenRef = useRef(false);
    const discardOrphansRef = useRef<(() => void) | null>(null);
    settingsOpenRef.current = settingsOpen;

    useLayoutEffect(() => {
        if (!canOpenProfileStudio(isOwnProfile)) return;
        if (!isProfileStudioMarkedOpen() || settingsOpenRef.current) return;
        settingsOpenRef.current = true;
        setSettingsOpen(true);
    }, [isOwnProfile]);

    useEffect(() => {
        invalidateSaveOnUserSwitch();
    }, [userId, invalidateSaveOnUserSwitch]);

    const registerStudioDiscard = useCallback((fn: (() => void) | null) => {
        discardOrphansRef.current = fn;
    }, []);

    const closeSettings = useCallback(
        (options?: CloseProfileSettingsOptions): boolean => {
            const force = options?.force === true;
            const soft = options?.soft === true;
            if (!force && isSavingRef.current) {
                SmartToast.info('جاري حفظ الإعدادات — انتظر قليلاً');
                return false;
            }
            const wasSaving = isSavingRef.current;
            if (force) {
                bumpSavingAttempt();
                clearSavingUi();
            }
            if (!wasSaving) {
                try {
                    discardOrphansRef.current?.();
                } catch {
                    /* ignore discard errors */
                }
            }
            discardOrphansRef.current = null;
            clearProfileStudioOpen();
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
        },
        [bumpSavingAttempt, clearSavingUi, isSavingRef],
    );

    const openSettings = useCallback(() => {
        if (!canOpenProfileStudio(isOwnProfile)) return;
        if (settingsOpenRef.current) {
            dismissTransientOverlays('profile-settings');
            return;
        }
        primeProfileStudio();
        void loadProfileSettingsSheetModule().catch(() => undefined);
        markProfileStudioOpen();
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
            if (isSavingRef.current) return;
            try {
                discardOrphansRef.current?.();
            } catch {
                /* ignore */
            }
            discardOrphansRef.current = null;
            settingsOpenRef.current = false;
            clearProfileStudioOpen();
            setSettingsOpen(false);
            releaseBodyScrollLock();
        };
        window.addEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
        return () => window.removeEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
    }, [isSavingRef]);

    return {
        settingsOpen,
        openSettings,
        closeSettings,
        registerStudioDiscard,
    };
}
