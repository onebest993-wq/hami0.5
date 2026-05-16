import React from 'react';
import { ArrowRight, Calendar, ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react';
import { MONTHS } from './utils';

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

export const RadarHeader = React.memo(function RadarHeader({
    onBack, viewYear, viewMonth, onPrevMonth, onNextMonth,
    onGoToToday, showFullMonth, onToggleFullMonth
}: RadarHeaderProps) {
    return (
        <header className="flex items-center justify-between p-4 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
            <button type="button"
                onClick={onBack}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
            >
                <ArrowRight size={20} />
                <span className="font-bold">رجوع</span>
            </button>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar size={20} className="text-indigo-400" />
                رادار المواعيد الذكي
            </h1>
            <div className="w-10" />
        </header>
    );
});

export const MonthNav = React.memo(function MonthNav({
    viewYear, viewMonth, onPrevMonth, onNextMonth,
    onGoToToday, showFullMonth, onToggleFullMonth
}: {
    viewYear: number; viewMonth: number;
    onPrevMonth: () => void; onNextMonth: () => void;
    onGoToToday: () => void; showFullMonth: boolean; onToggleFullMonth: () => void;
}) {
    return (
        <div className="flex justify-between items-center mb-4 px-1" dir="rtl">
            <div className="flex items-center gap-3">
                <button type="button" onClick={onPrevMonth} className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                    <ChevronRight size={20} />
                </button>
                <span className="text-white font-bold text-lg">{MONTHS[viewMonth]} {viewYear}</span>
                <button type="button" onClick={onNextMonth} className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft size={20} />
                </button>
            </div>
            <div className="flex items-center gap-2">
                <button type="button"
                    onClick={onGoToToday}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700/50 text-xs font-bold transition-all"
                >
                    <ArrowLeft size={14} />
                    اليوم
                </button>
                <button type="button"
                    onClick={onToggleFullMonth}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm font-bold ${
                        showFullMonth
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700/50'
                    }`}
                >
                    <Calendar size={16} />
                    {showFullMonth ? 'إغلاق التقويم' : 'التقويم الكامل'}
                </button>
            </div>
        </div>
    );
});
