import React, { useMemo } from 'react';
import type { VisitationScheduleConfig, VisitationSession } from '@/app/types/visitationSchedule';
import {
    ARABIC_WEEKDAY_SHORT_LABELS,
    IRAQI_ARABIC_MONTHS,
    VISITATION_CALENDAR_WINDOW_MONTHS,
    buildVisitationCalendarDayMarkers,
    formatYmdLocal,
    parseYmdToLocalDate,
    resolveVisitationCalendarCellToneForDate,
    sessionCalendarLabel,
    type VisitationCalendarCellTone,
    type VisitationCalendarDayMarker,
} from '@/app/utils/visitationScheduleEngine';

const CALENDAR_CELL_CLASS: Record<VisitationCalendarCellTone, string> = {
    empty: 'border-white/5 bg-white/[0.02] text-slate-600',
    scheduled: 'border-[#E6C673]/35 bg-[#E6C673]/10 text-[#E6C673]',
    overdue: 'border-slate-500/35 bg-slate-500/10 text-slate-400',
    documented_success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
    documented_absence: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
    return_scheduled: 'border-sky-500/40 bg-sky-500/12 text-sky-100',
    return_overdue: 'border-sky-600/30 bg-sky-900/25 text-sky-300/80',
    return_documented_success: 'border-teal-500/40 bg-teal-500/15 text-teal-100',
    return_documented_absence: 'border-orange-500/35 bg-orange-500/12 text-orange-100',
};

export interface VisitationCalendarPanelProps {
    config: VisitationScheduleConfig;
    sessions: VisitationSession[];
    todayYmd: string;
    compactLegend?: boolean;
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

function cellRoleLabel(markers: VisitationCalendarDayMarker[] | undefined): string | null {
    if (!markers?.length) return null;
    const hasPickup = markers.some((m) => m.role === 'pickup');
    const hasReturn = markers.some((m) => m.role === 'return');
    if (hasPickup && hasReturn) return 'استلام وإرجاع';
    if (hasReturn) return 'إرجاع بعد المبيت';
    return 'استلام';
}

export const VisitationCalendarPanel: React.FC<VisitationCalendarPanelProps> = ({
    config,
    sessions,
    todayYmd,
    compactLegend = false,
}) => {
    const dayMarkers = useMemo(
        () => buildVisitationCalendarDayMarkers(config, sessions),
        [config, sessions],
    );

    const months = useMemo(() => {
        const today = parseYmdToLocalDate(todayYmd);
        if (!today) return [];
        return Array.from({ length: VISITATION_CALENDAR_WINDOW_MONTHS }, (_, offset) => {
            const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
    }, [todayYmd]);

    return (
        <div className="space-y-4" dir="rtl">
            <p className="text-[10px] text-slate-500 text-right leading-relaxed">
                نافذة {VISITATION_CALENDAR_WINDOW_MONTHS} أشهر — الذهبي للاستلام، السماوي لإرجاع المبيت
            </p>

            {months.map(({ year, month }) => (
                <div key={`${year}-${month}`} className="space-y-2">
                    <p className="text-sm font-bold text-slate-200 text-right">
                        {IRAQI_ARABIC_MONTHS[month]}{' '}
                        <span className="text-slate-500 font-mono text-xs">{year}</span>
                    </p>
                    <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-slate-400 font-bold">
                        {ARABIC_WEEKDAY_SHORT_LABELS.map((d) => (
                            <span key={d} className="py-0.5">
                                {d}
                            </span>
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
                                    const markers = dayMarkers.get(ymd);
                                    const isToday = ymd === todayYmd;
                                    const tone = resolveVisitationCalendarCellToneForDate(
                                        markers,
                                        ymd,
                                        todayYmd,
                                    );
                                    const primary = markers?.[0];
                                    const roleHint = cellRoleLabel(markers);
                                    return (
                                        <div
                                            key={ci}
                                            className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] border ${CALENDAR_CELL_CLASS[tone]} ${isToday ? 'ring-1 ring-amber-400/70' : ''}`}
                                            title={
                                                primary
                                                    ? `${ymd} — ${roleHint} — ${sessionCalendarLabel(primary.session, config.decisionMode, todayYmd)}`
                                                    : ymd
                                            }
                                        >
                                            <span className="font-bold leading-none">{cell.getDate()}</span>
                                            {markers?.some((m) => m.role === 'return') ? (
                                                <span
                                                    className="h-1 w-1 rounded-full bg-sky-300/90"
                                                    aria-hidden
                                                />
                                            ) : markers?.length ? (
                                                <span
                                                    className="h-1 w-1 rounded-full bg-[#E6C673]/80"
                                                    aria-hidden
                                                />
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <div
                className={`flex flex-wrap gap-x-3 gap-y-1.5 justify-end text-[9px] text-slate-500 pt-2 border-t border-white/10 ${compactLegend ? 'text-[8px]' : ''}`}
            >
                <span className="text-[#E6C673]">● استلام مجدول</span>
                <span className="text-sky-300">● إرجاع بعد المبيت</span>
                <span className="text-slate-400">رمادي = مستحق</span>
                <span className="text-emerald-400">أخضر = موثّق</span>
                <span className="text-rose-400">أحمر = نكول</span>
            </div>
        </div>
    );
};
