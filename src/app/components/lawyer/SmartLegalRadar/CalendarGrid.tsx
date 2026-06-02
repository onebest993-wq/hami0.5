import React from 'react';
import { motion } from 'motion/react';
import { Calendar } from 'lucide-react';
import { WEEK_DAYS, isToday, isPastDay, dotColorsForDate } from './utils';
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
    viewYear, viewMonth, firstDayOfMonth, daysInMonth,
    selectedDate, allEventsForMonth, onDateClick
}: CalendarGridProps) {
    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-6 overflow-hidden shadow-xl" dir="rtl">
            <div className="grid grid-cols-7 mb-2 text-center border-b border-slate-800 pb-2">
                {WEEK_DAYS.map((d) => (
                    <span key={d} className="text-slate-500 text-xs font-bold">{d}</span>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
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
                        <button type="button"
                            key={day}
                            onClick={() => onDateClick(day)}
                            className={`relative h-10 w-full rounded-lg flex flex-col items-center justify-center text-sm font-bold transition-all
                                ${isSel ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 scale-105 z-10' : isT ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/40' : isPast ? 'text-slate-500/50 opacity-45 hover:opacity-70 hover:bg-slate-800/50' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
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
        <div className="flex flex-col items-center justify-center py-16 text-center opacity-50">
            <Calendar size={48} className="mb-4 text-slate-500" />
            <h3 className="text-xl font-bold text-white mb-2">لا توجد مواعيد لهذا اليوم</h3>
            <p className="text-sm text-slate-400">يمكنك إضافة موعد جديد أو اختيار تاريخ آخر.</p>
        </div>
    );
});
