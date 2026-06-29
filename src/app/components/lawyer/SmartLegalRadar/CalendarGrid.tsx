import React from 'react';
import { Calendar } from 'lucide-react';
import { WEEK_DAYS, MONTHS, isToday, isPastDay, dotColorsForDate } from './utils';
import { RADAR_CALENDAR_SHELL, RADAR_GLASS_PANEL, RADAR_ICON_GOLD } from './radarTheme';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

interface CalendarGridProps {
    viewYear: number;
    viewMonth: number;
    firstDayOfMonth: number;
    daysInMonth: number;
    selectedDate: string;
    eventsByDate: Map<string, UnifiedEvent[]>;
    onDateClick: (day: number) => void;
}

export const CalendarGrid = React.memo(function CalendarGrid({
    viewYear,
    viewMonth,
    firstDayOfMonth,
    daysInMonth,
    selectedDate,
    eventsByDate,
    onDateClick,
}: CalendarGridProps) {
    const monthLabel = `${MONTHS[viewMonth]} ${viewYear}`;

    return (
        <div className={`${RADAR_CALENDAR_SHELL} mb-6`} dir="rtl" data-testid="radar-calendar-grid">
            <div
                className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-[#F5EDE0]/[0.07] via-transparent to-[#C4956A]/[0.12]"
                aria-hidden
            />
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full bg-[#C4956A]/10 blur-3xl" aria-hidden />

            <div className="relative p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#F5EDE0]/10">
                    <div className="h-px flex-1 bg-gradient-to-l from-[#C4956A]/45 to-transparent" />
                    <span className="px-2 text-sm sm:text-base font-bold text-[#F5EDE0]/92 tracking-wide whitespace-nowrap">
                        {monthLabel}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#C4956A]/45 to-transparent" />
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2">
                    {WEEK_DAYS.map((d) => (
                        <span
                            key={d}
                            className="text-[9px] sm:text-[10px] font-bold text-[#C4956A]/85 text-center py-1.5 rounded-lg bg-[#F5EDE0]/[0.04] border border-[#F5EDE0]/[0.06]"
                        >
                            {d}
                        </span>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {Array.from({ length: firstDayOfMonth }, (_, i) => (
                        <div key={`empty-${i}`} className="aspect-square min-h-[2.5rem] w-full" />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSel = dateStr === selectedDate;
                        const isT = isToday(dateStr);
                        const isPast = isPastDay(dateStr);
                        const dayEvents = eventsByDate.get(dateStr) ?? [];
                        const dots = dotColorsForDate(dayEvents);
                        const hasEvents = dayEvents.length > 0;

                        let cellClass =
                            'relative aspect-square min-h-[2.5rem] w-full rounded-2xl flex flex-col items-center justify-center text-sm font-semibold transition-all duration-200 border border-transparent';

                        if (isSel) {
                            cellClass +=
                                ' bg-gradient-to-br from-[#F5EDE0]/95 to-[#E8DCC8]/88 text-[#2d2219] border-[#C4956A]/50 shadow-[0_4px_18px_rgba(196,149,106,0.32)] scale-[1.05] z-10';
                        } else if (isT) {
                            cellClass +=
                                ' bg-[#C4956A]/14 text-[#F5EDE0] border-[#C4956A]/40 ring-1 ring-[#C4956A]/25';
                        } else if (isPast) {
                            cellClass +=
                                ' text-[#F5EDE0]/28 hover:text-[#F5EDE0]/45 hover:bg-[#F5EDE0]/[0.04]';
                        } else if (hasEvents) {
                            cellClass +=
                                ' text-[#F5EDE0]/90 bg-[#F5EDE0]/[0.05] hover:bg-[#C4956A]/12 border-[#F5EDE0]/[0.08]';
                        } else {
                            cellClass +=
                                ' text-[#F5EDE0]/72 hover:bg-[#F5EDE0]/[0.06] hover:text-[#F5EDE0]';
                        }

                        return (
                            <button
                                type="button"
                                key={day}
                                data-testid={`radar-day-${day}`}
                                onClick={() => onDateClick(day)}
                                className={cellClass}
                            >
                                {hasEvents && !isSel && (
                                    <span className="absolute top-1 left-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#C4956A]/25 border border-[#C4956A]/40 text-[8px] font-bold text-[#F5EDE0]/90 flex items-center justify-center leading-none">
                                        {dayEvents.length > 9 ? '9+' : dayEvents.length}
                                    </span>
                                )}
                                <span className={isSel ? 'font-bold' : ''}>{day}</span>
                                {dots.length > 0 && (
                                    <div className="flex gap-0.5 mt-0.5 absolute bottom-1.5">
                                        {dots.map((c, ci) => (
                                            <span
                                                key={ci}
                                                className={`w-1 h-1 rounded-full ${c} ${isSel ? 'opacity-80' : ''}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

export const EmptyState = React.memo(function EmptyState() {
    return (
        <div
            className={`${RADAR_GLASS_PANEL} flex flex-col items-center justify-center py-14 px-6 text-center`}
            data-testid="radar-empty-state"
        >
            <div className="w-14 h-14 rounded-2xl bg-[#F5EDE0]/[0.06] border border-[#F5EDE0]/12 backdrop-blur-md flex items-center justify-center mb-4 shadow-[inset_0_1px_0_rgba(245,237,224,0.08)]">
                <Calendar size={28} className={RADAR_ICON_GOLD} />
            </div>
            <h3 className="text-lg font-bold text-[#F5EDE0]/92 mb-2">لا توجد مواعيد لهذا اليوم</h3>
            <p className="text-sm text-[#E8DCC8]/55 max-w-xs leading-relaxed">
                يمكنك إضافة موعد جديد أو اختيار تاريخ آخر من التقويم.
            </p>
        </div>
    );
});
