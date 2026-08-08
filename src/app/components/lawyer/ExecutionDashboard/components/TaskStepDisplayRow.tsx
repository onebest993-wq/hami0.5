import React from 'react';
import { Calendar, CheckCircle, XCircle } from '@/app/components/ui/lucideIcons';
import { formatArTaskDate, ntm } from './notesTasksModalUi';

export type TaskStepView = {
    id: string;
    text: string;
    order: number;
    dueDate?: string;
    status: 'pending' | 'done' | 'failed';
};

export function TaskStepDisplayRow({
    step,
    onMarkDone,
    onMarkFailed,
    stopPropagation,
}: {
    step: TaskStepView;
    onMarkDone?: () => void;
    onMarkFailed?: () => void;
    stopPropagation?: boolean;
}) {
    const wrapClick = (fn?: () => void) => (e: React.MouseEvent) => {
        if (stopPropagation) e.stopPropagation();
        fn?.();
    };

    return (
        <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-[#0A0F1C]/25 p-2">
            <span className="shrink-0 w-4 pt-0.5 text-center text-[10px] font-bold text-slate-500">
                {step.order}
            </span>
            <div className="min-w-0 flex-1">
                <p
                    className={`text-[11px] break-words leading-snug ${
                        step.status === 'done'
                            ? 'text-emerald-300 line-through'
                            : step.status === 'failed'
                              ? 'text-rose-300 line-through'
                              : 'text-slate-200'
                    }`}
                >
                    {step.text}
                </p>
                {step.dueDate ? (
                    <span className={ntm.stepDateChip}>
                        <Calendar size={9} className="shrink-0 opacity-80" />
                        {formatArTaskDate(step.dueDate)}
                    </span>
                ) : null}
            </div>
            {onMarkDone ? (
                <button
                    type="button"
                    onClick={wrapClick(onMarkDone)}
                    className={`shrink-0 rounded p-1 ${
                        step.status === 'done'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'text-slate-500 hover:text-emerald-300'
                    }`}
                    title="إنجاز الخطوة"
                >
                    <CheckCircle size={10} />
                </button>
            ) : null}
            {onMarkFailed ? (
                <button
                    type="button"
                    onClick={wrapClick(onMarkFailed)}
                    className={`shrink-0 rounded p-1 ${
                        step.status === 'failed'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'text-slate-500 hover:text-rose-300'
                    }`}
                    title="تعذّر الخطوة"
                >
                    <XCircle size={10} />
                </button>
            ) : null}
        </div>
    );
}
