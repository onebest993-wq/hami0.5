import React from 'react';
import { MapPinned } from '@/app/components/ui/icons/MapPinned';
import { TASKS_INNER_GLASS } from './tasksBoucleTheme';

export type TaskCardMainBriefProps = {
    details: string;
    location: string | null;
    detailsClassName?: string;
};

/** ملخص المهمة — مضغوط بدون حاوية ضخمة */
export function TaskCardMainBrief({ details, location, detailsClassName }: TaskCardMainBriefProps) {
    const detailsText = details.trim();
    const locationText = String(location ?? '').trim();

    return (
        <div
            className={`rounded-lg ${TASKS_INNER_GLASS} px-3 py-2.5 text-right`}
            data-testid="tasks-task-main-brief"
        >
            <p
                className={`text-sm font-bold text-[#F4F4F5] leading-relaxed break-words whitespace-pre-wrap ${detailsClassName ?? ''}`}
            >
                {detailsText || '—'}
            </p>
            {locationText ? (
                <p className="mt-1.5 text-[11px] font-semibold text-[#34D399]/88 flex flex-row-reverse items-center gap-1 justify-end">
                    <MapPinned className="size-3 shrink-0 opacity-75" aria-hidden />
                    {locationText}
                </p>
            ) : null}
        </div>
    );
}
