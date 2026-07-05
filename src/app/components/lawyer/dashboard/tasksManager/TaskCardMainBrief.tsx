import React from 'react';
import { MapPinned } from 'lucide-react';

export type TaskCardMainBriefProps = {
    details: string;
    location: string | null;
};

/** ملخص المهمة — مضغوط بدون حاوية ضخمة */
export function TaskCardMainBrief({ details, location }: TaskCardMainBriefProps) {
    const detailsText = details.trim();
    const locationText = String(location ?? '').trim();

    return (
        <div
            className="rounded-lg border border-[#A67C52]/14 bg-[#0c0c0e]/28 px-3 py-2.5 text-right"
            data-testid="tasks-task-main-brief"
        >
            <p className="text-sm font-bold text-[#E8F5F0] leading-relaxed break-words whitespace-pre-wrap">
                {detailsText || '—'}
            </p>
            {locationText ? (
                <p className="mt-1.5 text-[11px] font-semibold text-[#6BC4A8]/88 flex flex-row-reverse items-center gap-1 justify-end">
                    <MapPinned className="size-3 shrink-0 opacity-75" aria-hidden />
                    {locationText}
                </p>
            ) : null}
        </div>
    );
}
