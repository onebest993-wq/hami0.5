import React, { useEffect, useState } from 'react';
import {
    AlertCircle,
    Banknote,
    CheckCircle2,
    ChevronDown,
    Flame,
    GitBranch,
    MapPinned,
    MoreHorizontal,
    PanelBottom,
    Paperclip,
} from 'lucide-react';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import type { DetailPanel } from './types';
import { formatIqd, isReminderDue, isTaskAgendaReadOnly, isTaskDayOverdueIncomplete, isTaskMarkedDone, parseAmountInput } from './utils';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildTaskWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import {
    TASK_CARD_BASE,
    TASK_CARD_DEFAULT,
    TASK_CARD_DONE,
    TASK_CARD_FATAL,
    TASK_TOOL_BTN,
} from './tasksBoucleTheme';

export type TaskCardProps = {
    task: LegalTask;
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
    now: Date;
    onCompleteRequest: (task: LegalTask) => void;
    onReopenTask: (task: LegalTask) => void;
    onToggleFatal: (id: string) => void;
    onToggleFieldCurtainPin: (id: string) => void;
    onSetLocation: (id: string, location: string | null) => void;
    locationPickFor: string | null;
    onToggleLocationPicker: (taskId: string | null) => void;
    fatalPulse?: boolean;
    detailPanel: DetailPanel;
    setDetailPanel: (p: DetailPanel) => void;
    addSubTask: (parentId: string, title: string, location: string | null) => void;
    toggleSubTaskComplete: (parentId: string, subId: string) => void;
    setSubTaskLocation: (parentId: string, subId: string, location: string | null) => void;
    addDocumentRequirement: (parentId: string, text: string) => void;
    toggleDocumentRequirement: (parentId: string, itemId: string) => void;
    addExpense: (parentId: string, amount: number, label: string) => void;
    onEditRequest: (task: LegalTask) => void;
    onDeleteRequest: (task: LegalTask) => void;
    onReminderBadgeClick: (task: LegalTask) => void;
};

const toolBtn = TASK_TOOL_BTN;

export function TaskCard({
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
    setSubTaskLocation,
    addDocumentRequirement,
    toggleDocumentRequirement,
    addExpense,
    onEditRequest,
    onDeleteRequest,
    onReminderBadgeClick,
}: TaskCardProps) {
    const showPicker = locationPickFor === task.id;
    const [locDraft, setLocDraft] = useState('');
    const [subDraft, setSubDraft] = useState('');
    const [subNewLocDraft, setSubNewLocDraft] = useState('');
    const [docDraft, setDocDraft] = useState('');
    const [expAmount, setExpAmount] = useState('');
    const [expLabel, setExpLabel] = useState('');

    useEffect(() => {
        if (showPicker) setLocDraft(task.location ?? '');
    }, [showPicker, task.id, task.location]);

    const [branchOpen, setBranchOpen] = useState(false);
    const [addStepOpen, setAddStepOpen] = useState(false);

    useEffect(() => {
        setBranchOpen(false);
        setAddStepOpen(false);
        setSubDraft('');
        setSubNewLocDraft('');
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

    const commitNewSubTask = () => {
        const trimmed = subDraft.trim();
        if (!trimmed) return false;
        const subLoc = subNewLocDraft.trim();
        addSubTask(task.id, trimmed, subLoc.length > 0 ? subLoc : null);
        setSubDraft('');
        setSubNewLocDraft('');
        return true;
    };

    const saveNewSubStep = () => {
        if (subDraft.trim()) {
            commitNewSubTask();
        }
        setAddStepOpen(false);
    };

    const hasSubTasks = task.subTasks.length > 0;
    const showBranchSection = hasSubTasks || branchOpen;
    const activeSubs = task.subTasks.filter((s) => !s.isCompleted).length;
    const docOpen = task.documentRequirements.filter((d) => !d.isChecked).length;
    const expenseSum = task.expenses.reduce((a, e) => a + e.amount, 0);
    const reminderFire = task.reminderAt !== null && isReminderDue(task, now);
    const markedDone = isTaskMarkedDone(task);
    const readOnly = isTaskAgendaReadOnly(task, now);
    const overdueIncomplete = isTaskDayOverdueIncomplete(task, now);
    const clusterPin = buildTaskWorkspacePin(task, lawsuitFiles, executionFiles);

    const hasBadges =
        task.isFatalDeadline ||
        task.documentRequirements.length > 0 ||
        expenseSum > 0;

    return (
        <li
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
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/60 bg-amber-500/25 text-base shadow-[0_0_14px_rgba(251,191,36,0.4)] motion-safe:animate-pulse"
                                aria-label="تذكير مؤجلة"
                            >
                                🔔
                            </button>
                        ) : null}
                        {clusterPin ? (
                            <div className="flex flex-col items-center gap-0.5 shrink-0" title="تثبيت في بطاقة الواجهة الرئيسية">
                                <WorkspacePinButton item={clusterPin} className="!w-8 !h-8" size={14} />
                                <span className="text-[8px] font-bold text-slate-500 leading-none">البطاقة</span>
                            </div>
                        ) : null}
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#A67C52]/25 bg-[#0c0c0e]/55 text-[#E8F5F0]/75 hover:bg-[#0c0c0e]/75 hover:text-[#E8F5F0]"
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
                                    className="gap-2 justify-end flex flex-row-reverse text-right cursor-pointer text-[#E8F5F0] focus:bg-slate-800 focus:text-white"
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
                                    className="gap-2 justify-end flex flex-row-reverse text-right cursor-pointer text-rose-200 focus:bg-rose-950/60 focus:text-rose-100"
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
                        <p className="font-extrabold text-[#E8F5F0] text-lg sm:text-xl leading-snug break-words tracking-tight">
                            {task.title}
                        </p>
                        {task.location ? (
                            <p className="mt-1.5 text-sm font-bold text-[#6BC4A8]/95 flex flex-row-reverse items-center gap-1 justify-end">
                                <MapPinned className="size-3.5 shrink-0 opacity-80" aria-hidden />
                                {task.location}
                            </p>
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
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-extrabold whitespace-nowrap ${
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
                                        className="text-[10px] font-bold text-sky-300/90 hover:text-sky-200 underline-offset-2 hover:underline"
                                    >
                                        تراجع عن الإنهاء
                                    </button>
                                ) : null}
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onCompleteRequest(task)}
                                className="px-3.5 py-1.5 rounded-lg bg-[#1A7059]/75 hover:bg-[#1A7059] border border-[#1A7059]/45 text-[#E8F5F0] text-xs font-extrabold transition whitespace-nowrap"
                            >
                                إنهاء المهمة
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-row-reverse flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => !readOnly && onToggleFatal(task.id)}
                        className={`${toolBtn} ${
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
                        className={`${toolBtn} ${
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
                        className={`${toolBtn} border-[#A67C52]/22 bg-[#0c0c0e]/40 text-slate-300 hover:border-emerald-500/45 hover:text-emerald-200`}
                    >
                        موقع
                        <MapPinned className="size-3.5 shrink-0" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={openBranchTool}
                        className={`${toolBtn} ${
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
                        className={`${toolBtn} ${
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
                        className={`${toolBtn} ${
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
                    <div className="rounded-xl border border-[#A67C52]/18/60 bg-slate-950/40 p-3 space-y-2">
                        <input
                            dir="rtl"
                            type="text"
                            value={locDraft}
                            onChange={(e) => setLocDraft(e.target.value)}
                            placeholder="اكتب موقع المحكمة أو الدائرة…"
                            className="w-full rounded-lg border border-slate-600/80 bg-[#0c0c0e]/50 px-3 py-2 text-xs text-[#E8F5F0] placeholder:text-slate-600 outline-none focus:border-emerald-500/40"
                        />
                        <div className="flex flex-row-reverse flex-wrap gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    onSetLocation(task.id, locDraft.trim() || null);
                                    onToggleLocationPicker(null);
                                }}
                                className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-600/80 border border-emerald-500/40 text-white"
                            >
                                تعيين الموقع
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onSetLocation(task.id, null);
                                    onToggleLocationPicker(null);
                                }}
                                className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-600 text-slate-500 hover:text-slate-300"
                            >
                                مسح
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>

            {showBranchSection ? (
                <div className="mx-3 mb-3 border-r-2 border-emerald-500/35 pr-2.5 py-2 bg-[#0c0c0e]/35 rounded-lg rounded-tr-none text-right">
                    <button
                        type="button"
                        onClick={toggleBranchSection}
                        className="w-full flex flex-row-reverse items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-slate-800/40 transition"
                        aria-expanded={branchOpen}
                    >
                        <span className="text-[11px] font-bold text-emerald-200/90">
                            مسار إجرائي متفرع
                            {hasSubTasks ? ` (${task.subTasks.length})` : ''}
                        </span>
                        <ChevronDown
                            className={`size-4 text-emerald-300/80 shrink-0 transition-transform duration-200 ${
                                branchOpen ? 'rotate-180' : ''
                            }`}
                            aria-hidden
                        />
                    </button>

                    {branchOpen ? (
                        <>
                            {hasSubTasks ? (
                                <ul className="mt-1.5 space-y-1 mb-1.5">
                                    {task.subTasks.map((st, idx) => (
                                        <li
                                            key={st.id}
                                            className={`rounded-lg border px-2.5 py-1.5 flex flex-row items-center gap-2 ${
                                                st.isCompleted
                                                    ? 'border-emerald-500/25 bg-emerald-950/15'
                                                    : 'border-[#A67C52]/18/55 bg-slate-900/35'
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0 text-right">
                                                <div className="flex flex-row-reverse items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-slate-500 tabular-nums shrink-0">
                                                        {idx + 1}.
                                                    </span>
                                                    <span
                                                        className={`text-sm font-bold leading-snug break-words ${
                                                            st.isCompleted
                                                                ? 'text-slate-500 line-through'
                                                                : 'text-[#E8F5F0]'
                                                        }`}
                                                    >
                                                        {st.title}
                                                    </span>
                                                </div>
                                                {st.location ? (
                                                    <p className="mt-0.5 text-[10px] font-semibold text-emerald-300/85 truncate">
                                                        {st.location}
                                                    </p>
                                                ) : null}
                                            </div>
                                            {st.isCompleted ? (
                                                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600/20 border border-emerald-500/35 text-[10px] font-extrabold text-emerald-200 whitespace-nowrap">
                                                    <CheckCircle2 className="size-3" aria-hidden />
                                                    تم
                                                </span>
                                            ) : readOnly ? null : (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSubTaskComplete(task.id, st.id)}
                                                    className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/45 text-white text-[10px] font-extrabold transition whitespace-nowrap"
                                                >
                                                    تم الإجراء الفرعي
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : !addStepOpen ? (
                                <p className="text-[11px] text-slate-500 mt-1.5 mb-1">لا توجد خطوات فرعية بعد.</p>
                            ) : null}

                            {!readOnly && addStepOpen ? (
                                <div className="border-t border-[#A67C52]/18/45 pt-2 space-y-1.5">
                                    <input
                                        dir="rtl"
                                        type="text"
                                        placeholder="خطوة جديدة…"
                                        value={subDraft}
                                        onChange={(e) => setSubDraft(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key !== 'Enter') return;
                                            e.preventDefault();
                                            commitNewSubTask();
                                        }}
                                        className="w-full rounded-lg border border-[#A67C52]/18/90 bg-[#0c0c0e]/50 px-2.5 py-1.5 text-sm text-[#E8F5F0] placeholder:text-slate-600 outline-none focus:border-emerald-500/40"
                                    />
                                    <input
                                        dir="rtl"
                                        type="text"
                                        placeholder="موقع الفرع (اختياري)…"
                                        value={subNewLocDraft}
                                        onChange={(e) => setSubNewLocDraft(e.target.value)}
                                        className="w-full rounded-lg border border-[#A67C52]/18/90 bg-[#0c0c0e]/50 px-2.5 py-1.5 text-[11px] text-[#E8F5F0] placeholder:text-slate-600 outline-none focus:border-emerald-500/40"
                                    />
                                    <div className="flex flex-row-reverse gap-1.5 pt-0.5">
                                        <button
                                            type="button"
                                            onClick={() => commitNewSubTask()}
                                            disabled={!subDraft.trim()}
                                            className="flex-1 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-extrabold disabled:opacity-40 transition"
                                        >
                                            إضافة الخطوة
                                        </button>
                                        <button
                                            type="button"
                                            onClick={saveNewSubStep}
                                            className="flex-1 py-1.5 rounded-lg border border-slate-600/80 bg-slate-800/60 text-slate-200 text-xs font-extrabold hover:bg-slate-800 transition"
                                        >
                                            حفظ
                                        </button>
                                    </div>
                                </div>
                            ) : !readOnly ? (
                                <button
                                    type="button"
                                    onClick={() => setAddStepOpen(true)}
                                    className="mt-1 w-full py-1.5 rounded-lg border border-dashed border-emerald-500/35 text-emerald-200/90 text-[11px] font-extrabold hover:bg-emerald-950/20 transition"
                                >
                                    + إضافة خطوة
                                </button>
                            ) : null}
                        </>
                    ) : null}
                </div>
            ) : null}

            {panelKind === 'brief' ? (
                <div className="mx-3.5 mb-3.5 mr-5 border-r-2 border-violet-500/35 pr-3 py-2.5 bg-[#0c0c0e]/35 rounded-lg rounded-tr-none text-right space-y-2">
                    <p className="text-[11px] font-bold text-violet-200/90">حقيبة المستندات</p>
                    <ul className="space-y-1.5 max-h-36 overflow-y-auto">
                        {task.documentRequirements.map((d) => (
                            <li key={d.id} className="flex flex-row-reverse items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-600 accent-violet-500"
                                    checked={d.isChecked}
                                    disabled={readOnly}
                                    onChange={() => !readOnly && toggleDocumentRequirement(task.id, d.id)}
                                />
                                <span
                                    className={`text-sm flex-1 ${d.isChecked ? 'text-slate-500 line-through' : 'text-slate-200'}`}
                                >
                                    {d.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {!readOnly ? (
                    <div className="flex gap-2 flex-row-reverse">
                        <input
                            dir="rtl"
                            type="text"
                            placeholder="مستند مطلوب…"
                            value={docDraft}
                            onChange={(e) => setDocDraft(e.target.value)}
                            className="flex-1 rounded-lg border border-[#A67C52]/18 bg-[#0c0c0e]/50 px-3 py-2 text-sm text-[#E8F5F0] placeholder:text-slate-600 outline-none focus:border-violet-500/40"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                addDocumentRequirement(task.id, docDraft);
                                setDocDraft('');
                            }}
                            disabled={!docDraft.trim()}
                            className="shrink-0 px-3 rounded-lg bg-violet-600/85 text-white text-xs font-extrabold disabled:opacity-40"
                        >
                            +
                        </button>
                    </div>
                    ) : null}
                </div>
            ) : null}

            {panelKind === 'expense' ? (
                <div className="mx-3.5 mb-3.5 mr-5 border-r-2 border-amber-500/35 pr-3 py-2.5 bg-[#0c0c0e]/35 rounded-lg rounded-tr-none text-right space-y-2">
                    <p className="text-[11px] font-bold text-amber-200/90">مصروفات مسجلة</p>
                    <ul className="space-y-1 text-sm text-slate-300">
                        {task.expenses.map((e) => (
                            <li key={e.id} className="flex flex-row-reverse justify-between gap-2 border-b border-slate-800/60 pb-1">
                                <span className="font-bold text-amber-200/90 tabular-nums">{formatIqd(e.amount)}</span>
                                <span className="text-slate-400 truncate flex-1">{e.label}</span>
                            </li>
                        ))}
                    </ul>
                    {!readOnly ? (
                    <>
                    <div className="grid gap-2 sm:grid-cols-2 grid-cols-1">
                        <input
                            dir="ltr"
                            type="text"
                            inputMode="decimal"
                            placeholder="50000"
                            value={expAmount}
                            onChange={(e) => setExpAmount(e.target.value)}
                            className="rounded-lg border border-[#A67C52]/18 bg-[#0c0c0e]/50 px-3 py-2 text-sm text-[#E8F5F0] placeholder:text-slate-600 outline-none focus:border-amber-500/40 text-left"
                        />
                        <input
                            dir="rtl"
                            type="text"
                            placeholder="بند (مثلاً: رسم خبير)"
                            value={expLabel}
                            onChange={(e) => setExpLabel(e.target.value)}
                            className="rounded-lg border border-[#A67C52]/18 bg-[#0c0c0e]/50 px-3 py-2 text-sm text-[#E8F5F0] placeholder:text-slate-600 outline-none focus:border-amber-500/40"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const amt = parseAmountInput(expAmount);
                            if (amt <= 0) return;
                            addExpense(task.id, amt, expLabel);
                            setExpAmount('');
                            setExpLabel('');
                        }}
                        className="w-full py-2 rounded-lg bg-amber-600/85 hover:bg-amber-600 text-white text-xs font-extrabold transition"
                    >
                        حفظ المصروف
                    </button>
                    </>
                    ) : null}
                </div>
            ) : null}
        </li>
    );
}
