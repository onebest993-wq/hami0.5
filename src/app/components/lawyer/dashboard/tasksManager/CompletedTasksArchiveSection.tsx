import React from 'react';
import { AlertCircle } from '@/app/components/ui/icons/AlertCircle';
import { ArrowRight } from '@/app/components/ui/icons/ArrowRight';
import { CheckCircle2 } from '@/app/components/ui/icons/CheckCircle2';
import { History } from '@/app/components/ui/icons/History';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    COMPLETED_TASK_RETENTION_DAYS,
    formatShortDate,
    groupArchivedTasksByWeek,
    isTaskMarkedDone,
    taskCompletedAt,
    type CompletedTasksWeekGroup,
} from './utils';
import { TASKS_DIALOG_BTN_CANCEL } from './tasksBoucleTheme';

export type CompletedTasksArchiveSectionProps = {
    tasks: LegalTask[];
    now?: Date;
    onBack: () => void;
    onReopen?: (task: LegalTask) => void;
};

function CompletedTaskRow({ task, onReopen }: { task: LegalTask; onReopen?: (task: LegalTask) => void }) {
    const at = taskCompletedAt(task);
    const markedDone = isTaskMarkedDone(task);

    return (
        <li
            className={`flex flex-row-reverse items-start gap-3 rounded-xl border px-4 py-3 ${
                markedDone
                    ? 'border-white/[0.07] bg-white/[0.03]'
                    : 'border-rose-500/35 bg-rose-950/20'
            }`}
        >
            {markedDone ? (
                <CheckCircle2 className="size-5 text-emerald-500/80 shrink-0 mt-0.5" aria-hidden />
            ) : (
                <AlertCircle className="size-5 text-rose-400/90 shrink-0 mt-0.5" aria-hidden />
            )}
            <div className="min-w-0 flex-1 text-right">
                <p className="text-[#F4F4F5] font-bold text-sm leading-snug">{task.title}</p>
                <p className="text-[#F4F4F5]/45 text-[11px] mt-1">
                    {markedDone && at
                        ? `أُنجزت ${formatShortDate(at)}`
                        : markedDone
                          ? 'أُنجزت'
                          : 'غير مكتملة — لم يُضغط «إنهاء المهمة»'}
                    {task.location ? ` · ${task.location}` : ''}
                    {task.parsedDate ? ` · ${formatShortDate(task.parsedDate)}` : ''}
                </p>
                {onReopen ? (
                    <button
                        type="button"
                        data-testid={`tasks-archive-reopen-${task.id}`}
                        onClick={() => onReopen(task)}
                        className={`${TASKS_DIALOG_BTN_CANCEL} mt-2`}
                    >
                        تراجع عن الإنهاء
                    </button>
                ) : null}
            </div>
        </li>
    );
}

function WeekGroupBlock({
    group,
    onReopen,
}: {
    group: CompletedTasksWeekGroup;
    onReopen?: (task: LegalTask) => void;
}) {
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-[#F4F4F5]/55 text-right">{group.label}</h3>
            <ul className="space-y-2">
                {group.tasks.map((task) => (
                    <CompletedTaskRow key={task.id} task={task} onReopen={onReopen} />
                ))}
            </ul>
        </div>
    );
}

export function CompletedTasksArchiveSection({ tasks, now, onBack, onReopen }: CompletedTasksArchiveSectionProps) {
    const groups = groupArchivedTasksByWeek(tasks, now);

    return (
        <section className="space-y-6">
            <div className="flex flex-row-reverse items-center justify-between gap-3">
                <div className="flex flex-row-reverse items-center gap-2 min-w-0">
                    <History className="size-5 text-[#E6C673]/80 shrink-0" aria-hidden />
                    <h2 className="text-lg font-extrabold text-[#F4F4F5]">المهام المنتهية</h2>
                </div>
                <button
                    type="button"
                    onClick={onBack}
                    className={`${TASKS_DIALOG_BTN_CANCEL} flex items-center gap-1.5 shrink-0`}
                >
                    <ArrowRight size={16} aria-hidden />
                    رجوع
                </button>
            </div>
            <p className="text-[11px] text-[#F4F4F5]/45 text-right leading-relaxed">
                تُنقل مهام الأسبوع إلى الأرشيف عند انتهاء الأسبوع، وتُحذف تلقائياً بعد{' '}
                {COMPLETED_TASK_RETENTION_DAYS} يوماً.
            </p>
            {groups.length === 0 ? (
                <p className="text-[#F4F4F5]/40 text-sm text-center font-medium py-12 rounded-2xl border border-dashed border-white/[0.1]">
                    لا توجد مهام في الأرشيف حالياً.
                </p>
            ) : (
                <div className="space-y-8">
                    {groups.map((group) => (
                        <WeekGroupBlock key={group.key} group={group} onReopen={onReopen} />
                    ))}
                </div>
            )}
        </section>
    );
}
