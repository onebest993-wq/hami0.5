import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { registerNativeBackHandler } from '@/app/runtime/nativeBackStack';
import {
    formatCalendarReminderLabel,
    formatCalendarReminderSnoozeLabel,
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

const SNOOZE_OPTIONS: CalendarReminderMinutes[] = [5, 10, 15, 30];

type CalendarReminderModalProps = {
    alarm: CalendarReminderAlarmPayload | null;
    onDismiss: () => void;
    onSnooze: (minutes: CalendarReminderMinutes) => void;
};

export function CalendarReminderModal({ alarm, onDismiss, onSnooze }: CalendarReminderModalProps) {
    const reduceMotion = useReduceMotion();
    const stopAlarmRef = useRef<(() => void) | null>(null);
    const loopTimerRef = useRef<number | null>(null);
    const [soundOn, setSoundOn] = useState(true);

    useBodyScrollLock(Boolean(alarm));

    useEffect(() => {
        setSoundOn(true);
    }, [alarm?.event.id, alarm?.fireAt]);

    useEffect(() => {
        if (!alarm) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            onDismiss();
        };
        window.addEventListener('keydown', onKey, true);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            onDismiss();
            return true;
        });
        return () => {
            window.removeEventListener('keydown', onKey, true);
            unregisterNativeBack();
        };
    }, [alarm, onDismiss]);

    const stopLoop = useCallback(() => {
        stopAlarmRef.current?.();
        stopAlarmRef.current = null;
        if (loopTimerRef.current !== null) {
            window.clearInterval(loopTimerRef.current);
            loopTimerRef.current = null;
        }
        stopHamiLegalReminderAlarm();
    }, []);

    const playLoop = useCallback(async () => {
        stopAlarmRef.current?.();
        stopAlarmRef.current = await playHamiLegalReminderAlarm({
            loop: true,
            repeats: 2,
            repeatGapSec: 0.28,
        });
    }, []);

    useEffect(() => {
        if (!alarm || !soundOn) {
            stopLoop();
            return;
        }

        void playLoop();
        loopTimerRef.current = window.setInterval(() => {
            void playLoop();
        }, 12_000);

        return () => {
            stopLoop();
        };
    }, [alarm, soundOn, playLoop, stopLoop]);

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
            className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-[#000000]/78 p-3 sm:p-4"
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
                className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-[#E6C673]/22 bg-[#0A0F1C] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
                data-testid="calendar-reminder-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 text-right" dir="rtl">
                    <p className="text-[11px] font-semibold tracking-wide text-[#E6C673]/85 mb-1">
                        منبّه موعد — حامي
                    </p>
                    <h2
                        id="calendar-reminder-title"
                        className="text-lg font-semibold text-[#F8FAFC] leading-snug break-words"
                    >
                        {event.title}
                    </h2>
                    <p id="calendar-reminder-desc" className="mt-1 text-xs text-white/50">
                        {formatCalendarReminderLabel(reminderMinutesBefore)} · الموعد {timeLabel}
                    </p>
                </div>

                <div className="space-y-2 mb-5 text-right text-sm text-[#CBD5E1]" dir="rtl">
                    <p>
                        {dateLabel} — {timeLabel}
                    </p>
                    {event.location ? <p className="break-words">{event.location}</p> : null}
                </div>

                <div className="space-y-3" dir="rtl">
                    <p className="text-[11px] font-semibold text-white/50">تأجيل المنبه — اختر المدة</p>
                    <div className="grid grid-cols-2 gap-2">
                        {SNOOZE_OPTIONS.map((minutes) => (
                            <button
                                key={minutes}
                                type="button"
                                data-testid={`calendar-reminder-snooze-${minutes}`}
                                onClick={() => onSnooze(minutes)}
                                className="min-h-[44px] rounded-xl border border-[#E6C673]/22 bg-[#E6C673]/8 text-xs font-semibold text-[#F4F4F5] touch-manipulation"
                            >
                                {formatCalendarReminderSnoozeLabel(minutes)}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        data-testid="calendar-reminder-mute"
                        onClick={() => setSoundOn(false)}
                        disabled={!soundOn}
                        className="w-full min-h-[44px] rounded-xl border border-white/12 bg-white/[0.04] text-sm font-semibold text-[#F8FAFC] touch-manipulation disabled:opacity-40"
                    >
                        {soundOn ? 'إيقاف الصوت' : 'الصوت متوقف'}
                    </button>
                    <button
                        type="button"
                        data-testid="calendar-reminder-dismiss"
                        onClick={onDismiss}
                        className="w-full min-h-[44px] rounded-xl bg-[#E6C673] text-sm font-semibold text-[#0A0F1C] touch-manipulation"
                    >
                        إيقاف المنبه
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );

    return createPortal(content, document.body);
}
