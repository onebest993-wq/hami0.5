import React from 'react';
import { CURTAIN_GLASS_INNER } from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';

function TaskCardSkeleton({ delayClass = '' }: { delayClass?: string }) {
    return (
        <li
            className={`relative rounded-xl border border-[#E6C673]/16 bg-[#151C26]/70 overflow-hidden ${delayClass}`}
            aria-hidden
        >
            <div className="absolute inset-y-0 right-0 w-1 bg-[#E6C673]/20 animate-pulse" />
            <div className="p-3 pr-4 space-y-2.5">
                <div className="flex flex-row-reverse items-start justify-between gap-2">
                    <div className="h-3.5 flex-1 max-w-[72%] rounded bg-[#0A0F1C]/50 animate-pulse" />
                    <div className="h-5 w-8 rounded-md bg-[#E6C673]/12 animate-pulse shrink-0" />
                </div>
                <div className="h-2.5 w-[45%] rounded bg-[#0A0F1C]/35 animate-pulse mr-auto" />
                <div className="flex flex-row-reverse gap-2 pt-0.5">
                    <div className="h-9 w-9 rounded-full bg-[#0A0F1C]/40 animate-pulse" />
                    <div className="h-9 w-9 rounded-full bg-[#0A0F1C]/35 animate-pulse" />
                    <div className="h-9 flex-1 max-w-[5.5rem] rounded-full bg-[#059669]/12 animate-pulse" />
                </div>
            </div>
        </li>
    );
}

/** هيكل تحميل غني يطابق بطاقات الستارة الحقيقية */
export function FieldTasksSheetLoadingBody(): React.ReactElement {
    return (
        <div dir="rtl" className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 min-h-0 relative z-[1]">
            <ul className="space-y-2.5" aria-hidden>
                <TaskCardSkeleton />
                <TaskCardSkeleton delayClass="opacity-90" />
                <TaskCardSkeleton delayClass="opacity-80" />
            </ul>
            <div className={`mt-4 ${CURTAIN_GLASS_INNER} p-3 space-y-2 opacity-70`} aria-hidden>
                <div className="h-2.5 w-[38%] rounded bg-[#0A0F1C]/40 animate-pulse mr-auto" />
                <div className="h-10 rounded-xl bg-[#0A0F1C]/35 animate-pulse" />
            </div>
        </div>
    );
}
