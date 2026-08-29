import React from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock } from '@/app/components/ui/icons/CalendarClock';
import { HandHelping } from '@/app/components/ui/icons/HandHelping';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { LegalTask } from '@/app/types/TaskEngine';
import { TASKS_INNER_GLASS_HOVER } from './tasksBoucleTheme';
import type { AnchoredMenuPosition } from './useAnchoredMenuPosition';

type TaskCardOptionsMenuProps = {
    task: LegalTask;
    menuPos: AnchoredMenuPosition;
    archived: boolean;
    readOnly: boolean;
    onClose: () => void;
    onEditRequest: (task: LegalTask) => void;
    onDeleteRequest: (task: LegalTask) => void;
    onPostponeRequest?: (task: LegalTask) => void;
    onRequestHelp?: (task: LegalTask) => void;
};

export function TaskCardOptionsMenu({
    task,
    menuPos,
    archived,
    readOnly,
    onClose,
    onEditRequest,
    onDeleteRequest,
    onPostponeRequest,
    onRequestHelp,
}: TaskCardOptionsMenuProps) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            id={`tasks-task-options-menu-${task.id}`}
            role="menu"
            data-testid={`tasks-task-options-menu-${task.id}`}
            style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                minWidth: menuPos.minWidth,
                zIndex: 1200,
            }}
            className="rounded-xl border border-[#E6C673]/20 bg-[#12182B] py-1 shadow-[0_4px_16px_rgba(0,0,0,0.28)]"
        >
            {onPostponeRequest ? (
                <button
                    type="button"
                    role="menuitem"
                    disabled={archived}
                    onClick={() => {
                        if (archived) return;
                        onClose();
                        onPostponeRequest(task);
                    }}
                    className={`flex w-full flex-row-reverse items-center gap-2 px-3 py-2.5 text-right text-sm font-bold text-[#F4F4F5] ${TASKS_INNER_GLASS_HOVER} disabled:opacity-40 min-h-[44px] touch-manipulation`}
                >
                    <CalendarClock className="size-4 shrink-0 opacity-80" aria-hidden />
                    ترحيل
                </button>
            ) : null}
            {onRequestHelp && !archived && !readOnly ? (
                <button
                    type="button"
                    role="menuitem"
                    data-testid={`tasks-task-help-${task.id}`}
                    onClick={() => {
                        onClose();
                        onRequestHelp(task);
                    }}
                    className={`flex w-full flex-row-reverse items-center gap-2 px-3 py-2.5 text-right text-sm font-bold text-[#F4F4F5] ${TASKS_INNER_GLASS_HOVER} min-h-[44px] touch-manipulation`}
                >
                    <HandHelping className="size-4 shrink-0 opacity-80" aria-hidden />
                    طلب مساعدة
                </button>
            ) : null}
            <button
                type="button"
                role="menuitem"
                disabled={readOnly}
                onClick={() => {
                    if (readOnly) return;
                    onClose();
                    onEditRequest(task);
                }}
                className={`flex w-full flex-row-reverse items-center gap-2 px-3 py-2.5 text-right text-sm font-bold text-[#F4F4F5] ${TASKS_INNER_GLASS_HOVER} disabled:opacity-40 min-h-[44px] touch-manipulation`}
            >
                <Pencil className="size-4 shrink-0 opacity-80" aria-hidden />
                تعديل المهمة
            </button>
            <button
                type="button"
                role="menuitem"
                disabled={readOnly}
                onClick={() => {
                    if (readOnly) return;
                    onClose();
                    onDeleteRequest(task);
                }}
                className="flex w-full flex-row-reverse items-center gap-2 px-3 py-2.5 text-right text-sm font-bold text-rose-200 hover:bg-rose-950/40 disabled:opacity-40 min-h-[44px] touch-manipulation"
            >
                <Trash2 className="size-4 shrink-0 opacity-80" aria-hidden />
                حذف
            </button>
        </div>,
        document.body,
    );
}
