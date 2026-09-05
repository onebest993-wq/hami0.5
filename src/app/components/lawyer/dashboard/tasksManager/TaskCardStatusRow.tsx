import React, { type RefObject } from 'react';
import { AlertCircle } from '@/app/components/ui/icons/AlertCircle';
import { Check } from '@/app/components/ui/icons/Check';
import { CheckCircle2 } from '@/app/components/ui/icons/CheckCircle2';
import { GitBranch } from '@/app/components/ui/icons/GitBranch';
import { MoreHorizontal } from '@/app/components/ui/icons/MoreHorizontal';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import type { WorkspacePinnedItem } from '@/app/workspace/types';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    TASK_CARD_ICON_BTN,
    TASK_CARD_ICON_BTN_ACTIVE,
    TASK_CARD_ICON_BTN_IDLE,
} from './tasksBoucleTheme';
import { TaskCardOptionsMenu } from './TaskCardOptionsMenu';
import { releaseTouchFocus } from './TaskCardToolRow';
import type { AnchoredMenuPosition } from './useAnchoredMenuPosition';

type TaskCardStatusRowProps = {
    task: LegalTask;
    showFatalBadge: boolean;
    overdueIncomplete: boolean;
    branchCount: number;
    activeBranchSubs: number;
    markedDone: boolean;
    readOnly: boolean;
    archived: boolean;
    reminderFire: boolean;
    clusterPin: WorkspacePinnedItem | null;
    optionsOpen: boolean;
    optionsAnchorRef: RefObject<HTMLButtonElement>;
    menuPos: AnchoredMenuPosition | null;
    onCompleteRequest: (task: LegalTask) => void;
    onReopenTask: (task: LegalTask) => void;
    onReminderBadgeClick: (task: LegalTask) => void;
    toggleOptionsMenu: () => void;
    closeOptionsMenu: () => void;
    onEditRequest: (task: LegalTask) => void;
    onDeleteRequest: (task: LegalTask) => void;
    onPostponeRequest?: (task: LegalTask) => void;
    onRequestHelp?: (task: LegalTask) => void;
};

export function TaskCardStatusRow({
    task,
    showFatalBadge,
    overdueIncomplete,
    branchCount,
    activeBranchSubs,
    markedDone,
    readOnly,
    archived,
    reminderFire,
    clusterPin,
    optionsOpen,
    optionsAnchorRef,
    menuPos,
    onCompleteRequest,
    onReopenTask,
    onReminderBadgeClick,
    toggleOptionsMenu,
    closeOptionsMenu,
    onEditRequest,
    onDeleteRequest,
    onPostponeRequest,
    onRequestHelp,
}: TaskCardStatusRowProps) {
    return (
        <>
            {showFatalBadge ? (
                <div className="flex flex-wrap gap-1 justify-end">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/18 text-rose-200 border border-rose-500/35">
                        حتمي
                    </span>
                </div>
            ) : null}

            <div className="flex flex-row-reverse items-start justify-between gap-2 flex-wrap">
                <div className="flex flex-row-reverse items-center gap-1 shrink-0 flex-wrap">
                    {overdueIncomplete ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/18 text-rose-200 border border-rose-500/35 whitespace-nowrap">
                            <AlertCircle className="size-3" aria-hidden />
                            غير مكتملة
                        </span>
                    ) : null}
                    {branchCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-200 border border-sky-500/25 whitespace-nowrap">
                            <GitBranch className="size-3 shrink-0 opacity-80" aria-hidden />
                            {branchCount} حلقة
                            {activeBranchSubs > 0 ? ` · ${activeBranchSubs} متبق` : ''}
                        </span>
                    ) : null}
                    {markedDone ? (
                        <div className="flex flex-col items-end gap-0.5">
                            <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-bold whitespace-nowrap min-h-[44px] ${
                                    readOnly
                                        ? 'bg-white/[0.04] border-white/[0.1] text-[#F4F4F5]/70'
                                        : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-100'
                                }`}
                            >
                                <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                                {readOnly ? 'تم الإنهاء · للمعاينة' : 'تم الإنهاء'}
                            </span>
                            {!readOnly ? (
                                <button
                                    type="button"
                                    data-testid={`tasks-task-reopen-${task.id}`}
                                    onClick={() => onReopenTask(task)}
                                    onPointerUp={releaseTouchFocus}
                                    className="min-h-[44px] text-[10px] font-bold text-[#E6C673]/80 hover:text-[#E6C673] underline-offset-2 hover:underline touch-manipulation px-1"
                                >
                                    تراجع عن الإنهاء
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <button
                            type="button"
                            data-testid={`tasks-task-complete-${task.id}`}
                            onClick={() => onCompleteRequest(task)}
                            onPointerUp={releaseTouchFocus}
                            className="inline-flex flex-row-reverse items-center gap-1 min-h-[44px] px-2.5 py-1 rounded-xl border border-[#059669]/35 bg-[#059669]/10 text-[11px] font-bold text-[#34D399] hover:bg-[#059669]/16 active:scale-[0.98] transition touch-manipulation whitespace-nowrap"
                        >
                            <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                            إنهاء
                        </button>
                    )}
                </div>

                <div className="flex flex-row-reverse items-center gap-1 shrink-0">
                    {reminderFire ? (
                        <button
                            type="button"
                            onClick={() => onReminderBadgeClick(task)}
                            onPointerUp={releaseTouchFocus}
                            title="حان وقت التخطيط"
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E6C673]/45 bg-[#E6C673]/12 text-base touch-manipulation"
                            aria-label="تذكير مؤجلة"
                        >
                            🔔
                        </button>
                    ) : null}
                    {clusterPin ? (
                        <WorkspacePinButton
                            item={clusterPin}
                            className={`${TASK_CARD_ICON_BTN} ${TASK_CARD_ICON_BTN_IDLE} !w-11 !h-11`}
                            size={14}
                        />
                    ) : null}
                    <div className="relative shrink-0">
                        <button
                            ref={optionsAnchorRef}
                            type="button"
                            data-testid={`tasks-task-options-${task.id}`}
                            onClick={toggleOptionsMenu}
                            onPointerUp={releaseTouchFocus}
                            className={`${TASK_CARD_ICON_BTN} ${
                                optionsOpen ? TASK_CARD_ICON_BTN_ACTIVE : TASK_CARD_ICON_BTN_IDLE
                            }`}
                            aria-label="خيارات المهمة"
                            aria-expanded={optionsOpen}
                            aria-haspopup="menu"
                        >
                            <MoreHorizontal className="size-4" aria-hidden />
                        </button>
                        {optionsOpen && menuPos ? (
                            <TaskCardOptionsMenu
                                task={task}
                                menuPos={menuPos}
                                archived={archived}
                                readOnly={readOnly}
                                onClose={closeOptionsMenu}
                                onEditRequest={onEditRequest}
                                onDeleteRequest={onDeleteRequest}
                                onPostponeRequest={onPostponeRequest}
                                onRequestHelp={onRequestHelp}
                            />
                        ) : null}
                    </div>
                </div>
            </div>
        </>
    );
}
