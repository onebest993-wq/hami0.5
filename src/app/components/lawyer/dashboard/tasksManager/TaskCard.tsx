import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    Flame,
    GitBranch,
    MapPinned,
    MoreHorizontal,
    PanelBottom,
    Paperclip,
    Banknote,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildTaskWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import {
    TASK_CARD_BASE,
    TASK_CARD_DEFAULT,
    TASK_CARD_DONE,
    TASK_CARD_FATAL,
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
import { TaskLocationPicker } from './TaskLocationPicker';
import { TaskVoicePlayback } from './TaskVoicePlayback';
import { TaskCardBranchPanel, TaskCardDocPanel, TaskCardExpensePanel } from './TaskCardPanels';
import { areTaskCardPropsEqual, type TaskCardProps } from './taskCardUtils';

function TaskCardComponent(props: TaskCardProps) {
    const {
        task,
        lawsuitFiles = [],
        executionFiles = [],
        now,
        onCompleteRequest,
        onReopenTask,
        onToggleFatal,
        onToggleFieldCurtainPin,
        onSetLocation,
        locationPickFor,
        onToggleLocationPicker,
        fatalPulse = false,
        detailPanel,
        setDetailPanel,
        addSubTask,
        toggleSubTaskComplete,
        addDocumentRequirement,
        toggleDocumentRequirement,
        addExpense,
        onEditRequest,
        onDeleteRequest,
        onReminderBadgeClick,
    } = props;

    const showPicker = locationPickFor === task.id;
    const [branchOpen, setBranchOpen] = useState(false);
    const [addStepOpen, setAddStepOpen] = useState(false);

    useEffect(() => {
        setBranchOpen(false);
        setAddStepOpen(false);
    }, [task.id]);

    const panelKind = detailPanel?.taskId === task.id ? detailPanel.kind : null;
    const toggleBranchSection = () => {
        setBranchOpen((open) => {
            const next = !open;
            if (!next) setAddStepOpen(false);
            return next;
        });
    };
    const openBranchTool = () => {
        if (!branchOpen) {
            setBranchOpen(true);
            if (task.subTasks.length === 0) setAddStepOpen(true);
            return;
        }
        if (!addStepOpen) {
            setAddStepOpen(true);
            return;
        }
        setAddStepOpen(false);
    };
    const openBrief = () =>
        setDetailPanel(panelKind === 'brief' ? null : { taskId: task.id, kind: 'brief' });
    const openExpense = () =>
        setDetailPanel(panelKind === 'expense' ? null : { taskId: task.id, kind: 'expense' });

    const fieldLocation = String(task.location ?? '').trim();
    const showFieldTaskBrief = fieldLocation.length > 0;
    const fieldActions = task.subTasks;
    const hasFieldDetails = fieldActions.length > 0 && String(task.title ?? '').trim().length > 0;
    const fieldPrimaryAction =
        fieldActions.length === 0 && String(task.title ?? '').trim().length > 0 ? task.title.trim() : null;

    const hasSubTasks = task.subTasks.length > 0;
    const showBranchSection = (hasSubTasks || branchOpen) && !showFieldTaskBrief;
    const activeSubs = task.subTasks.filter((s) => !s.isCompleted).length;
    const docOpen = task.documentRequirements.filter((d) => !d.isChecked).length;
    const expenseSum = task.expenses.reduce((a, e) => a + e.amount, 0);
    const reminderFire = task.reminderAt !== null && isReminderDue(task, now);
    const markedDone = isTaskMarkedDone(task);
    const readOnly = isTaskAgendaReadOnly(task, now);
    const overdueIncomplete = isTaskDayOverdueIncomplete(task, now);
    const clusterPin = useMemo(
        () => buildTaskWorkspacePin(task, lawsuitFiles, executionFiles),
        [task, lawsuitFiles, executionFiles],
    );

    const hasBadges =
        task.isFatalDeadline || task.documentRequirements.length > 0 || expenseSum > 0;

    return (
        <li
            data-testid={`tasks-task-card-${task.id}`}
            className={`${TASK_CARD_BASE}
                ${fatalPulse ? `${TASK_CARD_FATAL} motion-safe:animate-pulse` : readOnly && markedDone ? `${TASK_CARD_DONE} opacity-95` : markedDone ? TASK_CARD_DONE : overdueIncomplete ? 'border-rose-500/40' : TASK_CARD_DEFAULT}
            `}
        >
            <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-gradient-to-b from-[#A67C52]/45 via-[#1A7059]/25 to-transparent pointer-events-none" />
            <div className="p-3.5 text-right space-y-2">
                {hasBadges ? (
                    <div className="flex flex-wrap gap-1 justify-end">
                        {task.isFatalDeadline ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-200 border border-rose-500/40">
                                حتمي
                            </span>
                        ) : null}
                        {task.documentRequirements.length > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-200 border border-violet-500/30">
                                متطلبات {docOpen > 0 ? `(${docOpen})` : '✓'}
                            </span>
                        ) : null}
                        {expenseSum > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/12 text-amber-200/95 border border-amber-500/25">
                                {formatIqd(expenseSum)}
                            </span>
                        ) : null}
                    </div>
                ) : null}

                <div className="flex flex-row items-start justify-between gap-3">
                    <div className="flex flex-row-reverse items-center gap-1 shrink-0">
                        {reminderFire ? (
                            <button
                                type="button"
                                onClick={() => onReminderBadgeClick(task)}
                                title="حان وقت التخطيط"
                                className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-400/60 bg-amber-500/25 text-base shadow-[0_0_14px_rgba(251,191,36,0.4)] motion-safe:animate-pulse touch-manipulation"
                                aria-label="تذكير مؤجلة"
                            >
                                🔔
                            </button>
                        ) : null}
                        {clusterPin ? (
                            <div className="flex flex-col items-center gap-0.5 shrink-0" title="تثبيت في بطاقة الواجهة الرئيسية">
                                <WorkspacePinButton item={clusterPin} className="!w-11 !h-11" size={14} />
                                <span className="text-[8px] font-bold text-slate-500 leading-none">البطاقة</span>
                            </div>
                        ) : null}
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#A67C52]/25 bg-[#0c0c0e]/55 text-[#E8F5F0]/75 hover:bg-[#0c0c0e]/75 hover:text-[#E8F5F0] touch-manipulation"
                                    aria-label="خيارات المهمة"
                                >
                                    <MoreHorizontal className="size-4" aria-hidden />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="z-[300] border-[#A67C52]/25 bg-[#0A2E25] text-[#E8F5F0] min-w-[12rem] shadow-xl shadow-black/40"
                                side="bottom"
                                align="end"
                                sideOffset={6}
                            >
                                <DropdownMenuItem
                                    className="gap-2 justify-end flex flex-row-reverse text-right cursor-pointer text-[#E8F5F0] focus:bg-slate-800 focus:text-white min-h-[44px]"
                                    disabled={readOnly}
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        if (readOnly) return;
                                        onEditRequest(task);
                                    }}
                                >
                                    ✏️ تعديل المهمة
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    className="gap-2 justify-end flex flex-row-reverse text-right cursor-pointer text-rose-200 focus:bg-rose-950/60 focus:text-rose-100 min-h-[44px]"
                                    disabled={readOnly}
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        if (readOnly) return;
                                        onDeleteRequest(task);
                                    }}
                                >
                                    🗑️ حذف
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex-1 min-w-0 text-right px-1">
                        {!showFieldTaskBrief ? (
                            <>
                                <p className="font-extrabold text-[#E8F5F0] text-lg sm:text-xl leading-snug break-words tracking-tight">
                                    {task.title}
                                </p>
                                {task.location ? (
                                    <p className="mt-1.5 text-sm font-bold text-[#6BC4A8]/95 flex flex-row-reverse items-center gap-1 justify-end">
                                        <MapPinned className="size-3.5 shrink-0 opacity-80" aria-hidden />
                                        {task.location}
                                    </p>
                                ) : null}
                            </>
                        ) : (
                            <p className="font-extrabold text-[#D4B896]/90 text-xs uppercase tracking-wide">
                                مهمة ميدانية
                            </p>
                        )}
                        {task.voiceRef ? (
                            <div className="mt-2">
                                <TaskVoicePlayback voiceRef={task.voiceRef} compact />
                            </div>
                        ) : null}
                    </div>

                    <div className="flex flex-row items-center gap-1.5 shrink-0 self-start flex-wrap">
                        {overdueIncomplete ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-500/40 whitespace-nowrap">
                                <AlertCircle className="size-3.5" aria-hidden />
                                غير مكتملة
                            </span>
                        ) : null}
                        {hasSubTasks ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#A67C52]/12 text-[#D4B896] border border-[#A67C52]/25 whitespace-nowrap">
                                <GitBranch className="size-3 shrink-0 opacity-80" aria-hidden />
                                {task.subTasks.length} فرع{activeSubs > 0 ? ` · ${activeSubs} متبق` : ''}
                            </span>
                        ) : null}
                        {markedDone ? (
                            <div className="flex flex-col items-start gap-1">
                                <span
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-extrabold whitespace-nowrap min-h-[44px] ${
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
                                className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-[#1A7059]/75 hover:bg-[#1A7059] border border-[#1A7059]/45 text-[#E8F5F0] text-xs font-extrabold transition whitespace-nowrap touch-manipulation"
                            >
                                إنهاء المهمة
                            </button>
                        )}
                    </div>
                </div>

                {showFieldTaskBrief ? (
                    <TaskCardFieldBrief
                        title={task.title}
                        fieldLocation={fieldLocation}
                        fieldActions={fieldActions}
                        fieldPrimaryAction={fieldPrimaryAction}
                        hasFieldDetails={hasFieldDetails}
                        readOnly={readOnly}
                        onToggleSubComplete={(subId) => toggleSubTaskComplete(task.id, subId)}
                    />
                ) : null}

                <div className="flex flex-row-reverse flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => !readOnly && onToggleFatal(task.id)}
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
                        disabled={readOnly}
                        onClick={() => !readOnly && onToggleLocationPicker(showPicker ? null : task.id)}
                        className={`${TASK_TOOL_BTN} border-[#A67C52]/22 bg-[#0c0c0e]/40 text-slate-300 hover:border-emerald-500/45 hover:text-emerald-200`}
                    >
                        موقع
                        <MapPinned className="size-3.5 shrink-0" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={openBranchTool}
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
                        onClick={openBrief}
                        className={`${TASK_TOOL_BTN} ${
                            panelKind === 'brief'
                                ? 'border-violet-500/50 bg-violet-500/15 text-violet-100'
                                : 'border-[#A67C52]/18 bg-[#0c0c0e]/35 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        متطلبات
                        <Paperclip className="size-3.5 opacity-90" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={openExpense}
                        className={`${TASK_TOOL_BTN} ${
                            panelKind === 'expense'
                                ? 'border-amber-500/50 bg-amber-500/15 text-amber-100'
                                : 'border-[#A67C52]/18 bg-[#0c0c0e]/35 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        رسوم
                        <Banknote className="size-3.5 opacity-90" aria-hidden />
                    </button>
                </div>

                {showPicker ? (
                    <TaskLocationPicker
                        taskId={task.id}
                        initialLocation={task.location}
                        onSetLocation={onSetLocation}
                        onClose={() => onToggleLocationPicker(null)}
                    />
                ) : null}
            </div>

            {showBranchSection ? (
                <TaskCardBranchPanel
                    subTasks={task.subTasks}
                    branchOpen={branchOpen}
                    addStepOpen={addStepOpen}
                    readOnly={readOnly}
                    onToggleSection={toggleBranchSection}
                    onOpenAddStep={() => setAddStepOpen(true)}
                    onCloseAddStep={() => setAddStepOpen(false)}
                    onAddSubTask={(title, location) => addSubTask(task.id, title, location)}
                    onToggleSubComplete={(subId) => toggleSubTaskComplete(task.id, subId)}
                />
            ) : null}

            {panelKind === 'brief' ? (
                <TaskCardDocPanel
                    taskId={task.id}
                    items={task.documentRequirements}
                    readOnly={readOnly}
                    onToggle={(itemId) => toggleDocumentRequirement(task.id, itemId)}
                    onAdd={(text) => addDocumentRequirement(task.id, text)}
                />
            ) : null}

            {panelKind === 'expense' ? (
                <TaskCardExpensePanel
                    expenses={task.expenses}
                    readOnly={readOnly}
                    onAdd={(amount, label) => addExpense(task.id, amount, label)}
                />
            ) : null}
        </li>
    );
}

export const TaskCard = React.memo(TaskCardComponent, areTaskCardPropsEqual);
export type { TaskCardProps } from './taskCardUtils';
