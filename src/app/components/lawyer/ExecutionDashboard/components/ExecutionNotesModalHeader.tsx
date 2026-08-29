import React from 'react';
import { ListChecks } from '@/app/components/ui/icons/ListChecks';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { StickyNote } from '@/app/components/ui/icons/StickyNote';
import { X } from '@/app/components/ui/icons/X';
import {
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
} from '../executionModalMobileShell';

const notesTabActive =
    'bg-amber-500/15 text-amber-100 border border-amber-400/25';
const notesTabIdle = 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200';
const paneTabActive =
    'bg-orange-500/20 text-orange-100 border border-orange-400/30';
const paneTabIdle = 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200';

export type ExecutionNotesModalHeaderProps = {
    onClose: () => void;
    notesModalTab: 'notes' | 'tasks';
    onNotesModalTabChange: (tab: 'notes' | 'tasks') => void;
    notesCount: number;
    activeTasksCount: number;
    notesPane: 'compose' | 'vault';
    onNotesPaneChange: (pane: 'compose' | 'vault') => void;
};

export const ExecutionNotesModalHeader: React.FC<ExecutionNotesModalHeaderProps> = ({
    onClose,
    notesModalTab,
    onNotesModalTabChange,
    notesCount,
    activeTasksCount,
    notesPane,
    onNotesPaneChange,
}) => (
    <div
        className={`shrink-0 border-b border-amber-500/20 bg-[#0B1120] px-4 pb-3 pt-4 ${EXEC_MODAL_HEADER_SAFE_TOP}`}
    >
        <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-amber-200">سجل الملاحظات والمهام</h3>
            <button
                type="button"
                onClick={onClose}
                className={`${EXEC_MODAL_CLOSE_BTN_CLASS} text-gray-400 hover:text-white hover:bg-white/5`}
                aria-label="إغلاق"
            >
                <X size={22} />
            </button>
        </div>
        <div
            className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.08] bg-slate-950/80 p-1"
            role="tablist"
            aria-label="الملاحظات أو المهام"
            dir="rtl"
        >
            <button
                type="button"
                role="tab"
                aria-selected={notesModalTab === 'notes'}
                onClick={() => onNotesModalTabChange('notes')}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-bold transition-colors touch-manipulation ${
                    notesModalTab === 'notes' ? notesTabActive : notesTabIdle
                }`}
                data-testid="execution-notes-tab-notes"
            >
                <StickyNote size={14} />
                الملاحظات
                {notesCount > 0 ? (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] tabular-nums">
                        {notesCount}
                    </span>
                ) : null}
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={notesModalTab === 'tasks'}
                onClick={() => onNotesModalTabChange('tasks')}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-bold transition-colors touch-manipulation ${
                    notesModalTab === 'tasks' ? notesTabActive : notesTabIdle
                }`}
                data-testid="execution-notes-tab-tasks"
            >
                <ListChecks size={14} />
                المهام
                {activeTasksCount > 0 ? (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] tabular-nums">
                        {activeTasksCount}
                    </span>
                ) : null}
            </button>
        </div>
        {notesModalTab === 'notes' ? (
            <div
                className="mt-2 grid grid-cols-2 gap-1 rounded-xl border border-amber-500/15 bg-slate-950/60 p-1"
                role="tablist"
                aria-label="كتابة أو سجل الملاحظات"
                dir="rtl"
                data-testid="execution-notes-pane-switch"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={notesPane === 'compose'}
                    onClick={() => onNotesPaneChange('compose')}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition-colors touch-manipulation ${
                        notesPane === 'compose' ? paneTabActive : paneTabIdle
                    }`}
                    data-testid="execution-notes-pane-compose"
                >
                    <Pencil size={13} />
                    كتابة ملاحظة
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={notesPane === 'vault'}
                    onClick={() => onNotesPaneChange('vault')}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition-colors touch-manipulation ${
                        notesPane === 'vault' ? paneTabActive : paneTabIdle
                    }`}
                    data-testid="execution-notes-pane-vault"
                >
                    <StickyNote size={13} />
                    سجل الملاحظات
                    <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] tabular-nums text-amber-100/90">
                        {notesCount}
                    </span>
                </button>
            </div>
        ) : null}
    </div>
);
