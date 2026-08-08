import React from 'react';
import { Calendar } from '@/app/components/ui/lucideIcons';
import {
    WEEK_DAYS,
    MONTHS,
    isToday,
    isPastDay,
    dotColorsForDate,
    buildCalendarDayAriaLabel,
    buildCalendarGridAriaLabel,
} from './utils';
import {
    RADAR_CALENDAR_SHELL,
    RADAR_GLASS_PANEL,
    RADAR_ICON_GOLD,
    RADAR_TEXT,
    RADAR_TEXT_MUTED,
    RADAR_ACCENT_CHIP,
} from './radarTheme';
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
    const gridAriaLabel = buildCalendarGridAriaLabel(viewMonth, viewYear);

    return (
        <div className={`${RADAR_CALENDAR_SHELL} mb-6`} dir="rtl" data-testid="radar-calendar-grid">
            <div className="relative p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/80">
                    <div className="h-px flex-1 bg-gradient-to-l from-white/70 to-transparent" />
                    <span className={`px-2 text-sm sm:text-base font-bold ${RADAR_TEXT} tracking-wide whitespace-nowrap`}>
                        {monthLabel}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/70 to-transparent" />
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2">
                    {WEEK_DAYS.map((d) => (
                        <span
                            key={d}
                            className={`text-[9px] sm:text-[10px] font-bold ${RADAR_TEXT_MUTED} text-center py-1.5 rounded-lg bg-[#2A2A2A] border border-white/75`}
                        >
                            {d}
                        </span>
                    ))}
                </div>

                <div
                    className="grid grid-cols-7 gap-1.5 sm:gap-2"
                    role="group"
                    aria-label={gridAriaLabel}
                >
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
                                ' hami-radar-pearl-surface hami-radar-day-selected border-[#E2E8F0]/50 shadow-[0_4px_14px_rgba(0,0,0,0.32)] scale-[1.03] z-10';
                        } else if (isT) {
                            cellClass += ' hami-radar-day-today';
                        } else if (isPast) {
                            cellClass += ' hami-radar-day-muted';
                        } else if (hasEvents) {
                            cellClass += ' hami-radar-day-has-events hover:bg-[#2A2A2A]';
                        } else {
                            cellClass += ` ${RADAR_TEXT} hover:bg-[#2A2A2A]`;
                        }

                        return (
                            <button
                                type="button"
                                key={day}
                                data-testid={`radar-day-${day}`}
                                aria-label={buildCalendarDayAriaLabel(
                                    day,
                                    viewMonth,
                                    viewYear,
                                    dayEvents.length,
                                    isT,
                                )}
                                aria-pressed={isSel ? true : undefined}
                                aria-current={isT ? 'date' : undefined}
                                onClick={() => onDateClick(day)}
                                className={cellClass}
                            >
                                {hasEvents && !isSel && (
                                    <span
                                        className={`absolute top-1 left-1 min-w-[14px] h-[14px] px-0.5 rounded-full ${RADAR_ACCENT_CHIP} text-[8px] font-bold ${RADAR_TEXT} flex items-center justify-center leading-none`}
                                    >
                                        {dayEvents.length > 9 ? '9+' : dayEvents.length}
                                    </span>
                                )}
                                <span className={isSel ? 'font-bold' : ''}>{day}</span>
                                {dots.length > 0 && (
                                    <div className="flex gap-0.5 mt-0.5 absolute bottom-1.5">
                                        {dots.map((c, ci) => (
                                            <span
                                                key={ci}
                                                className={`w-1 h-1 rounded-full ${c} ${isSel ? 'opacity-90' : ''}`}
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
            <div
                className={`w-14 h-14 rounded-2xl ${RADAR_ACCENT_CHIP} flex items-center justify-center mb-4`}
            >
                <Calendar size={28} className={RADAR_ICON_GOLD} />
            </div>
            <h3 className={`text-lg font-bold ${RADAR_TEXT} mb-2`}>
                لا توجد مواعيد لهذا اليوم
            </h3>
            <p className={`text-sm ${RADAR_TEXT_MUTED} max-w-xs leading-relaxed`}>
                يمكنك إضافة موعد جديد أو اختيار تاريخ آخر من التقويم.
            </p>
        </div>
    );
});
