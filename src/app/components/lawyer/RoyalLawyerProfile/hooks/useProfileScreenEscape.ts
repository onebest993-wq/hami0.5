import { useEffect, type MutableRefObject } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';
import {
    isProfileStudioChromeVisible,
    isProfileStudioSheetVisible,
} from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

type UseProfileScreenEscapeParams = {
    enabled: boolean;
    settingsOpen: boolean;
    savingSettings?: boolean;
    /** حالة متزامنة — تُقرأ من ref لتفادي تأخير useEffect بعد فتح المعرض */
    galleryOpenRef?: MutableRefObject<boolean>;
    galleryOpen?: boolean;
    isEditing: boolean;
    onCloseSettings: () => void;
    onCloseGallery?: () => void;
    /** نفس مسار شريط الرجوع — حفظ ثم مغادرة (لا إلغاء صامت) */
    onLeaveProfile: () => void;
};

/**
 * Escape/Cap على شاشة الملف:
 * 1) أغلق المعرض
 * 2) أغلق الاستوديو
 * 3) إن كان التحرير مفتوحاً → نفس مسار الرجوع (حفظ+مغادرة)
 * 4) وإلا غادر
 */
export function useProfileScreenEscape({
    enabled,
    settingsOpen,
    savingSettings = false,
    galleryOpenRef,
    galleryOpen = false,
    isEditing: _isEditing,
    onCloseSettings,
    onCloseGallery,
    onLeaveProfile,
}: UseProfileScreenEscapeParams) {
    useEffect(() => {
        if (!enabled) return;

        const isGalleryOpen = () => Boolean(galleryOpenRef?.current ?? galleryOpen);
        const isStudioChromeOpen = () =>
            settingsOpen || isProfileStudioChromeVisible();

        const consumeBackStack = (): boolean => {
            if (isGalleryOpen()) {
                onCloseGallery?.();
                return true;
            }
            if (isStudioChromeOpen()) {
                /* أثناء الحفظ: استهلك الرجوع دون إغلاق حتى لا تُفقد وسائط الحفظ */
                if (savingSettings) return true;
                onCloseSettings();
                return true;
            }
            onLeaveProfile();
            return true;
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (isGalleryOpen()) return;
            if (isStudioChromeOpen()) {
                /* الورقة الظاهرة تملك الفخ؛ نية html بلا ورقة تُغلق هنا */
                if (isProfileStudioSheetVisible()) return;
                e.preventDefault();
                e.stopPropagation();
                if (!savingSettings) onCloseSettings();
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            onLeaveProfile();
        };

        window.addEventListener('keydown', onKey, true);
        const unregisterNativeBack = registerNativeBackHandler(() => consumeBackStack());
        return () => {
            window.removeEventListener('keydown', onKey, true);
            unregisterNativeBack();
        };
    }, [
        enabled,
        onLeaveProfile,
        onCloseSettings,
        onCloseGallery,
        settingsOpen,
        savingSettings,
        galleryOpen,
        galleryOpenRef,
    ]);
}
