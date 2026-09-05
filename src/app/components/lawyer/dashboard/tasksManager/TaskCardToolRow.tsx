import React from 'react';
import { Flame } from '@/app/components/ui/icons/Flame';
import { GitBranch } from '@/app/components/ui/icons/GitBranch';
import { PanelBottom } from '@/app/components/ui/icons/PanelBottom';
import { Paperclip } from '@/app/components/ui/icons/Paperclip';
import { TASKS_INNER_GLASS_SOFT, TASK_TOOL_BTN } from './tasksBoucleTheme';

export function releaseTouchFocus(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.blur();
}

type TaskCardToolRowProps = {
    taskId: string;
    readOnly: boolean;
    isFatalDeadline: boolean;
    pinnedToFieldCurtain: boolean;
    branchOpen: boolean;
    requirementsOpen: boolean;
    hasDocItems: boolean;
    docOpen: number;
    onToggleFatal: () => void;
    onToggleFieldCurtainPin: () => void;
    onToggleBranch: () => void;
    onToggleBrief: () => void;
};

export function TaskCardToolRow({
    taskId,
    readOnly,
    isFatalDeadline,
    pinnedToFieldCurtain,
    branchOpen,
    requirementsOpen,
    hasDocItems,
    docOpen,
    onToggleFatal,
    onToggleFieldCurtainPin,
    onToggleBranch,
    onToggleBrief,
}: TaskCardToolRowProps) {
    return (
        <div className="flex flex-row-reverse flex-wrap items-center gap-1">
            <button
                type="button"
                disabled={readOnly}
                onClick={() => !readOnly && onToggleFatal()}
                onPointerUp={releaseTouchFocus}
                className={`${TASK_TOOL_BTN} ${
                    isFatalDeadline
                        ? 'border-rose-500/55 bg-rose-500/18 text-rose-100'
                        : `border-[#E6C673]/22 ${TASKS_INNER_GLASS_SOFT} text-[#E6C673]/75 hover:border-[#E6C673]/38 hover:text-[#E6C673]`
                }`}
            >
                حتمي
                <Flame className="size-3.5 shrink-0" aria-hidden />
            </button>
            <button
                type="button"
                title={
                    pinnedToFieldCurtain
                        ? 'إلغاء التثبيت من ستارة مهام اليوم الميدانية'
                        : 'تثبيت على ستارة مهام اليوم الميدانية (الشريط السفلي)'
                }
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFieldCurtainPin();
                }}
                onPointerUp={releaseTouchFocus}
                className={`${TASK_TOOL_BTN} ${
                    pinnedToFieldCurtain
                        ? 'border-[#E6C673]/50 bg-[#E6C673]/14 text-[#E6C673]'
                        : `border-[#E6C673]/22 ${TASKS_INNER_GLASS_SOFT} text-[#E6C673]/75 hover:border-[#E6C673]/40 hover:text-[#E6C673]`
                }`}
            >
                ستارة
                <PanelBottom className="size-3.5 shrink-0" aria-hidden />
            </button>
            <button
                type="button"
                data-testid={`tasks-task-branch-toggle-${taskId}`}
                onClick={onToggleBranch}
                onPointerUp={releaseTouchFocus}
                className={`${TASK_TOOL_BTN} ${
                    branchOpen
                        ? 'border-sky-500/45 bg-sky-500/12 text-sky-100'
                        : `border-[#E6C673]/22 ${TASKS_INNER_GLASS_SOFT} text-[#E6C673]/72 hover:text-[#F4F4F5]`
                }`}
            >
                خطة
                <GitBranch className="size-3.5 opacity-90" aria-hidden />
            </button>
            <button
                type="button"
                data-testid={`tasks-task-requirements-toggle-${taskId}`}
                onClick={onToggleBrief}
                onPointerUp={releaseTouchFocus}
                className={`${TASK_TOOL_BTN} ${
                    requirementsOpen
                        ? 'border-violet-500/45 bg-violet-500/12 text-violet-100'
                        : `border-[#E6C673]/22 ${TASKS_INNER_GLASS_SOFT} text-[#E6C673]/72 hover:text-[#F4F4F5]`
                }`}
            >
                طلبات
                {hasDocItems ? (
                    <span className="tabular-nums text-[9px] opacity-90">{docOpen > 0 ? docOpen : '✓'}</span>
                ) : null}
                <Paperclip className="size-3.5 opacity-90" aria-hidden />
            </button>
        </div>
    );
}
