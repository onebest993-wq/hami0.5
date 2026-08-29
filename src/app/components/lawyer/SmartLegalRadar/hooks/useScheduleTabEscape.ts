import { useEffect } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/nativeBackStack';

type UseScheduleTabEscapeParams = {
    enabled: boolean;
    showForm: boolean;
    formSaving: boolean;
    onCloseForm: () => void;
    onBack: () => void;
};

/**
 * Escape/Cap على تبويب التقويم: إغلاق نموذج الموعد أولاً، ثم الرجوع للرئيسية.
 * لوحة المفاتيح: EventForm يملك Escape أثناء showForm — هذا الـ hook لا يسرقها.
 */
export function useScheduleTabEscape({
    enabled,
    showForm,
    formSaving,
    onCloseForm,
    onBack,
}: UseScheduleTabEscapeParams) {
    useEffect(() => {
        if (!enabled) return;

        const consumeBackStack = (): boolean => {
            if (showForm) {
                if (!formSaving) onCloseForm();
                return true;
            }
            onBack();
            return true;
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            /* نموذج الموعد يملك Escape الخاص به */
            if (showForm) return;

            e.preventDefault();
            e.stopPropagation();
            onBack();
        };

        window.addEventListener('keydown', onKey, true);
        const unregisterNativeBack = registerNativeBackHandler(() => consumeBackStack());
        return () => {
            window.removeEventListener('keydown', onKey, true);
            unregisterNativeBack();
        };
    }, [enabled, formSaving, onBack, onCloseForm, showForm]);
}
