import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import type { VisitationScheduleConfig, VisitationSession } from '@/app/types/visitationSchedule';
import {
    ARABIC_WEEKDAY_LABELS,
    IRAQI_ARABIC_MONTHS,
    VISITATION_CALENDAR_WINDOW_MONTHS,
    formatYmdLocal,
    parseYmdToLocalDate,
    resolveVisitationCalendarCellTone,
    sessionCalendarLabel,
} from '@/app/utils/visitationScheduleEngine';

const CALENDAR_CELL_CLASS: Record<
    ReturnType<typeof resolveVisitationCalendarCellTone>,
    string
> = {
    empty: 'border-white/5 bg-white/[0.02] text-slate-600',
    scheduled: 'border-[#E6C673]/35 bg-[#E6C673]/10 text-[#E6C673]',
    overdue: 'border-slate-500/35 bg-slate-500/10 text-slate-400',
    documented_success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
    documented_absence: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
};

export interface VisitationCalendarModalProps {
    open: boolean;
    onClose: () => void;
    config: VisitationScheduleConfig;
    sessions: VisitationSession[];
    todayYmd: string;
}

function monthMatrix(year: number, monthIndex: number): (Date | null)[][] {
    const first = new Date(year, monthIndex, 1);
    const last = new Date(year, monthIndex + 1, 0);
    const weeks: (Date | null)[][] = [];
    let row: (Date | null)[] = Array(first.getDay()).fill(null);
    for (let day = 1; day <= last.getDate(); day++) {
        row.push(new Date(year, monthIndex, day));
        if (row.length === 7) {
            weeks.push(row);
            row = [];
        }
    }
    if (row.length > 0) {
        while (row.length < 7) row.push(null);
        weeks.push(row);
    }
    return weeks;
}

export const VisitationCalendarModal: React.FC<VisitationCalendarModalProps> = ({
    open,
    onClose,
    config,
    sessions,
    todayYmd,
}) => {
    const sessionByDate = useMemo(() => {
        const m = new Map<string, VisitationSession>();
        for (const s of sessions) m.set(s.date, s);
        return m;
    }, [sessions]);

    const months = useMemo(() => {
        const today = parseYmdToLocalDate(todayYmd);
        if (!today) return [];
        return Array.from({ length: VISITATION_CALENDAR_WINDOW_MONTHS }, (_, offset) => {
            const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
    }, [todayYmd]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[240] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-[#E6C673]/25 bg-[#0B1120] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0B1120]/95 px-4 py-3 backdrop-blur-md">
                    <h3 className="text-[#E6C673] font-bold text-base">تقويم المواعيد</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:bg-white/10"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    <p className="text-[11px] text-slate-500 text-right">
                        نافذة {VISITATION_CALENDAR_WINDOW_MONTHS} أشهر — الألوان الخضراء/الحمراء للمواعيد الموثّقة فعلياً فقط
                    </p>

                    {months.map(({ year, month }) => (
                        <div key={`${year}-${month}`} className="space-y-2">
                            <p className="text-sm font-bold text-slate-200 text-right">
                                {IRAQI_ARABIC_MONTHS[month]} {year}
                            </p>
                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500 font-bold">
                                {ARABIC_WEEKDAY_LABELS.map((d) => (
                                    <span key={d}>{d.slice(0, 1)}</span>
                                ))}
                            </div>
                            <div className="space-y-1">
                                {monthMatrix(year, month).map((week, wi) => (
                                    <div key={wi} className="grid grid-cols-7 gap-1">
                                        {week.map((cell, ci) => {
                                            if (!cell) {
                                                return <div key={ci} className="aspect-square" />;
                                            }
                                            const ymd = formatYmdLocal(cell);
                                            const session = sessionByDate.get(ymd);
                                            const isToday = ymd === todayYmd;
                                            const tone = resolveVisitationCalendarCellTone(session, todayYmd);
                                            return (
                                                <div
                                                    key={ci}
                                                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] border ${CALENDAR_CELL_CLASS[tone]} ${isToday ? 'ring-1 ring-amber-400/60' : ''}`}
                                                    title={
                                                        session
                                                            ? `${ymd} — ${sessionCalendarLabel(session, config.decisionMode, todayYmd)}`
                                                            : ymd
                                                    }
                                                >
                                                    <span className="font-bold">{cell.getDate()}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="flex flex-wrap gap-3 justify-end text-[10px] text-slate-500 pt-2 border-t border-white/10">
                        <span>ذهبي = مجدول</span>
                        <span className="text-slate-400">رمادي = مستحق ولم يُوثَّق</span>
                        <span className="text-emerald-400">أخضر = موثّق (تنفيذ)</span>
                        <span className="text-rose-400">أحمر = موثّق (نكول)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
