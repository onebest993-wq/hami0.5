import React from 'react';
import { ArrowRight, Calendar, ChevronRight, ChevronLeft, ArrowLeft, Loader2 } from 'lucide-react';
import { prefetchRadarCalendarGrid } from '@/app/runtime/radarWidgetLoader';
import { MONTHS, getDayName } from './utils';
import {
    RADAR_BTN_GHOST,
    RADAR_BTN_GHOST_ACTIVE,
    RADAR_HEADER,
    RADAR_MONTH_NAV,
    RADAR_ICON_GOLD,
    RADAR_ICON_ACCENT,
} from './radarTheme';

interface RadarHeaderProps {
    onBack: () => void;
    syncing?: boolean;
}

export const RadarHeader = React.memo(function RadarHeader({ onBack, syncing = false }: RadarHeaderProps) {
    return (
        <header className={RADAR_HEADER}>
            <button
                type="button"
                onClick={onBack}
                data-testid="radar-back"
                className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-[#E8DCC8]/75 transition-colors touch-manipulation hover:bg-[#F5EDE0]/[0.06] hover:text-[#F5EDE0]"
            >
                <ArrowRight size={20} />
                <span className="font-bold text-sm">رجوع</span>
            </button>
            <h1 className="text-base sm:text-lg font-bold text-[#F5EDE0]/95 flex items-center gap-2">
                <span className="bg-gradient-to-l from-[#FAF7F2] via-[#F5EDE0] to-[#E8DCC8] bg-clip-text text-transparent">
                    رادار المواعيد
                </span>
            </h1>
            <div
                className="w-10 flex items-center justify-end"
                aria-live="polite"
                aria-busy={syncing}
            >
                {syncing ? (
                    <Loader2
                        size={16}
                        className={`${RADAR_ICON_GOLD} animate-spin opacity-70`}
                        aria-label="جاري تحديث المواعيد"
                    />
                ) : null}
            </div>
        </header>
    );
});

export const MonthNav = React.memo(function MonthNav({
    viewYear,
    viewMonth,
    onPrevMonth,
    onNextMonth,
    onGoToToday,
    showFullMonth,
    onToggleFullMonth,
    selectedDate,
}: {
    viewYear: number;
    viewMonth: number;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onGoToToday: () => void;
    showFullMonth: boolean;
    onToggleFullMonth: () => void;
    selectedDate?: string;
}) {
    return (
        <div className={RADAR_MONTH_NAV} dir="rtl" data-testid="radar-month-nav">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                <button
                    type="button"
                    onClick={onPrevMonth}
                    aria-label="الشهر السابق"
                    className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-[#E8DCC8]/65 transition-colors touch-manipulation hover:bg-[#F5EDE0]/[0.08] hover:text-[#F5EDE0]"
                >
                    <ChevronRight size={18} />
                </button>
                <span
                    className="text-[#F5EDE0]/95 font-bold text-[15px] sm:text-base shrink-0 tabular-nums"
                    aria-live="polite"
                >
                    {MONTHS[viewMonth]} {viewYear}
                </span>
                <button
                    type="button"
                    onClick={onNextMonth}
                    aria-label="الشهر التالي"
                    className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-[#E8DCC8]/65 transition-colors touch-manipulation hover:bg-[#F5EDE0]/[0.08] hover:text-[#F5EDE0]"
                >
                    <ChevronLeft size={18} />
                </button>

                <span
                    className="h-5 w-px shrink-0 bg-[#F5EDE0]/18 mx-0.5"
                    aria-hidden
                />

                <p
                    className="min-w-0 flex-1 text-[11px] sm:text-[12px] font-bold text-[#F5EDE0]/80 truncate"
                    data-testid="radar-selected-day-label"
                    aria-live="polite"
                >
                    {selectedDate ? (
                        <span className="inline-flex items-center gap-1 max-w-full">
                            <Calendar size={12} className="text-[#F5EDE0]/70 shrink-0" aria-hidden />
                            <span className="truncate">
                                {getDayName(selectedDate)} — {selectedDate}
                            </span>
                        </span>
                    ) : (
                        'اختر تاريخاً'
                    )}
                </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
                <button type="button" onClick={onGoToToday} className={RADAR_BTN_GHOST} data-testid="radar-today">
                    <ArrowLeft size={13} className={RADAR_ICON_ACCENT} />
                    اليوم
                </button>
                <button
                    type="button"
                    onClick={onToggleFullMonth}
                    onPointerEnter={prefetchRadarCalendarGrid}
                    onPointerDown={prefetchRadarCalendarGrid}
                    data-testid="radar-toggle-full-month"
                    className={showFullMonth ? RADAR_BTN_GHOST_ACTIVE : RADAR_BTN_GHOST}
                >
                    <Calendar size={14} className={showFullMonth ? RADAR_ICON_ACCENT : RADAR_ICON_GOLD} />
                    {showFullMonth ? 'إغلاق' : 'التقويم'}
                </button>
            </div>
        </div>
    );
});
