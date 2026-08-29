import React, { useMemo } from 'react';
import { Clock } from '@/app/components/ui/icons/Clock';
import { MapPin } from '@/app/components/ui/icons/MapPin';
import type { VisitationScheduleConfig, VisitationSession } from '@/app/types/visitationSchedule';
import {
    formatDateCompactAr,
    formatDateLongAr,
    summarizeVisitationAppointment,
} from '@/app/utils/visitationScheduleEngine';

export type AppointmentBlockProps = {
    title: string;
    session: VisitationSession;
    config: VisitationScheduleConfig;
    todayYmd: string;
    tone: 'current' | 'next';
    countdown?: string;
    statusLabel?: string;
    children?: React.ReactNode;
};

export function AppointmentBlock({
    title,
    session,
    config,
    todayYmd,
    tone,
    countdown,
    statusLabel,
    children,
}: AppointmentBlockProps) {
    const summary = useMemo(
        () => summarizeVisitationAppointment(config, session.date),
        [config, session.date],
    );
    const pickupTitle =
        config.decisionMode === 'viewing_pickup_sleepover' ? 'موعد الاستلام' : title;
    const isToday =
        tone === 'current' && session.date === todayYmd && session.status === 'scheduled';

    return (
        <div
            className={`rounded-xl border overflow-hidden ${
                tone === 'current'
                    ? 'border-amber-500/30 bg-amber-500/[0.06]'
                    : 'border-white/10 bg-black/15'
            }`}
        >
            <div className="flex items-start justify-between gap-2 px-3 py-2 border-b border-white/[0.05]">
                <div className="min-w-0 flex-1 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <span className="text-[10px] font-bold text-[#E6C673]/85">{pickupTitle}</span>
                        {isToday ? (
                            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
                                اليوم
                            </span>
                        ) : null}
                        {statusLabel ? (
                            <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[9px] text-slate-400">
                                {statusLabel}
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-0.5 text-[13px] font-black leading-snug text-white">
                        {formatDateCompactAr(session.date)}
                    </p>
                    <p className="text-[9px] text-slate-500">{formatDateLongAr(session.date)}</p>
                </div>
                {countdown ? (
                    <span className="shrink-0 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[9px] font-bold text-amber-100">
                        {countdown}
                    </span>
                ) : null}
            </div>

            <div className="space-y-2 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[10px] text-slate-400 flex-row-reverse justify-end">
                    <MapPin size={11} className="shrink-0 text-[#E6C673]/80" />
                    <span className="truncate">{summary.location}</span>
                </p>

                {summary.mode === 'viewing_pickup_sleepover' ? (
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 rounded-lg border border-white/[0.06] bg-black/20 px-2 py-2">
                        <div className="text-right">
                            <p className="text-[8px] font-bold text-[#E6C673]/75">استلام</p>
                            <p className="text-[11px] font-bold text-slate-100">{summary.pickupTime}</p>
                        </div>
                        <div className="flex flex-col items-center px-1">
                            <span className="text-[8px] text-sky-300/90">{summary.nightsLabel}</span>
                            <span className="my-0.5 h-px w-6 bg-gradient-to-l from-sky-400/50 to-[#E6C673]/50" />
                        </div>
                        <div className="text-left">
                            <p className="text-[8px] font-bold text-sky-300/90">إرجاع</p>
                            <p className="text-[10px] font-bold text-slate-100 leading-tight">
                                {summary.returnDateYmd
                                    ? formatDateCompactAr(summary.returnDateYmd)
                                    : '—'}
                            </p>
                            <p className="text-[10px] text-slate-400">{summary.returnTime}</p>
                        </div>
                    </div>
                ) : (
                    <p className="flex items-center gap-1.5 text-[10px] text-slate-300 flex-row-reverse justify-end">
                        <Clock size={11} className="shrink-0 text-[#E6C673]/80" />
                        <span>
                            {summary.pickupTime}
                            {summary.endTime ? ` — ${summary.endTime}` : ''}
                        </span>
                    </p>
                )}
            </div>

            {children ? <div className="border-t border-white/[0.05] px-3 py-2">{children}</div> : null}
        </div>
    );
}
