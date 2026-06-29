import { useEffect } from 'react';

export type UseProfileScreenEscapeParams = {
    enabled: boolean;
    settingsOpen: boolean;
    isEditing: boolean;
    onCloseSettings: () => void;
    onCancelEdit: () => void;
    onBack?: () => void;
};

/** Escape على شاشة الملف: إغلاق الاستوديو أولاً، ثم إلغاء التحرير، ثم الرجوع للوحة. */
export function useProfileScreenEscape({
    enabled,
    settingsOpen,
    isEditing,
    onCloseSettings,
    onCancelEdit,
    onBack,
}: UseProfileScreenEscapeParams) {
    useEffect(() => {
        if (!enabled) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (settingsOpen) return;

            e.preventDefault();
            e.stopPropagation();

            if (isEditing) {
                onCancelEdit();
                return;
            }

            onBack?.();
        };

        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [enabled, isEditing, onBack, onCancelEdit, settingsOpen]);
}
