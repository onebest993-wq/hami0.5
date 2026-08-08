import React from 'react';
import { CalendarDays } from '@/app/components/ui/lucideIcons';
import type { LegalTask } from '@/app/types/TaskEngine';
import { formatShortDate, snoozedTaskDueDate } from './utils';
import { TASKS_INNER_GLASS } from './tasksBoucleTheme';
import { TaskListOrdinalBadge, type TaskListOrdinal } from './TaskListOrdinalBadge';

export type SnoozedTaskCardProps = {
    task: LegalTask;
    listOrdinal?: TaskListOrdinal;
};

/** بطاقة مختصرة للمهام المؤجلة — تاريخ القيام فقط (بدون حذف) */
export function SnoozedTaskCard({ task, listOrdinal }: SnoozedTaskCardProps) {
    const due = snoozedTaskDueDate(task);

    return (
        <li
            data-testid={`tasks-snoozed-card-${task.id}`}
            className={`relative flex flex-row-reverse items-center gap-3 rounded-xl ${TASKS_INNER_GLASS} px-3 py-2.5 min-h-[44px] ${
                (listOrdinal?.total ?? 0) > 1 ? 'overflow-visible' : ''
            }`}
        >
            {(listOrdinal?.total ?? 0) > 1 ? (
                <TaskListOrdinalBadge ordinal={listOrdinal!} compact placement="edge" />
            ) : null}
            <div className="min-w-0 flex-1 text-right space-y-0.5">
                <p className="text-sm font-bold text-[#F4F4F5]/90 truncate">{task.title}</p>
                {due ? (
                    <p className="text-[11px] font-semibold text-[#E6C673]/85 flex flex-row-reverse items-center gap-1 justify-end">
                        <CalendarDays className="size-3 shrink-0 opacity-80" aria-hidden />
                        <span data-testid={`tasks-snoozed-due-${task.id}`}>
                            تاريخ القيام: {formatShortDate(due)}
                        </span>
                    </p>
                ) : null}
            </div>
        </li>
    );
}
