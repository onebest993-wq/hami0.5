import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Flame,
    GitBranch,
    MoreHorizontal,
    PanelBottom,
    Paperclip,
    Pencil,
    Trash2,
} from 'lucide-react';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildTaskWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import {
    TASK_CARD_BASE,
    TASK_CARD_DEFAULT,
    TASK_CARD_DONE,
    TASK_CARD_FATAL,
    TASK_CARD_ICON_BTN,
    TASK_CARD_ICON_BTN_ACTIVE,
    TASK_CARD_ICON_BTN_IDLE,
    TASK_TOOL_BTN,
} from './tasksBoucleTheme';
import {
    formatIqd,
    isReminderDue,
    isTaskAgendaReadOnly,
    isTaskDayOverdueIncomplete,
    isTaskMarkedDone,
} from './utils';
import { TaskCardFieldBrief } from './TaskCardFieldBrief';
import { TaskCardMainBrief } from './TaskCardMainBrief';
import { TaskVoicePlayback } from './TaskVoicePlayback';
import { TaskCardBranchPanel, TaskCardDocPanel } from './TaskCardPanels';
import { partitionSubTasks } from './subTaskUtils';
import type { TaskCardProps } from './taskCardUtils';
import { areTaskCardPropsEqual } from './taskCardUtils';
import { TaskListOrdinalBadge, taskListStripeToneClass } from './TaskListOrdinalBadge';
import { useAnchoredMenuPosition, computeAnchoredMenuPosition, type AnchoredMenuPosition } from './useAnchoredMenuPosition';

function releaseTouchFocus(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.blur();
}

function TaskCardComponent(props: TaskCardProps) {
    const {
        task,
        listOrdinal,
        lawsuitFiles = [],
        executionFiles = [],
        now,
        onCompleteRequest,
        onReopenTask,
        onToggleFatal,
        onToggleFieldCurtainPin,
        fatalPulse = false,
        detailPanel,
        setDetailPanel,
        addSubTask,
        toggleSubTaskComplete,
        addDocumentRequirement,
        toggleDocumentRequirement,
        onEditRequest,
        onDeleteRequest,
        onReminderBadgeClick,
    } = props;

    const [branchOpen, setBranchOpen] = useState(false);
    const [addStepOpen, setAddStepOpen] = useState(false);
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [optionsMenuSeed, setOptionsMenuSeed] = useState<AnchoredMenuPosition | null>(null);
    const optionsAnchorRef = useRef<HTMLButtonElement>(null);
    const menuPos = useAnchoredMenuPosition(optionsOpen, optionsAnchorRef, optionsMenuSeed);

    const closeOptionsMenu = useCallback(() => {
        setOptionsOpen(false);
        setOptionsMenuSeed(null);
    }, []);

    const toggleOptionsMenu = useCallback(() => {
        setOptionsOpen((open) => {
            if (open) {
                setOptionsMenuSeed(null);
                return false;
            }
            const el = optionsAnchorRef.current;
            if (el) {
                setOptionsMenuSeed(computeAnchoredMenuPosition(el.getBoundingClientRect()));
            }
            return true;
        });
    }, []);

    useEffect(() => {
        setBranchOpen(false);
        setAddStepOpen(false);
        setOptionsOpen(false);
        setOptionsMenuSeed(null);
    }, [task.id]);

    useEffect(() => {
        if (!optionsOpen) return;
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (optionsAnchorRef.current?.contains(target)) return;
            const menu = document.getElementById(`tasks-task-options-menu-${task.id}`);
            if (menu?.contains(target)) return;
            closeOptionsMenu();
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [optionsOpen, task.id, closeOptionsMenu]);

    const panelKind = detailPanel?.taskId === task.id ? detailPanel.kind : null;

    const fieldLocation = String(task.location ?? '').trim();
    const taskHasLocation = fieldLocation.length > 0;
    const { fieldSubTasks, branchSubTasks } = useMemo(
        () => partitionSubTasks(task.subTasks, taskHasLocation),
        [task.subTasks, taskHasLocation],
    );

    const closeBranchTool = useCallback(() => {
        setBranchOpen(false);
        setAddStepOpen(false);
    }, []);

    const onToggleFieldSub = (subId: string) => toggleSubTaskComplete(task.id, subId);

    const toggleBranchTool = () => {
        if (branchOpen) {
            closeBranchTool();
            return;
        }
        setDetailPanel(null);
        closeOptionsMenu();
        setBranchOpen(true);
        if (branchSubTasks.length === 0) setAddStepOpen(true);
    };

    const toggleBranchSection = () => {
        setBranchOpen((open) => {
            const next = !open;
            if (!next) setAddStepOpen(false);
            return next;
        });
    };

    const toggleBrief = () => {
        if (panelKind === 'brief') {
            setDetailPanel(null);
            return;
        }
        closeBranchTool();
        closeOptionsMenu();
        setDetailPanel({ taskId: task.id, kind: 'brief' });
    };

    const showBranchSection = branchSubTasks.length > 0 || branchOpen;
    const activeBranchSubs = branchSubTasks.filter((s) => !s.isCompleted).length;
    const docOpen = task.documentRequirements.filter((d) => !d.isChecked).length;
    const expenseSum = task.expenses.reduce((a, e) => a + e.amount, 0);
    const requirementsOpen = panelKind === 'brief';
    const hasDocItems = task.documentRequirements.length > 0;
    const showRequirementsBlock = hasDocItems || requirementsOpen;
    const reminderFire = task.reminderAt !== null && isReminderDue(task, now);
    const markedDone = isTaskMarkedDone(task);
    const readOnly = isTaskAgendaReadOnly(task, now);
    const overdueIncomplete = isTaskDayOverdueIncomplete(task, now);
    const clusterPin = useMemo(
        () => buildTaskWorkspacePin(task, lawsuitFiles, executionFiles),
        [task, lawsuitFiles, executionFiles],
    );

    const showFatalBadge = task.isFatalDeadline;
    const showExpenseBadge = expenseSum > 0;
    const detailsText = String(task.title ?? '').trim();

    return (
        <li
            data-testid={`tasks-task-card-${task.id}`}
            className={`${TASK_CARD_BASE}
                ${(listOrdinal?.total ?? 0) > 1 ? '!overflow-visible' : ''}
                ${fatalPulse ? `${TASK_CARD_FATAL} motion-safe:animate-pulse` : readOnly && markedDone ? `${TASK_CARD_DONE} opacity-95` : markedDone ? TASK_CARD_DONE : overdueIncomplete ? 'border-rose-500/40' : TASK_CARD_DEFAULT}
            `}
        >
            {(listOrdinal?.total ?? 0) > 1 ? (
                <TaskListOrdinalBadge ordinal={listOrdinal!} placement="edge" />
            ) : null}
            <div className={`absolute top-0 right-0 bottom-0 w-0.5 bg-gradient-to-b ${taskListStripeToneClass(listOrdinal)} to-transparent pointer-events-none`} />
            <div className="p-3.5 text-right space-y-2">
                {showFatalBadge || showExpenseBadge ? (
                    <div className="flex flex-wrap gap-1 justify-end">
                        {showFatalBadge ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-200 border border-rose-500/40">
                                حتمي
                            </span>
                        ) : null}
                        {showExpenseBadge ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/12 text-amber-200/95 border border-amber-500/25">
                                {formatIqd(expenseSum)}
                            </span>
                        ) : null}
                    </div>
                ) : null}

                <div className="flex flex-row-reverse items-start justify-between gap-2 flex-wrap">
                    <div className="flex flex-row-reverse items-center gap-1.5 shrink-0 flex-wrap">
                        {overdueIncomplete ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/40 whitespace-nowrap">
                                <AlertCircle className="size-3.5" aria-hidden />
                                غير مكتملة
                            </span>
                        ) : null}
                        {branchSubTasks.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/12 text-sky-200 border border-sky-500/28 whitespace-nowrap">
                                <GitBranch className="size-3 shrink-0 opacity-80" aria-hidden />
                                {branchSubTasks.length} فرع
                                {activeBranchSubs > 0 ? ` · ${activeBranchSubs} متبق` : ''}
                            </span>
                        ) : null}
                        {markedDone ? (
                            <div className="flex flex-col items-end gap-1">
                                <span
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-extrabold whitespace-nowrap min-h-[44px] ${
                                        readOnly
                                            ? 'bg-slate-700/30 border-slate-600/50 text-slate-300'
                                            : 'bg-emerald-600/25 border-emerald-500/45 text-emerald-100'
                                    }`}
                                >
                                    <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                                    {readOnly ? 'تم الإنهاء · للمعاينة' : 'تم الإنهاء'}
                                </span>
                                {!readOnly ? (
                                    <button
                                        type="button"
                                        onClick={() => onReopenTask(task)}
                                        onPointerUp={releaseTouchFocus}
                                        className="min-h-[44px] text-[10px] font-bold text-sky-300/90 hover:text-sky-200 underline-offset-2 hover:underline touch-manipulation px-1"
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
                                className="inline-flex flex-row-reverse items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-full border border-[#1A7059]/38 bg-[#1A7059]/10 text-[11px] font-extrabold text-[#6BC4A8] hover:bg-[#1A7059]/16 active:scale-[0.98] transition touch-manipulation whitespace-nowrap"
                            >
                                <span className="size-5 rounded-full border border-[#6BC4A8]/50 flex items-center justify-center bg-[#1A7059]/15">
                                    <Check className="size-3" strokeWidth={2.5} aria-hidden />
                                </span>
                                إنهاء
                            </button>
                        )}
                    </div>

                    <div className="flex flex-row-reverse items-center gap-1.5 shrink-0">
                        {reminderFire ? (
                            <button
                                type="button"
                                onClick={() => onReminderBadgeClick(task)}
                                onPointerUp={releaseTouchFocus}
                                title="حان وقت التخطيط"
                                className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-400/60 bg-amber-500/25 text-base shadow-[0_0_14px_rgba(251,191,36,0.4)] motion-safe:animate-pulse touch-manipulation"
                                aria-label="تذكير مؤجلة"
                            >
                                🔔
                            </button>
                        ) : null}
                        {clusterPin ? (
                            <WorkspacePinButton
                                item={clusterPin}
                                className={`${TASK_CARD_ICON_BTN} ${TASK_CARD_ICON_BTN_IDLE} !w-11 !h-11 !rounded-full`}
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
                            {optionsOpen && menuPos && typeof document !== 'undefined'
                                ? createPortal(
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
                                          className="rounded-xl border border-[#A67C52]/28 bg-[#0A2E25]/98 py-1 shadow-xl shadow-black/45 backdrop-blur-sm"
                                      >
                                          <button
                                              type="button"
                                              role="menuitem"
                                              disabled={readOnly}
                                              onClick={() => {
                                                  if (readOnly) return;
                                                  closeOptionsMenu();
                                                  onEditRequest(task);
                                              }}
                                              className="flex w-full flex-row-reverse items-center gap-2 px-3 py-2.5 text-right text-sm font-bold text-[#E8F5F0] hover:bg-[#0c0c0e]/60 disabled:opacity-40 min-h-[44px] touch-manipulation"
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
                                                  closeOptionsMenu();
                                                  onDeleteRequest(task);
                                              }}
                                              className="flex w-full flex-row-reverse items-center gap-2 px-3 py-2.5 text-right text-sm font-bold text-rose-200 hover:bg-rose-950/40 disabled:opacity-40 min-h-[44px] touch-manipulation"
                                          >
                                              <Trash2 className="size-4 shrink-0 opacity-80" aria-hidden />
                                              حذف
                                          </button>
                                      </div>,
                                      document.body,
                                  )
                                : null}
                        </div>
                    </div>
                </div>

                <TaskCardMainBrief details={detailsText} location={task.location} />

                {task.voiceRef ? (
                    <div className="mt-0.5">
                        <TaskVoicePlayback voiceRef={task.voiceRef} compact />
                    </div>
                ) : null}

                {fieldSubTasks.length > 0 ? (
                    <TaskCardFieldBrief
                        fieldActions={fieldSubTasks}
                        readOnly={readOnly}
                        onToggleSubComplete={onToggleFieldSub}
                    />
                ) : null}

                <div className="flex flex-row-reverse flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => !readOnly && onToggleFatal(task.id)}
                        onPointerUp={releaseTouchFocus}
                        className={`${TASK_TOOL_BTN} ${
                            task.isFatalDeadline
                                ? 'border-rose-500/70 bg-rose-500/25 text-rose-100'
                                : 'border-[#A67C52]/25 bg-[#0c0c0e]/40 text-[#A67C52]/70 hover:border-[#A67C52]/40 hover:text-[#D4B896]'
                        }`}
                    >
                        حتمي
                        <Flame className="size-3.5 shrink-0" aria-hidden />
                    </button>
                    <button
                        type="button"
                        title={
                            task.pinnedToFieldCurtain
                                ? 'إلغاء التثبيت من ستارة مهام اليوم الميدانية'
                                : 'تثبيت على ستارة مهام اليوم الميدانية (الشريط السفلي)'
                        }
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFieldCurtainPin(task.id);
                        }}
                        onPointerUp={releaseTouchFocus}
                        className={`${TASK_TOOL_BTN} ${
                            task.pinnedToFieldCurtain
                                ? 'border-amber-500/60 bg-amber-500/15 text-amber-100'
                                : 'border-[#A67C52]/22 bg-[#0c0c0e]/40 text-slate-400 hover:border-amber-400/40 hover:text-amber-100'
                        }`}
                    >
                        ستارة الميدان
                        <PanelBottom className="size-3.5 shrink-0" aria-hidden />
                    </button>
                    <button
                        type="button"
                        data-testid={`tasks-task-branch-toggle-${task.id}`}
                        onClick={toggleBranchTool}
                        onPointerUp={releaseTouchFocus}
                        className={`${TASK_TOOL_BTN} ${
                            branchOpen
                                ? 'border-sky-500/50 bg-sky-500/15 text-sky-100'
                                : 'border-[#A67C52]/18 bg-[#0c0c0e]/35 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        تفريع
                        <GitBranch className="size-3.5 opacity-90" aria-hidden />
                    </button>
                    <button
                        type="button"
                        data-testid={`tasks-task-requirements-toggle-${task.id}`}
                        onClick={toggleBrief}
                        onPointerUp={releaseTouchFocus}
                        className={`${TASK_TOOL_BTN} ${
                            requirementsOpen
                                ? 'border-violet-500/50 bg-violet-500/15 text-violet-100'
                                : 'border-[#A67C52]/18 bg-[#0c0c0e]/35 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        طلبات
                        {hasDocItems ? (
                            <span className="tabular-nums text-[9px] opacity-90">
                                {docOpen > 0 ? docOpen : '✓'}
                            </span>
                        ) : null}
                        <Paperclip className="size-3.5 opacity-90" aria-hidden />
                    </button>
                </div>

                {showRequirementsBlock ? (
                    <div
                        data-testid={`tasks-task-requirements-panel-${task.id}`}
                        className="rounded-lg border border-violet-500/16 bg-[#0c0c0e]/22 px-2.5 py-2"
                    >
                        <TaskCardDocPanel
                            taskId={task.id}
                            items={task.documentRequirements}
                            readOnly={readOnly}
                            embedded
                            showAdd={requirementsOpen}
                            onToggle={(itemId) => toggleDocumentRequirement(task.id, itemId)}
                            onAdd={(text) => addDocumentRequirement(task.id, text)}
                        />
                    </div>
                ) : null}
            </div>

            {showBranchSection ? (
                <TaskCardBranchPanel
                    subTasks={branchSubTasks}
                    branchOpen={branchOpen}
                    addStepOpen={addStepOpen}
                    readOnly={readOnly}
                    onToggleSection={toggleBranchSection}
                    onOpenAddStep={() => setAddStepOpen(true)}
                    onCloseAddStep={() => setAddStepOpen(false)}
                    onAddSubTask={(title, location) => addSubTask(task.id, title, location)}
                    onToggleSubComplete={onToggleFieldSub}
                />
            ) : null}
        </li>
    );
}

export const TaskCard = React.memo(TaskCardComponent, areTaskCardPropsEqual);
export type { TaskCardProps } from './taskCardUtils';
