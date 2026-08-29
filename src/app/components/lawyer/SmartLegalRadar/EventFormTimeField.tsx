import React from 'react';
import { Bell } from '@/app/components/ui/icons/Bell';
import { BellRing } from '@/app/components/ui/icons/BellRing';
import {
    CALENDAR_REMINDER_OPTIONS_MINUTES,
    formatCalendarReminderChip,
} from '@/app/services/calendar/calendarEventReminder';
import { primeHamiLegalReminderAudio } from '@/app/services/calendar/calendarReminderAlarmSound';
import { RADAR_FORM_INPUT, RADAR_FORM_LABEL } from './radarTheme';
import type { EventFormData } from './eventFormModel';

type EventFormTimeFieldProps = {
    timeInputId: string;
    localFormData: EventFormData;
    setLocalFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
    openNativePicker: (target: HTMLInputElement) => void;
};

export const EventFormTimeField = React.memo(function EventFormTimeField({
    timeInputId,
    localFormData,
    setLocalFormData,
    openNativePicker,
}: EventFormTimeFieldProps) {
    const hasTime = Boolean(localFormData.time?.trim());
    const reminderEnabled =
        hasTime && localFormData.reminderMinutesBefore !== null && localFormData.reminderMinutesBefore > 0;

    return (
        <div>
            <label htmlFor={timeInputId} className={RADAR_FORM_LABEL}>الوقت</label>
            <div className="flex items-stretch gap-1.5">
                <input
                    id={timeInputId}
                    data-testid="radar-event-time"
                    type="time"
                    value={localFormData.time}
                    step={300}
                    onChange={(e) => {
                        const nextTime = e.target.value;
                        setLocalFormData((prev) => ({
                            ...prev,
                            time: nextTime,
                            reminderMinutesBefore: nextTime.trim()
                                ? prev.reminderMinutesBefore
                                : null,
                        }));
                    }}
                    onFocus={(e) => openNativePicker(e.currentTarget)}
                    className={`${RADAR_FORM_INPUT} min-w-0 flex-1`}
                />
                <button
                    type="button"
                    data-testid="radar-event-reminder-toggle"
                    disabled={!hasTime}
                    aria-pressed={reminderEnabled}
                    aria-label={reminderEnabled ? 'إيقاف التذكير' : 'تفعيل التذكير'}
                    title={hasTime ? 'تذكير قبل الموعد' : 'أضف وقتاً لتفعيل التذكير'}
                    onClick={() => {
                        if (!hasTime) return;
                        const willEnable = !(
                            localFormData.reminderMinutesBefore &&
                            localFormData.reminderMinutesBefore > 0
                        );
                        if (willEnable) {
                            void primeHamiLegalReminderAudio();
                            void import(
                                '@/app/services/notifications/bridge/hamiBridgeNativePlugin'
                            ).then((m) => {
                                void m.requestHamiNotificationPermission({
                                    fromUserGesture: true,
                                });
                            });
                        }
                        setLocalFormData((prev) => ({
                            ...prev,
                            reminderMinutesBefore:
                                prev.reminderMinutesBefore && prev.reminderMinutesBefore > 0
                                    ? null
                                    : 10,
                        }));
                    }}
                    className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border-0 touch-manipulation transition-colors ${
                        !hasTime
                            ? 'bg-[#141a28] text-white/25 cursor-not-allowed'
                            : reminderEnabled
                              ? 'bg-[#E6C673]/18 text-[#E6C673]'
                              : 'bg-[#141a28] text-white/55 hover:bg-[#1a2233]'
                    }`}
                >
                    {reminderEnabled ? <BellRing size={17} /> : <Bell size={17} />}
                </button>
            </div>
            {reminderEnabled ? (
                <div
                    className="mt-2 flex flex-wrap gap-1.5"
                    data-testid="radar-event-reminder-options"
                    role="group"
                    aria-label="مدة التذكير قبل الموعد"
                >
                    {CALENDAR_REMINDER_OPTIONS_MINUTES.map((minutes) => {
                        const active = localFormData.reminderMinutesBefore === minutes;
                        return (
                            <button
                                key={minutes}
                                type="button"
                                data-testid={`radar-event-reminder-${minutes}`}
                                aria-pressed={active}
                                onClick={() =>
                                    setLocalFormData((prev) => ({
                                        ...prev,
                                        reminderMinutesBefore: minutes,
                                    }))
                                }
                                className={`min-h-[44px] rounded-full border-0 px-3 text-[11px] font-medium touch-manipulation transition-colors ${
                                    active
                                        ? 'bg-[#E6C673]/20 text-[#E6C673]'
                                        : 'bg-[#141a28] text-white/55 hover:bg-[#1a2233]'
                                }`}
                            >
                                {formatCalendarReminderChip(minutes)}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
});
