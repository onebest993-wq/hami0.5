import React, { memo, useMemo } from 'react';
import { Clock } from '@/app/components/ui/icons/Clock';
import {
    CASE_SHARE_SESSION_MINUTES,
    clampCaseShareSessionMinutes,
    formatCaseShareSession,
    type CaseShareSessionMinutes,
} from '@/app/services/caseShare/caseShareSession';

type Props = {
    value: CaseShareSessionMinutes;
    onChange: (minutes: CaseShareSessionMinutes) => void;
};

function sessionAngle(minutes: number): number {
    const min = CASE_SHARE_SESSION_MINUTES[0];
    const max = CASE_SHARE_SESSION_MINUTES[CASE_SHARE_SESSION_MINUTES.length - 1];
    const ratio = (minutes - min) / (max - min);
    return ratio * 360 - 90;
}

export const CaseShareSessionClockSlider = memo(function CaseShareSessionClockSlider({
    value,
    onChange,
}: Props) {
    const min = CASE_SHARE_SESSION_MINUTES[0];
    const max = CASE_SHARE_SESSION_MINUTES[CASE_SHARE_SESSION_MINUTES.length - 1];
    const progress = ((value - min) / (max - min)) * 100;
    const handAngle = sessionAngle(value);

    const ticks = useMemo(
        () =>
            Array.from({ length: 12 }, (_, i) => {
                const angle = (i / 12) * 360 - 90;
                const rad = (angle * Math.PI) / 180;
                const outer = 46;
                const inner = i % 3 === 0 ? 38 : 41;
                return {
                    key: i,
                    x1: 50 + inner * Math.cos(rad),
                    y1: 50 + inner * Math.sin(rad),
                    x2: 50 + outer * Math.cos(rad),
                    y2: 50 + outer * Math.sin(rad),
                    major: i % 3 === 0,
                };
            }),
        [],
    );

    return (
        <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-white text-sm font-bold mb-1 flex items-center gap-1.5">
                <Clock size={14} className="text-[#E6C673]" />
                مدة الجلسة المتوقعة
            </p>
            <p className="text-white/40 text-[10px] mb-3">من ربع ساعة إلى 3 ساعات — حرّك الشريط أو الساعة</p>

            <div className="flex flex-col items-center gap-4">
                <div className="relative w-[7.5rem] h-[7.5rem]">
                    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
                        <circle
                            cx="50"
                            cy="50"
                            r="44"
                            fill="none"
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth="3"
                        />
                        <circle
                            cx="50"
                            cy="50"
                            r="44"
                            fill="none"
                            stroke="#E6C673"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${(progress / 100) * 276} 276`}
                            transform="rotate(-90 50 50)"
                            opacity="0.85"
                        />
                        {ticks.map((t) => (
                            <line
                                key={t.key}
                                x1={t.x1}
                                y1={t.y1}
                                x2={t.x2}
                                y2={t.y2}
                                stroke={t.major ? 'rgba(230,198,115,0.55)' : 'rgba(255,255,255,0.15)'}
                                strokeWidth={t.major ? 1.5 : 1}
                            />
                        ))}
                        <line
                            x1="50"
                            y1="50"
                            x2={50 + 28 * Math.cos((handAngle * Math.PI) / 180)}
                            y2={50 + 28 * Math.sin((handAngle * Math.PI) / 180)}
                            stroke="#E6C673"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                        <circle cx="50" cy="50" r="3" fill="#E6C673" />
                    </svg>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-3">
                        <span className="text-center text-[11px] font-bold leading-tight text-[#E6C673]">
                            {formatCaseShareSession(value)}
                        </span>
                    </div>
                </div>

                <input
                    type="range"
                    min={min}
                    max={max}
                    step={15}
                    value={value}
                    onChange={(e) => onChange(clampCaseShareSessionMinutes(Number(e.target.value)))}
                    className="w-full h-2 cursor-pointer appearance-none rounded-full bg-white/10 accent-[#E6C673] touch-manipulation"
                    aria-label="مدة الجلسة"
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={value}
                    aria-valuetext={formatCaseShareSession(value)}
                    style={{
                        background: `linear-gradient(to left, rgba(230,198,115,0.45) ${progress}%, rgba(255,255,255,0.08) ${progress}%)`,
                    }}
                />
            </div>
        </div>
    );
});
