import React, { useState } from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { Clock } from '@/app/components/ui/icons/Clock';
import { Pin } from '@/app/components/ui/icons/Pin';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { ExecutionFile } from '@/app/types/execution';
import { formatArTaskDate } from './notesTasksModalUi';
import { TaskStepDisplayRow } from './TaskStepDisplayRow';

type CaseNoteLogRow = NonNullable<ExecutionFile['caseNotesLog']>[number];
type CaseTaskRow = NonNullable<ExecutionFile['caseTasksPending']>[number];

function PinnedTaskDetails({
    task,
    isDock,
    onUnpin,
}: {
    task: CaseTaskRow;
    isDock: boolean;
    onUnpin: () => void;
}) {
    const textSm = isDock ? 'text-[11px]' : 'text-[10px]';
    const steps = [...(task.steps ?? [])].sort((a, b) => a.order - b.order);

    return (
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-2.5 py-2">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                    <p className={`font-bold text-white break-words ${isDock ? 'text-xs' : 'text-[11px]'}`}>
                        {task.title}
                    </p>
                    {task.body ? (
                        <p
                            className={`text-slate-300 whitespace-pre-line break-words leading-relaxed ${textSm}`}
                        >
                            {task.body}
                        </p>
                    ) : null}
                    {task.dueDate ? (
                        <p className={`flex items-center gap-1 text-amber-200/85 ${textSm}`}>
                            <Clock size={10} className="shrink-0" />
                            <span>تاريخ التسليم: {formatArTaskDate(task.dueDate)}</span>
                        </p>
                    ) : null}
                    {steps.length > 0 ? (
                        <div className="mt-1 space-y-1">
                            <p className={`font-bold text-slate-400 ${textSm}`}>الخطوات</p>
                            {steps.map((step) => (
                                <TaskStepDisplayRow key={step.id} step={step} />
                            ))}
                        </div>
                    ) : null}
                    {task.createdAt ? (
                        <p className={`text-slate-600 ${textSm}`}>
                            تاريخ الإنشاء: {formatArTaskDate(task.createdAt)}
                        </p>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={onUnpin}
                    className="shrink-0 rounded-lg border border-amber-400/30 bg-amber-500/10 p-1 text-amber-200"
                    title="إلغاء التثبيت"
                >
                    <Pin size={12} className="fill-current" />
                </button>
            </div>
        </div>
    );
}

export interface ExecutionPinnedNotesTrayProps {
    pinnedNotes: CaseNoteLogRow[];
    pinnedTasks: CaseTaskRow[];
    onToggleNotePin: (id: string) => void;
    onToggleTaskPin: (id: string) => void;
    onTrashNote?: (id: string) => void;
    /** داخل المودال أو أسفل زر الملاحظات في أدوات الإضبارة */
    variant?: 'modal' | 'dock';
    className?: string;
}

export const ExecutionPinnedNotesTray: React.FC<ExecutionPinnedNotesTrayProps> = ({
    pinnedNotes,
    pinnedTasks,
    onToggleNotePin,
    onToggleTaskPin,
    onTrashNote,
    variant = 'modal',
    className = '',
}) => {
    const [open, setOpen] = useState(variant === 'modal');
    const count = pinnedNotes.length + pinnedTasks.length;
    if (count === 0) return null;

    const isDock = variant === 'dock';

    const list = (
        <div
            className={
                isDock
                    ? 'max-h-72 min-w-[280px] space-y-2 overflow-y-auto rounded-2xl border border-amber-500/25 bg-[#0A0F1C] p-3 shadow-sm'
                    : 'mt-2 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-white/8 bg-[#0B1120]/80 p-2'
            }
        >
            {pinnedTasks.map((t) => (
                <PinnedTaskDetails
                    key={`pt-${t.id}`}
                    task={t}
                    isDock={isDock}
                    onUnpin={() => onToggleTaskPin(t.id)}
                />
            ))}
            {pinnedNotes.map((n) => (
                <div
                    key={`pn-${n.id}`}
                    className="flex items-start justify-between gap-2 rounded-lg border border-amber-400/10 bg-amber-500/[0.04] px-2 py-1.5"
                >
                    <div className="min-w-0 flex-1">
                        <p className={`font-bold text-white break-words ${isDock ? 'text-xs' : 'text-[11px]'}`}>{n.title}</p>
                        {n.body ? (
                            <p
                                className={`mt-0.5 text-slate-300 whitespace-pre-line break-words leading-relaxed ${isDock ? 'text-[11px]' : 'text-[10px]'}`}
                            >
                                {n.body}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                        <button
                            type="button"
                            onClick={() => onToggleNotePin(n.id)}
                            className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-1 text-amber-200"
                            title="إلغاء التثبيت"
                        >
                            <Pin size={12} className="fill-current" />
                        </button>
                        {onTrashNote ? (
                            <button
                                type="button"
                                onClick={() => onTrashNote(n.id)}
                                className="rounded-lg border border-rose-500/25 p-1 text-rose-300 hover:bg-rose-950/40"
                                title="نقل إلى السلة"
                            >
                                <Trash2 size={12} />
                            </button>
                        ) : null}
                    </div>
                </div>
            ))}
        </div>
    );

    if (isDock) {
        return (
            <div className={`pointer-events-none absolute inset-0 z-10 ${className}`} dir="rtl">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen((v) => !v);
                    }}
                    className="pointer-events-auto absolute left-1.5 top-1.5 flex h-7 min-w-7 items-center justify-center gap-0.5 rounded-full border border-orange-400/40 bg-orange-500/20 px-1.5 text-[10px] font-black text-orange-50 transition-colors hover:bg-orange-500/30"
                    aria-expanded={open}
                    aria-label={open ? 'إخفاء المثبّت' : 'عرض المثبّت'}
                >
                    <Pin size={11} className="fill-current shrink-0" />
                    <span>{count}</span>
                </button>
                {open ? (
                    <div className="pointer-events-auto absolute left-0 top-[calc(100%+6px)] z-40">
                        {list}
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div className={`mb-3 ${className}`} dir="rtl">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-3 py-2 text-[11px] font-bold text-amber-200/90 transition-colors hover:bg-amber-500/[0.07]"
            >
                <span>المثبّت ({count})</span>
                <ChevronDown
                    size={14}
                    className={`shrink-0 text-amber-300/80 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open ? <div className="overflow-hidden">{list}</div> : null}
        </div>
    );
};
