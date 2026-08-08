import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { BellRing, Clock, MapPin } from '@/app/components/ui/lucideIcons';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    formatCalendarReminderLabel,
    type CalendarReminderMinutes,
} from '@/app/services/calendar/calendarEventReminder';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import {
    playHamiLegalReminderAlarm,
    stopHamiLegalReminderAlarm,
} from '@/app/services/calendar/calendarReminderAlarmSound';

export type CalendarReminderAlarmPayload = {
    event: CalendarEvent;
    fireAt: Date;
    reminderMinutesBefore: number;
};

const SNOOZE_OPTIONS: CalendarReminderMinutes[] = [5, 10, 15];

type CalendarReminderModalProps = {
    alarm: CalendarReminderAlarmPayload | null;
    onDismiss: () => void;
    onSnooze: (minutes: CalendarReminderMinutes) => void;
};

export function CalendarReminderModal({ alarm, onDismiss, onSnooze }: CalendarReminderModalProps) {
    const reduceMotion = useReduceMotion();
    const stopAlarmRef = useRef<(() => void) | null>(null);
    const loopTimerRef = useRef<number | null>(null);

    useBodyScrollLock(Boolean(alarm));

    const playLoop = useCallback(async () => {
        stopAlarmRef.current?.();
        stopAlarmRef.current = await playHamiLegalReminderAlarm({ repeats: 2, repeatGapSec: 0.28 });
    }, []);

    useEffect(() => {
        if (!alarm) {
            stopAlarmRef.current?.();
            stopAlarmRef.current = null;
            if (loopTimerRef.current !== null) {
                window.clearInterval(loopTimerRef.current);
                loopTimerRef.current = null;
            }
            stopHamiLegalReminderAlarm();
            return;
        }

        void playLoop();
        loopTimerRef.current = window.setInterval(() => {
            void playLoop();
        }, 9_500);

        return () => {
            stopAlarmRef.current?.();
            stopAlarmRef.current = null;
            if (loopTimerRef.current !== null) {
                window.clearInterval(loopTimerRef.current);
                loopTimerRef.current = null;
            }
            stopHamiLegalReminderAlarm();
        };
    }, [alarm, playLoop]);

    if (!alarm || typeof document === 'undefined') return null;

    const { event, reminderMinutesBefore } = alarm;
    const timeLabel = event.time ? event.time : '—';
    const dateLabel = event.date?.slice(0, 10) ?? '';

    const content = (
        <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.16 }}
            className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-[#000000]/78 backdrop-blur-[6px] p-3 sm:p-4"
            data-testid="calendar-reminder-modal-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="calendar-reminder-title"
            aria-describedby="calendar-reminder-desc"
        >
            <motion.div
                initial={reduceMotion ? false : { y: 24, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
                className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-[#E6C673]/28 bg-[linear-gradient(165deg,#0A0F1C_0%,#121A2E_55%,#0A0F1C_100%)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
                data-testid="calendar-reminder-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-3 mb-4" dir="rtl">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673]">
                        <BellRing size={22} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                        <p className="text-[11px] font-bold tracking-wide text-[#E6C673]/85 mb-1">
                            تذكير موعد — حامي
                        </p>
                        <h2
                            id="calendar-reminder-title"
                            className="text-lg font-extrabold text-[#F8FAFC] leading-snug break-words"
                        >
                            {event.title}
                        </h2>
                        <p id="calendar-reminder-desc" className="mt-1 text-xs text-[#94A3B8]">
                            {formatCalendarReminderLabel(reminderMinutesBefore)} · الموعد {timeLabel}
                        </p>
                    </div>
                </div>

                <div className="space-y-2 mb-5 text-right" dir="rtl">
                    <div className="flex items-center gap-2 text-sm text-[#CBD5E1]">
                        <Clock size={15} className="text-[#E6C673]/80 shrink-0" aria-hidden />
                        <span>
                            {dateLabel} — {timeLabel}
                        </span>
                    </div>
                    {event.location ? (
                        <div className="flex items-center gap-2 text-sm text-[#CBD5E1]">
                            <MapPin size={15} className="text-[#E6C673]/80 shrink-0" aria-hidden />
                            <span className="break-words">{event.location}</span>
                        </div>
                    ) : null}
                </div>

                <div className="space-y-3" dir="rtl">
                    <p className="text-[11px] font-bold text-[#94A3B8]">تأجيل التذكير</p>
                    <div className="grid grid-cols-3 gap-2">
                        {SNOOZE_OPTIONS.map((minutes) => (
                            <button
                                key={minutes}
                                type="button"
                                data-testid={`calendar-reminder-snooze-${minutes}`}
                                onClick={() => onSnooze(minutes)}
                                className="min-h-[44px] rounded-xl border border-[#E6C673]/22 bg-[#E6C673]/8 text-xs font-extrabold text-[#F1F5F9] touch-manipulation hover:border-[#E6C673]/40"
                            >
                                {minutes} د
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        data-testid="calendar-reminder-dismiss"
                        onClick={onDismiss}
                        className="w-full min-h-[48px] rounded-xl bg-[#E6C673] text-sm font-extrabold text-[#0A0F1C] touch-manipulation hover:bg-[#f0d48a]"
                    >
                        حسناً — فهمت
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );

    return createPortal(content, document.body);
}
