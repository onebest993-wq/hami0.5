import React from 'react';
import { MapPinned } from '@/app/components/ui/icons/MapPinned';

export type TaskCardMainBriefProps = {
    details: string;
    location: string | null;
    detailsClassName?: string;
};

/** ملخص المهمة — نص بلا حاوية زجاجية */
export function TaskCardMainBrief({ details, location, detailsClassName }: TaskCardMainBriefProps) {
    const detailsText = details.trim();
    const locationText = String(location ?? '').trim();

    return (
        <div className="text-right" data-testid="tasks-task-main-brief">
            <p
                className={`text-[13px] font-semibold text-[#F4F4F5] leading-snug break-words whitespace-pre-wrap ${detailsClassName ?? ''}`}
            >
                {detailsText || '—'}
            </p>
            {locationText ? (
                <p className="mt-1 text-[11px] font-medium text-[#34D399]/85 flex flex-row-reverse items-center gap-1 justify-end">
                    <MapPinned className="size-3 shrink-0 opacity-75" aria-hidden />
                    {locationText}
                </p>
            ) : null}
        </div>
    );
}
