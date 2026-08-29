import React from 'react';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { Clock } from '@/app/components/ui/icons/Clock';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { ChevronUp } from '@/app/components/ui/icons/ChevronUp';
import { Pin } from '@/app/components/ui/icons/Pin';
import { formatArTaskDate, ntm } from './notesTasksModalUi';
import { TaskStepDisplayRow } from './TaskStepDisplayRow';
import { EXEC_MODAL_TOUCH_TARGET } from '../executionModalMobileShell';
import type { ExecutionTask, TaskStep } from './executionTasksSection.types';

export type ExecutionActiveTaskCardProps = {
    task: ExecutionTask;
    isExpanded: boolean;
    onToggleExpanded: () => void;
    onTogglePin: () => void;
    onComplete: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onToggleAllStepsDone: (steps?: TaskStep[]) => void;
    onMarkStepDone: (stepId: string) => void;
    onMarkStepFailed: (stepId: string) => void;
};

export const ExecutionActiveTaskCard: React.FC<ExecutionActiveTaskCardProps> = ({
    task,
    isExpanded,
    onToggleExpanded,
    onTogglePin,
    onComplete,
    onEdit,
    onDelete,
    onToggleAllStepsDone,
    onMarkStepDone,
    onMarkStepFailed,
}) => {
    const allStepsDone = task.steps?.every((s) => s.status === 'done');

    return (
        <div className={ntm.card}>
            <div
                className="flex cursor-pointer items-center justify-between gap-2 p-3"
                onClick={onToggleExpanded}
            >
                <div className="min-w-0 flex-1">
                    <span
                        className={`text-sm font-bold break-words ${allStepsDone ? 'text-emerald-300' : 'text-white'}`}
                    >
                        {task.title}
                    </span>
                    {allStepsDone && (
                        <span className="mr-2 text-[10px] text-emerald-400">✓ مكتملة</span>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin();
                        }}
                        className={`rounded-lg border p-1.5 transition-colors ${EXEC_MODAL_TOUCH_TARGET} ${
                            task.pinned
                                ? 'border-amber-400/35 bg-amber-500/15 text-amber-200'
                                : 'border-white/10 text-slate-400 hover:bg-white/5'
                        }`}
                        title={task.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                    >
                        <Pin size={12} className={task.pinned ? 'fill-current' : undefined} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onComplete();
                        }}
                        className={`rounded-lg border border-emerald-400/25 p-1.5 text-emerald-200 hover:bg-emerald-900/40 ${EXEC_MODAL_TOUCH_TARGET}`}
                        title="إنجاز المهمة"
                    >
                        <CheckCircle size={12} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        className={`rounded-lg border border-amber-400/25 p-1.5 text-amber-100 hover:bg-amber-900/30 ${EXEC_MODAL_TOUCH_TARGET}`}
                        title="تعديل"
                    >
                        <Pencil size={12} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className={`rounded-lg border border-rose-400/25 p-1.5 text-rose-200 hover:bg-rose-950/40 ${EXEC_MODAL_TOUCH_TARGET}`}
                        title="حذف"
                    >
                        <Trash2 size={12} />
                    </button>
                    {isExpanded ? (
                        <ChevronUp size={14} className="text-slate-400" />
                    ) : (
                        <ChevronDown size={14} className="text-slate-400" />
                    )}
                </div>
            </div>

            {isExpanded ? (
                <div className="space-y-2 border-t border-white/8 px-3 pb-3 pt-2">
                    {task.body ? (
                        <p className="text-[11px] text-slate-300 whitespace-pre-line break-words">
                            {task.body}
                        </p>
                    ) : null}
                    {task.dueDate ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <Clock size={10} className="text-amber-300/70" />
                            <span>تاريخ التسليم: {formatArTaskDate(task.dueDate)}</span>
                        </div>
                    ) : null}
                    {task.steps && task.steps.length > 0 ? (
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400">الخطوات</span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleAllStepsDone(task.steps);
                                    }}
                                    className="text-[10px] text-amber-200/90 hover:underline"
                                >
                                    {task.steps.every((s) => s.status === 'done')
                                        ? 'إعادة تعيين'
                                        : 'إنجاز الكل'}
                                </button>
                            </div>
                            <div className="space-y-1">
                                {task.steps.map((step) => (
                                    <TaskStepDisplayRow
                                        key={step.id}
                                        step={step}
                                        stopPropagation
                                        onMarkDone={() => onMarkStepDone(step.id)}
                                        onMarkFailed={() => onMarkStepFailed(step.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : null}
                    <div className="pt-1 text-[9px] text-slate-600">
                        تاريخ الإنشاء: {formatArTaskDate(task.createdAt)}
                    </div>
                </div>
            ) : null}
        </div>
    );
};
