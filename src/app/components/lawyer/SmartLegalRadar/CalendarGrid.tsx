import React from 'react';
import { Calendar } from 'lucide-react';
import { WEEK_DAYS, isToday, isPastDay, dotColorsForDate } from './utils';
import { RADAR_GLASS_PANEL, RADAR_ICON_GOLD } from './radarTheme';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

interface CalendarGridProps {
    viewYear: number;
    viewMonth: number;
    firstDayOfMonth: number;
    daysInMonth: number;
    selectedDate: string;
    allEventsForMonth: UnifiedEvent[];
    onDateClick: (day: number) => void;
}

export const CalendarGrid = React.memo(function CalendarGrid({
    viewYear,
    viewMonth,
    firstDayOfMonth,
    daysInMonth,
    selectedDate,
    allEventsForMonth,
    onDateClick,
}: CalendarGridProps) {
    return (
        <div className={`${RADAR_GLASS_PANEL} p-4 mb-6 overflow-hidden`} dir="rtl">
            <div className="grid grid-cols-7 mb-2 text-center border-b border-[#64748b]/20 pb-2">
                {WEEK_DAYS.map((d) => (
                    <span key={d} className="text-slate-500 text-[10px] font-bold">
                        {d}
                    </span>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {Array.from({ length: firstDayOfMonth }, (_, i) => (
                    <div key={`empty-${i}`} className="h-10 w-full" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isSel = dateStr === selectedDate;
                    const isT = isToday(dateStr);
                    const isPast = isPastDay(dateStr);
                    const dayEvents = allEventsForMonth.filter((e) => e.date === dateStr);
                    const dots = dotColorsForDate(dayEvents);
                    return (
                        <button
                            type="button"
                            key={day}
                            onClick={() => onDateClick(day)}
                            className={`relative h-10 w-full rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all
                                ${
                                    isSel
                                        ? 'bg-gradient-to-b from-[#1e3a5f] to-[#0f2744] text-[#E6C673] border border-[#C9A227]/45 shadow-[0_0_16px_rgba(201,162,39,0.2)] scale-105 z-10'
                                        : isT
                                          ? 'bg-[#1e3a5f]/40 text-[#93c5fd] border border-[#5b8fd4]/35'
                                          : isPast
                                            ? 'text-slate-600/60 opacity-50 hover:opacity-80 hover:bg-[#64748b]/10'
                                            : 'text-slate-300 hover:bg-[#64748b]/15 hover:text-white border border-transparent'
                                }
                            `}
                        >
                            <span>{day}</span>
                            {dots.length > 0 && (
                                <div className="flex gap-0.5 mt-0.5">
                                    {dots.map((c, ci) => (
                                        <span key={ci} className={`w-1.5 h-1.5 rounded-full ${c}`} />
                                    ))}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

export const EmptyState = React.memo(function EmptyState() {
    return (
        <div
            className={`${RADAR_GLASS_PANEL} flex flex-col items-center justify-center py-14 px-6 text-center`}
        >
            <div className="w-14 h-14 rounded-2xl bg-[#64748b]/10 border border-[#64748b]/25 flex items-center justify-center mb-4">
                <Calendar size={28} className={RADAR_ICON_GOLD} />
            </div>
            <h3 className="text-lg font-bold text-white/90 mb-2">لا توجد مواعيد لهذا اليوم</h3>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                يمكنك إضافة موعد جديد أو اختيار تاريخ آخر من التقويم.
            </p>
        </div>
    );
});
