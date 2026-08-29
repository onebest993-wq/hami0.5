import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    useLawyerSettings,
    useLawyerSettingsActions,
} from '@/app/context/lawyerSettings/lawyerSettingsHooks';
import {
    NOTIFICATION_SETTINGS_DEFAULTS,
    normalizeNotificationSettings,
    parseDatetimeLocalToMuteUntil,
    patchNotificationSettings,
    toDatetimeLocalValue,
} from '@/app/services/settings/notificationSettings';
import {
    isSessionMuted,
    isWithinQuietHours,
} from '@/app/services/notifications/notificationAlertPolicy';
import { stopHamiLegalReminderAlarm } from '@/app/services/calendar/calendarReminderAlarmSound';
import { primeNotificationArrivalAudio } from '@/app/services/notifications/notificationArrivalSound';
import { formatMuteUntilLabel } from '@/app/components/lawyer/NotificationPanel/utils/formatMuteUntilLabel';
import type { NotificationAlertDndMode } from '@/app/components/lawyer/NotificationPanel/components/notificationAlertDndTypes';

/** حالة كتم الجلسة / ساعات الهدوء فقط — منفصل عن قنوات الصوت والصلاحيات. */
export function useNotificationDndControls() {
    const { settings } = useLawyerSettings();
    const { patchSettings } = useLawyerSettingsActions();
    const notifications = normalizeNotificationSettings(
        settings.notifications ?? NOTIFICATION_SETTINGS_DEFAULTS,
    );
    const quietHoursActive = isWithinQuietHours(settings);
    const mutedUntil =
        typeof notifications.sessionMutedUntil === 'number' && isSessionMuted(settings)
            ? notifications.sessionMutedUntil
            : null;

    const [dndMode, setDndMode] = useState<NotificationAlertDndMode>(() =>
        mutedUntil ? 'once' : 'schedule',
    );
    const [muteUntilLocal, setMuteUntilLocal] = useState(() =>
        toDatetimeLocalValue(Date.now() + 60 * 60_000),
    );
    const [muteError, setMuteError] = useState<string | null>(null);

    useEffect(() => {
        if (mutedUntil) {
            setMuteUntilLocal(toDatetimeLocalValue(mutedUntil));
            setDndMode('once');
        }
    }, [mutedUntil]);

    const patchNotifications = useCallback(
        (patch: Parameters<typeof patchNotificationSettings>[1]) => {
            void primeNotificationArrivalAudio().catch(() => undefined);
            patchSettings((prev) => ({
                ...prev,
                notifications: patchNotificationSettings(
                    normalizeNotificationSettings(prev.notifications),
                    patch,
                ),
            }));
        },
        [patchSettings],
    );

    const applySessionMute = useCallback(
        (until: number | null) => {
            stopHamiLegalReminderAlarm();
            patchNotifications({ sessionMutedUntil: until });
            if (until === null) {
                setMuteError(null);
            }
        },
        [patchNotifications],
    );

    const applyMuteUntilPicked = useCallback(() => {
        const ms = parseDatetimeLocalToMuteUntil(muteUntilLocal);
        if (!ms) {
            setMuteError('اختر وقتاً لاحقاً لإعادة تفعيل التنبيهات');
            return;
        }
        setMuteError(null);
        applySessionMute(ms);
    }, [applySessionMute, muteUntilLocal]);

    const dndStatus = useMemo(() => {
        if (mutedUntil) {
            return {
                tone: 'active' as const,
                text: `كتم مؤقت — حتى ${formatMuteUntilLabel(mutedUntil)}`,
            };
        }
        if (notifications.quietHours.enabled && quietHoursActive) {
            return {
                tone: 'active' as const,
                text: `هدوء يومي — ${notifications.quietHours.start}–${notifications.quietHours.end}`,
            };
        }
        if (notifications.quietHours.enabled) {
            return {
                tone: 'idle' as const,
                text: `هدوء مجدول — ${notifications.quietHours.start}–${notifications.quietHours.end}`,
            };
        }
        return null;
    }, [mutedUntil, notifications.quietHours, quietHoursActive]);

    return {
        notifications,
        quietHoursActive,
        mutedUntil,
        dndMode,
        setDndMode,
        muteUntilLocal,
        muteError,
        dndStatus,
        minDatetimeLocal: toDatetimeLocalValue(Date.now() + 60_000),
        patchNotifications,
        applySessionMute,
        applyMuteUntilPicked,
        setMuteUntilLocal,
        setMuteError,
    };
}
