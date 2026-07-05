import React from 'react';
import { ArrowRight, Calendar, ChevronRight, ChevronLeft, ArrowLeft, Loader2 } from 'lucide-react';
import { prefetchRadarCalendarGrid } from '@/app/runtime/radarWidgetLoader';
import { MONTHS } from './utils';
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
    viewYear: number;
    viewMonth: number;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onGoToToday: () => void;
    showFullMonth: boolean;
    onToggleFullMonth: () => void;
    syncing?: boolean;
}

export const RadarHeader = React.memo(function RadarHeader({ onBack, syncing = false }: RadarHeaderProps) {
    return (
        <header className={RADAR_HEADER}>
            <button
                type="button"
                onClick={onBack}
                data-testid="radar-back"
                className="flex items-center gap-2 text-[#E8DCC8]/75 hover:text-[#F5EDE0] transition-colors px-2 py-1 rounded-lg hover:bg-[#F5EDE0]/[0.06]"
            >
                <ArrowRight size={20} />
                <span className="font-bold text-sm">رجوع</span>
            </button>
            <h1 className="text-base sm:text-lg font-bold text-[#F5EDE0]/95 flex items-center gap-2">
                <Calendar size={18} className={RADAR_ICON_GOLD} />
                <span className="bg-gradient-to-l from-[#F5EDE0] via-[#E8DCC8] to-[#C4956A] bg-clip-text text-transparent">
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
}: {
    viewYear: number;
    viewMonth: number;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onGoToToday: () => void;
    showFullMonth: boolean;
    onToggleFullMonth: () => void;
}) {
    return (
        <div className={RADAR_MONTH_NAV} dir="rtl" data-testid="radar-month-nav">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onPrevMonth}
                    className="p-1.5 rounded-lg hover:bg-[#F5EDE0]/[0.06] text-[#E8DCC8]/60 hover:text-[#C4956A] transition-colors"
                >
                    <ChevronRight size={20} />
                </button>
                <span className="text-[#F5EDE0]/95 font-bold text-lg min-w-[140px] text-center">
                    {MONTHS[viewMonth]} {viewYear}
                </span>
                <button
                    type="button"
                    onClick={onNextMonth}
                    className="p-1.5 rounded-lg hover:bg-[#F5EDE0]/[0.06] text-[#E8DCC8]/60 hover:text-[#C4956A] transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
            </div>
            <div className="flex items-center gap-2">
                <button type="button" onClick={onGoToToday} className={RADAR_BTN_GHOST} data-testid="radar-today">
                    <ArrowLeft size={14} className={RADAR_ICON_ACCENT} />
                    اليوم
                </button>
                <button
                    type="button"
                    onClick={onToggleFullMonth}
                    onPointerEnter={prefetchRadarCalendarGrid}
                    data-testid="radar-toggle-full-month"
                    className={showFullMonth ? RADAR_BTN_GHOST_ACTIVE : RADAR_BTN_GHOST}
                >
                    <Calendar size={15} className={showFullMonth ? RADAR_ICON_ACCENT : RADAR_ICON_GOLD} />
                    {showFullMonth ? 'إغلاق التقويم' : 'التقويم الكامل'}
                </button>
            </div>
        </div>
    );
});
