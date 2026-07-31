import React, { useEffect } from 'react';
import { HomeArrowRightIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import { RadarShell } from '@/app/components/lawyer/SmartLegalRadar/RadarShell';
import { RADAR_HEADER, RADAR_SCROLL } from '@/app/components/lawyer/SmartLegalRadar/radarTheme';
import { getCachedCalendarEvents } from '@/app/services/calendar/calendarEventsCache';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';

type ScheduleInstantShellProps = {
    onBack?: () => void;
    /** لعرض أحداث حيّة من الكاش أثناء تبنّي chunk التقويم */
    userId?: string | null;
};

/**
 * قشرة طارئة فقط إن تأخّر تبويب التقويم — هيكل ثابت بلا نبض تحميل.
 * إن وُجد كاش أحداث تُعرض بطاقات حقيقية بدل هيكل فارغ فقط.
 */
export function ScheduleInstantShell({
    onBack,
    userId,
}: ScheduleInstantShellProps): React.ReactElement {
    const uid = resolveCalendarUserId(userId ?? null);
    const previewEvents = (uid ? getCachedCalendarEvents(uid) : null)?.slice(0, 4) ?? [];

    useEffect(() => {
        if (!onBack) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            onBack();
        };
        window.addEventListener('keydown', onKey, true);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            onBack();
            return true;
        });
        return () => {
            window.removeEventListener('keydown', onKey, true);
            unregisterNativeBack();
        };
    }, [onBack]);

    return (
        <RadarShell>
            <header className={RADAR_HEADER}>
                <button
                    type="button"
                    onClick={onBack}
                    data-testid="radar-back"
                    className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-[#E8DCC8]/75 transition-colors touch-manipulation hover:bg-[#F5EDE0]/[0.06] hover:text-[#F5EDE0]"
                >
                    <HomeArrowRightIcon size={20} />
                    <span className="font-bold text-sm">رجوع</span>
                </button>
                <h1 className="text-base sm:text-lg font-bold text-[#F5EDE0]/95 flex items-center gap-2">
                    <span className="bg-gradient-to-l from-[#F5EDE0] via-[#E8DCC8] to-[#C4956A] bg-clip-text text-transparent">
                        رادار المواعيد
                    </span>
                </h1>
                <div className="w-10" aria-hidden />
            </header>

            <div className={RADAR_SCROLL} data-testid="schedule-tab-loading">
                <div className="hami-radar-glass-panel mb-4 px-3 py-3 rounded-2xl border border-[#F5EDE0]/10 bg-[#2d2219]/50">
                    <div className="flex items-center justify-between gap-3" aria-hidden>
                        <div className="h-8 w-28 rounded-lg bg-[#F5EDE0]/[0.06]" />
                        <div className="h-8 w-24 rounded-lg bg-[#F5EDE0]/[0.06]" />
                    </div>
                </div>

                {previewEvents.length > 0 ? (
                    <div className="space-y-3">
                        <p className="text-xs font-semibold text-[#E8DCC8]/55 px-0.5">المواعيد القادمة</p>
                        {previewEvents.map((event) => (
                            <article
                                key={event.id}
                                data-testid={`schedule-boot-event-${event.id}`}
                                className="rounded-2xl border border-[#F5EDE0]/10 bg-[#2d2219]/55 px-3.5 py-3"
                            >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-[10px] tabular-nums text-[#E8DCC8]/45">
                                        {event.date}
                                        {event.time ? ` · ${event.time}` : ''}
                                    </span>
                                    <span className="text-[10px] text-[#C4956A]/80">{event.type}</span>
                                </div>
                                <h3 className="text-sm font-bold text-[#F5EDE0]/90 truncate">
                                    {event.title || 'موعد'}
                                </h3>
                                {event.location || event.court ? (
                                    <p className="mt-1 text-xs text-[#E8DCC8]/50 truncate">
                                        {event.location || event.court}
                                    </p>
                                ) : null}
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3" aria-hidden>
                        <div className="h-5 w-48 rounded bg-[#F5EDE0]/[0.06]" />
                        <div className="h-24 rounded-2xl bg-[#F5EDE0]/[0.04]" />
                        <div className="h-24 rounded-2xl bg-[#F5EDE0]/[0.04]" />
                    </div>
                )}
            </div>
        </RadarShell>
    );
}
