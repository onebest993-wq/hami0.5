import React, { useState } from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { Pin } from '@/app/components/ui/icons/Pin';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { ExecutionFile } from '@/app/types/execution';

type CaseNoteLogRow = NonNullable<ExecutionFile['caseNotesLog']>[number];
type CaseTaskRow = NonNullable<ExecutionFile['caseTasksPending']>[number];

export interface ExecutionPinnedNotesTrayProps {
    pinnedNotes: CaseNoteLogRow[];
    /** @deprecated Tasks UI removed from notes surfaces — ignored in count/list. */
    pinnedTasks?: CaseTaskRow[];
    onToggleNotePin: (id: string) => void;
    /** @deprecated Kept for API compat; unused while task pins are hidden. */
    onToggleTaskPin?: (id: string) => void;
    onTrashNote?: (id: string) => void;
    /** داخل المودال أو أسفل زر الملاحظات في أدوات الإضبارة */
    variant?: 'modal' | 'dock';
    className?: string;
}

export const ExecutionPinnedNotesTray: React.FC<ExecutionPinnedNotesTrayProps> = ({
    pinnedNotes,
    pinnedTasks: _pinnedTasks,
    onToggleNotePin,
    onToggleTaskPin: _onToggleTaskPin,
    onTrashNote,
    variant = 'modal',
    className = '',
}) => {
    const [open, setOpen] = useState(variant === 'modal');
    const count = pinnedNotes.length;
    if (count === 0) return null;

    const isDock = variant === 'dock';

    const list = (
        <div
            className={
                isDock
                    ? 'max-h-72 min-w-[280px] space-y-2 overflow-y-auto rounded-2xl border border-amber-500/25 bg-[#0A0F1C] p-3 shadow-sm'
                    : 'mt-2 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-white/[0.08] bg-transparent p-2'
            }
        >
            {pinnedNotes.map((n) => (
                <div
                    key={`pn-${n.id}`}
                    className={
                        isDock
                            ? 'flex items-start justify-between gap-2 rounded-lg border border-amber-400/10 bg-amber-500/[0.04] px-2 py-1.5'
                            : 'flex items-start justify-between gap-2 rounded-lg border border-white/[0.08] px-2 py-1.5'
                    }
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
                            className={
                                isDock
                                    ? 'rounded-lg border border-amber-400/30 bg-amber-500/10 p-1 text-amber-200'
                                    : 'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/10 text-[#E6C673] touch-manipulation'
                            }
                            title="إلغاء التثبيت"
                        >
                            <Pin size={12} className="fill-current" />
                        </button>
                        {onTrashNote ? (
                            <button
                                type="button"
                                onClick={() => onTrashNote(n.id)}
                                className={
                                    isDock
                                        ? 'rounded-lg border border-rose-500/25 p-1 text-rose-300 hover:bg-rose-950/40'
                                        : 'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-rose-500/25 text-rose-300 hover:bg-rose-950/40 touch-manipulation'
                                }
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
                className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-[11px] font-bold text-slate-200 transition-colors hover:bg-white/[0.04] touch-manipulation"
            >
                <span>المثبّت ({count})</span>
                <ChevronDown
                    size={14}
                    className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open ? <div className="overflow-hidden">{list}</div> : null}
        </div>
    );
};
