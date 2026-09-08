import { useEffect } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/nativeBackStack';
import {
    isCalendarInstantChromeActive,
    isCalendarPaintCoverInteractive,
    isCalendarReminderOverlayOpen,
} from '@/app/services/calendar/calendarReminderOverlayGate';
import { tearDownCalendarFloatingState } from '@/app/components/lawyer/SmartLegalRadar/tearDownCalendarFloatingState';

type UseScheduleTabEscapeParams = {
    enabled: boolean;
    showForm: boolean;
    formSaving: boolean;
    onCloseForm: () => void;
    onBack: () => void;
};

/**
 * Escape/Cap: منبّه التذكير أولاً (طبقة أعلى)، ثم النموذج، ثم الرجوع.
 * أثناء تحميل نموذج كسول يبقى هذا الـ hook مالك Escape حتى يُركَّب EventForm.
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
            if (isCalendarReminderOverlayOpen()) return false;
            if (isCalendarInstantChromeActive()) return false;
            if (isCalendarPaintCoverInteractive()) return false;
            if (showForm) {
                if (!formSaving) onCloseForm();
                return true;
            }
            try { tearDownCalendarFloatingState(); } catch { /* ignore */ }
            onBack();
            return true;
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (isCalendarReminderOverlayOpen()) return;
            if (isCalendarInstantChromeActive()) return;
            if (isCalendarPaintCoverInteractive()) return;
            if (showForm) {
                e.preventDefault();
                e.stopPropagation();
                if (!formSaving) onCloseForm();
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            try { tearDownCalendarFloatingState(); } catch { /* ignore */ }
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
