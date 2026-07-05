import React from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import { RadarShell } from '@/app/components/lawyer/SmartLegalRadar/RadarShell';
import { RADAR_HEADER, RADAR_ICON_GOLD, RADAR_SCROLL } from '@/app/components/lawyer/SmartLegalRadar/radarTheme';

type ScheduleInstantShellProps = {
    onBack?: () => void;
};

/** واجهة فورية أثناء تحميل chunk التقويم — تطابق رادار المواعيد */
export function ScheduleInstantShell({ onBack }: ScheduleInstantShellProps): React.ReactElement {
    return (
        <RadarShell>
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
                <div className="w-10" aria-hidden />
            </header>

            <div className={RADAR_SCROLL} aria-busy="true" data-testid="schedule-tab-loading">
                <div className="hami-radar-glass-panel mb-4 px-3 py-3 rounded-2xl border border-[#F5EDE0]/10 bg-[#2d2219]/50">
                    <div className="flex items-center justify-between gap-3">
                        <div className="h-8 w-28 rounded-lg bg-[#F5EDE0]/[0.06] animate-pulse" />
                        <div className="h-8 w-24 rounded-lg bg-[#F5EDE0]/[0.06] animate-pulse" />
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="h-5 w-48 rounded bg-[#F5EDE0]/[0.06] animate-pulse" />
                    <div className="h-24 rounded-2xl bg-[#F5EDE0]/[0.04] animate-pulse" />
                    <div className="h-24 rounded-2xl bg-[#F5EDE0]/[0.04] animate-pulse" />
                </div>
            </div>
        </RadarShell>
    );
}
