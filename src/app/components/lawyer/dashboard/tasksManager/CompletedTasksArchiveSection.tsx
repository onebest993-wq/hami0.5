import React from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, History } from '@/app/components/ui/lucideIcons';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    COMPLETED_TASK_RETENTION_DAYS,
    formatShortDate,
    groupArchivedTasksByWeek,
    isTaskMarkedDone,
    taskCompletedAt,
    type CompletedTasksWeekGroup,
} from './utils';

export type CompletedTasksArchiveSectionProps = {
    tasks: LegalTask[];
    now?: Date;
    onBack: () => void;
};

function CompletedTaskRow({ task }: { task: LegalTask }) {
    const at = taskCompletedAt(task);
    const markedDone = isTaskMarkedDone(task);

    return (
        <li
            className={`flex flex-row-reverse items-start gap-3 rounded-xl border px-4 py-3 ${
                markedDone
                    ? 'border-slate-700/50 bg-slate-900/40'
                    : 'border-rose-500/35 bg-rose-950/20'
            }`}
        >
            {markedDone ? (
                <CheckCircle2 className="size-5 text-emerald-500/80 shrink-0 mt-0.5" aria-hidden />
            ) : (
                <AlertCircle className="size-5 text-rose-400/90 shrink-0 mt-0.5" aria-hidden />
            )}
            <div className="min-w-0 flex-1 text-right">
                <p className="text-slate-100 font-bold text-sm leading-snug">{task.title}</p>
                <p className="text-slate-500 text-[11px] mt-1">
                    {markedDone && at
                        ? `أُنجزت ${formatShortDate(at)}`
                        : markedDone
                          ? 'أُنجزت'
                          : 'غير مكتملة — لم يُضغط «إنهاء المهمة»'}
                    {task.location ? ` · ${task.location}` : ''}
                    {task.parsedDate ? ` · ${formatShortDate(task.parsedDate)}` : ''}
                </p>
            </div>
        </li>
    );
}

function WeekGroupBlock({ group }: { group: CompletedTasksWeekGroup }) {
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-400 text-right">{group.label}</h3>
            <ul className="space-y-2">
                {group.tasks.map((task) => (
                    <CompletedTaskRow key={task.id} task={task} />
                ))}
            </ul>
        </div>
    );
}

export function CompletedTasksArchiveSection({ tasks, now, onBack }: CompletedTasksArchiveSectionProps) {
    const groups = groupArchivedTasksByWeek(tasks, now);

    return (
        <section className="space-y-6">
            <div className="flex flex-row-reverse items-center justify-between gap-3">
                <div className="flex flex-row-reverse items-center gap-2 min-w-0">
                    <History className="size-5 text-amber-200/80 shrink-0" aria-hidden />
                    <h2 className="text-lg font-extrabold text-slate-100">المهام المنتهية</h2>
                </div>
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-200 text-xs font-extrabold hover:bg-slate-800 hover:text-white transition-all"
                >
                    <ArrowRight size={16} aria-hidden />
                    رجوع
                </button>
            </div>
            <p className="text-[11px] text-slate-500 text-right leading-relaxed">
                تُنقل مهام الأسبوع إلى الأرشيف عند انتهاء الأسبوع، وتُحذف تلقائياً بعد{' '}
                {COMPLETED_TASK_RETENTION_DAYS} يوماً.
            </p>
            {groups.length === 0 ? (
                <p className="text-slate-600 text-sm text-center font-medium py-12 rounded-2xl border border-dashed border-slate-700/80">
                    لا توجد مهام في الأرشيف حالياً.
                </p>
            ) : (
                <div className="space-y-8">
                    {groups.map((group) => (
                        <WeekGroupBlock key={group.key} group={group} />
                    ))}
                </div>
            )}
        </section>
    );
}
