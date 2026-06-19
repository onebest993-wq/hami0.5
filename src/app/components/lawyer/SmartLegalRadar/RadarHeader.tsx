import React from 'react';
import { ArrowRight, Calendar, ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react';
import { MONTHS } from './utils';
import {
    RADAR_BTN_GHOST,
    RADAR_BTN_GHOST_ACTIVE,
    RADAR_HEADER,
    RADAR_ICON_GOLD,
    RADAR_ICON_NAVY,
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
}

export const RadarHeader = React.memo(function RadarHeader({ onBack }: RadarHeaderProps) {
    return (
        <header className={RADAR_HEADER}>
            <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 text-slate-300 hover:text-[#E6C673] transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.04]"
            >
                <ArrowRight size={20} />
                <span className="font-bold text-sm">رجوع</span>
            </button>
            <h1 className="text-base sm:text-lg font-bold text-white/95 flex items-center gap-2">
                <Calendar size={18} className={RADAR_ICON_GOLD} />
                <span className="bg-gradient-to-l from-[#E6C673] to-white/90 bg-clip-text text-transparent">
                    رادار المواعيد
                </span>
            </h1>
            <div className="w-10" />
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
        <div
            className="flex flex-wrap justify-between items-center gap-3 mb-4 px-1 py-3 rounded-2xl border border-[#64748b]/15 bg-[#0c1a2e]/40 backdrop-blur-md"
            dir="rtl"
        >
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onPrevMonth}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-[#E6C673] transition-colors"
                >
                    <ChevronRight size={20} />
                </button>
                <span className="text-white/95 font-bold text-lg min-w-[140px] text-center">
                    {MONTHS[viewMonth]} {viewYear}
                </span>
                <button
                    type="button"
                    onClick={onNextMonth}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-[#E6C673] transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
            </div>
            <div className="flex items-center gap-2">
                <button type="button" onClick={onGoToToday} className={RADAR_BTN_GHOST}>
                    <ArrowLeft size={14} className={RADAR_ICON_NAVY} />
                    اليوم
                </button>
                <button
                    type="button"
                    onClick={onToggleFullMonth}
                    className={showFullMonth ? RADAR_BTN_GHOST_ACTIVE : RADAR_BTN_GHOST}
                >
                    <Calendar size={15} className={showFullMonth ? RADAR_ICON_NAVY : RADAR_ICON_GOLD} />
                    {showFullMonth ? 'إغلاق التقويم' : 'التقويم الكامل'}
                </button>
            </div>
        </div>
    );
});
