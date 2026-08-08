import React from 'react';
import { CalendarDays, MapPin } from '@/app/components/ui/lucideIcons';
import type { LegalTask } from '@/app/types/TaskEngine';
import { TASKS_GLASS_PANEL } from './tasksBoucleTheme';
import { formatShortDate } from './utils';

export type FatalDeadlinesSectionProps = {
    fatalTasks: LegalTask[];
};

/**
 * سجل متابعة عاجل — صفوف ملخّصة داخل لوحة واحدة.
 * البطاقة الكاملة تبقى في يومها بالأجندة.
 */
export const FatalDeadlinesSection = React.memo(function FatalDeadlinesSection({
    fatalTasks,
}: FatalDeadlinesSectionProps) {
    if (fatalTasks.length === 0) return null;

    return (
        <section
            className={`${TASKS_GLASS_PANEL} border-[#E6C673]/22 px-4 py-3.5`}
            aria-labelledby="fatal-deadlines-heading"
            data-testid="tasks-fatal-section"
        >
            <h2
                id="fatal-deadlines-heading"
                className="font-extrabold flex flex-row-reverse items-center gap-2 mb-1 text-sm text-[#F4F4F5]"
            >
                مواعيد قريبة
                <span className="text-[11px] font-bold text-[#E6C673]/75 tabular-nums">
                    {fatalTasks.length}
                </span>
            </h2>
            <ul className="divide-y divide-[#E6C673]/14" role="list">
                {fatalTasks.map((task) => (
                    <li
                        key={task.id}
                        data-testid={`tasks-fatal-summary-${task.id}`}
                        className="py-2.5 first:pt-2 last:pb-0 text-right"
                    >
                        <div className="flex flex-row-reverse items-start gap-2.5">
                            <span
                                className="mt-0.5 size-2 shrink-0 rounded-full bg-rose-400/80 shadow-[0_0_8px_rgba(251,113,133,0.45)]"
                                aria-hidden
                            />
                            <div className="min-w-0 flex-1 space-y-1">
                                <p className="text-sm font-extrabold text-[#F4F4F5] leading-snug truncate" title={task.title}>
                                    {task.title}
                                </p>
                                <div className="flex flex-row-reverse flex-wrap items-center gap-x-3 gap-y-0.5 justify-end text-[11px] font-semibold">
                                    {task.parsedDate ? (
                                        <span className="inline-flex flex-row-reverse items-center gap-1 text-[#E6C673]">
                                            <CalendarDays className="size-3 shrink-0 opacity-80" aria-hidden />
                                            {formatShortDate(task.parsedDate)}
                                        </span>
                                    ) : null}
                                    {task.location ? (
                                        <span className="inline-flex flex-row-reverse items-center gap-1 text-[#A8D4C4] min-w-0">
                                            <MapPin className="size-3 shrink-0 opacity-80" aria-hidden />
                                            <span className="truncate max-w-[14rem]">{task.location}</span>
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
});
