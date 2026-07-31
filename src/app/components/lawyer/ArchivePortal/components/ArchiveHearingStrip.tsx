import React from 'react';

export type ArchiveHearingStripProps = {
    label: string;
    ymd: string;
    sessionNumber?: number | null;
};

/** شريط موعد المرافعة/المحاكمة على بطاقة الأرشيف */
export function ArchiveHearingStrip({ label, ymd, sessionNumber }: ArchiveHearingStripProps) {
    return (
        <div
            className="flex items-center justify-between gap-3 rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/10 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
            <div className="flex min-w-0 items-center gap-2">
                <span className="text-[11px] font-black tracking-wide text-[#E6C673]/95 shrink-0">
                    {label}
                </span>
                {sessionNumber != null && sessionNumber > 0 ? (
                    <span
                        className="shrink-0 rounded-md border border-[#E6C673]/40 bg-[#E6C673]/18 px-1.5 py-px text-[10px] font-black text-[#F3E4B8]"
                        title="رقم المرافعة"
                    >
                        رقم {sessionNumber}
                    </span>
                ) : null}
            </div>
            <span className="shrink-0 text-[15px] font-black tabular-nums text-[#F3E4B8]" dir="ltr">
                {ymd}
            </span>
        </div>
    );
}
