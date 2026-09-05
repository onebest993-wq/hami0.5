import React from 'react';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { StickyNote } from '@/app/components/ui/icons/StickyNote';
import { X } from '@/app/components/ui/icons/X';
import {
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_OVERLAY_SEG_ACTIVE,
    EXEC_OVERLAY_SEG_IDLE,
    EXEC_OVERLAY_TITLE,
} from '../executionModalMobileShell';

const tabBtn =
    'flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-bold transition-colors touch-manipulation';

export type ExecutionNotesModalHeaderProps = {
    onClose: () => void;
    notesCount: number;
    notesPane: 'compose' | 'vault';
    onNotesPaneChange: (pane: 'compose' | 'vault') => void;
};

export const ExecutionNotesModalHeader: React.FC<ExecutionNotesModalHeaderProps> = ({
    onClose,
    notesCount,
    notesPane,
    onNotesPaneChange,
}) => (
    <div className="shrink-0 border-b border-white/10 px-3 pb-2 pt-2">
        <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className={EXEC_OVERLAY_TITLE}>سجل الملاحظات</h3>
            <button
                type="button"
                onClick={onClose}
                className={EXEC_MODAL_CLOSE_BTN_CLASS}
                aria-label="إغلاق"
            >
                <X size={22} />
            </button>
        </div>
        <div
            className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.08] p-0.5"
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
                className={`${tabBtn} ${notesPane === 'compose' ? EXEC_OVERLAY_SEG_ACTIVE : EXEC_OVERLAY_SEG_IDLE}`}
                data-testid="execution-notes-pane-compose"
            >
                <Pencil size={13} />
                كتابة
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={notesPane === 'vault'}
                onClick={() => onNotesPaneChange('vault')}
                className={`${tabBtn} ${notesPane === 'vault' ? EXEC_OVERLAY_SEG_ACTIVE : EXEC_OVERLAY_SEG_IDLE}`}
                data-testid="execution-notes-pane-vault"
            >
                <StickyNote size={13} />
                السجل
                <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] tabular-nums text-slate-300">
                    {notesCount}
                </span>
            </button>
        </div>
    </div>
);
