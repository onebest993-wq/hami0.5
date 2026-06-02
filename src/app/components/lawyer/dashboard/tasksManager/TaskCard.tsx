import React, { useEffect, useState } from 'react';
import {
    Banknote,
    Flame,
    GitBranch,
    MapPinned,
    MoreHorizontal,
    Paperclip,
    Pin,
} from 'lucide-react';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import type { DetailPanel } from './types';
import { formatIqd, isReminderDue, parseAmountInput } from './utils';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildTaskWorkspacePin } from '@/app/workspace/workspacePinBuilders';

export type TaskCardProps = {
    task: LegalTask;
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
    now: Date;
    onCompleteRequest: (task: LegalTask) => void;
    onToggleFatal: (id: string) => void;
    onTogglePin: (id: string) => void;
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

export function TaskCard({
    task,
    lawsuitFiles = [],
    executionFiles = [],
    now,
    onCompleteRequest,
    onToggleFatal,
    onTogglePin,
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

    useEffect(() => {
        if (showPicker) {
            setLocDraft(task.location ?? '');
        }
    }, [showPicker, task.id, task.location]);
    const [docDraft, setDocDraft] = useState('');
    const [expAmount, setExpAmount] = useState('');
    const [expLabel, setExpLabel] = useState('');

    const panelKind = detailPanel?.taskId === task.id ? detailPanel.kind : null;
    const openBranch = () =>
        setDetailPanel(panelKind === 'branch' ? null : { taskId: task.id, kind: 'branch' });
    const openBrief = () =>
        setDetailPanel(panelKind === 'brief' ? null : { taskId: task.id, kind: 'brief' });
    const openExpense = () =>
        setDetailPanel(panelKind === 'expense' ? null : { taskId: task.id, kind: 'expense' });

    const activeSubs = task.subTasks.filter((s) => !s.isCompleted).length;
    const docOpen = task.documentRequirements.filter((d) => !d.isChecked).length;
    const expenseSum = task.expenses.reduce((a, e) => a + e.amount, 0);
    const reminderFire = task.reminderAt !== null && isReminderDue(task, now);

    return (
        <li
            className={`group/task relative bg-slate-800/50 backdrop-blur-md border rounded-xl flex flex-col transition-all duration-300 overflow-hidden
                ${fatalPulse ? 'border-rose-500/70 shadow-[0_0_28px_rgba(244,63,94,0.35)] motion-safe:animate-pulse' : 'border-slate-700/50'}
                hover:border-amber-500/20 hover:shadow-[0_0_22px_rgba(251,191,36,0.07)] hover:bg-slate-800/70
            `}
        >
            <div className="flex flex-row-reverse gap-3 items-start p-4">
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-500 bg-slate-900/80 accent-rose-500 cursor-pointer"
                        checked={false}
                        aria-label="إكمال المهمة"
                        onChange={() => onCompleteRequest(task)}
                    />
                    <div className="flex flex-col gap-1.5 items-end max-w-[9rem] sm:max-w-none opacity-100 sm:opacity-0 sm:group-hover/task:opacity-100 transition-opacity duration-200">
                        <button
                            type="button"
                            title={task.isFatalDeadline ? 'إلغاء تعليم حتمي' : 'تعليم كموعد حتمي'}
                            onClick={() => onToggleFatal(task.id)}
                            className={`flex flex-row-reverse items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold border transition w-full justify-end ${
                                task.isFatalDeadline
                                    ? 'border-rose-500/70 bg-rose-500/25 text-rose-100'
                                    : 'border-slate-600/90 bg-slate-900/50 text-slate-400 hover:border-rose-400/45 hover:text-rose-200'
                            }`}
                        >
                            حتمي
                            <Flame className="size-3.5 shrink-0" aria-hidden />
                        </button>
                        <button
                            type="button"
                            title={task.pinnedToFieldCurtain ? 'إلغاء التثبيت على الستارة' : 'تثبيت على ستارة الميدان'}
                            onClick={() => onTogglePin(task.id)}
                            className={`flex flex-row-reverse items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold border transition w-full justify-end ${
                                task.pinnedToFieldCurtain
                                    ? 'border-amber-500/60 bg-amber-500/15 text-amber-100'
                                    : 'border-slate-600/90 bg-slate-900/50 text-slate-400 hover:border-amber-400/40 hover:text-amber-100'
                            }`}
                        >
                            ستارة
                            <Pin className="size-3.5 shrink-0" aria-hidden />
                        </button>
                        <button
                            type="button"
                            title="تعيين موقع المحكمة"
                            onClick={() => onToggleLocationPicker(showPicker ? null : task.id)}
                            className="flex flex-row-reverse items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold border border-slate-600/90 bg-slate-900/50 text-slate-300 hover:border-emerald-500/45 hover:text-emerald-200 transition w-full justify-end"
                        >
                            موقع
                            <MapPinned className="size-3.5 shrink-0" aria-hidden />
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-w-0 text-right flex flex-col">
                    <div className="flex flex-row-reverse items-start justify-between gap-2 mb-2">
                        <p className="font-bold text-slate-100 text-[15px] leading-snug tracking-tight flex-1 min-w-0 break-words">
                            {task.title}
                        </p>
                        <div className="flex flex-row-reverse items-center gap-1.5 shrink-0 pt-0.5">
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
                            {(() => {
                                const clusterPin = buildTaskWorkspacePin(task, lawsuitFiles, executionFiles);
                                return clusterPin ? (
                                    <WorkspacePinButton item={clusterPin} className="!w-8 !h-8" size={14} />
                                ) : null;
                            })()}
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600/80 bg-slate-900/80 text-slate-300 hover:bg-slate-700 hover:text-white shadow-sm"
                                        aria-label="خيارات المهمة"
                                    >
                                        <MoreHorizontal className="size-4" aria-hidden />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="z-[300] border-slate-600 bg-slate-900 text-slate-100 min-w-[12rem] shadow-xl shadow-black/40"
                                    side="bottom"
                                    align="end"
                                    sideOffset={6}
                                >
                                    <DropdownMenuItem
                                        className="gap-2 justify-end flex flex-row-reverse text-right cursor-pointer text-slate-100 focus:bg-slate-800 focus:text-white"
                                        onSelect={(e) => {
                                            e.preventDefault();
                                            onEditRequest(task);
                                        }}
                                    >
                                        ✏️ تعديل المهمة
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        variant="destructive"
                                        className="gap-2 justify-end flex flex-row-reverse text-right cursor-pointer text-rose-200 focus:bg-rose-950/60 focus:text-rose-100"
                                        onSelect={(e) => {
                                            e.preventDefault();
                                            onDeleteRequest(task);
                                        }}
                                    >
                                        🗑️ حذف
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                        {task.location ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                {task.location}
                            </span>
                        ) : null}
                        {task.pinnedToFieldCurtain ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-200 border border-amber-500/35 flex items-center gap-0.5 flex-row-reverse">
                                <Pin className="size-3" aria-hidden />
                                ستارة
                            </span>
                        ) : null}
                        {task.isFatalDeadline ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-200 border border-rose-500/40">
                                حتمي
                            </span>
                        ) : null}
                        {activeSubs > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-200 border border-sky-500/30">
                                {activeSubs} فرع
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

                    {showPicker ? (
                        <div className="mt-3 pt-3 border-t border-slate-700/60 flex flex-col gap-2 text-right">
                            <input
                                dir="rtl"
                                type="text"
                                value={locDraft}
                                onChange={(e) => setLocDraft(e.target.value)}
                                placeholder="اكتب موقع المحكمة أو الدائرة يدوياً…"
                                className="w-full rounded-lg border border-slate-600/80 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500/40"
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
                                    مسح الموقع
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="px-4 pb-3">
                <div className="border-t border-slate-700/40 pt-2.5 flex flex-row-reverse flex-wrap items-center gap-1.5 justify-end opacity-75 sm:opacity-0 sm:group-hover/task:opacity-100 transition-opacity duration-200">
                    <button
                        type="button"
                        onClick={openBranch}
                        className={`flex flex-row-reverse items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold border transition ${
                            panelKind === 'branch'
                                ? 'border-sky-500/50 bg-sky-500/15 text-sky-100'
                                : 'border-slate-700/80 bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                        }`}
                    >
                        تفريع الإجراءات
                        <GitBranch className="size-3.5 opacity-90" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={openBrief}
                        className={`flex flex-row-reverse items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold border transition ${
                            panelKind === 'brief'
                                ? 'border-violet-500/50 bg-violet-500/15 text-violet-100'
                                : 'border-slate-700/80 bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                        }`}
                    >
                        المتطلبات
                        <Paperclip className="size-3.5 opacity-90" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={openExpense}
                        className={`flex flex-row-reverse items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold border transition ${
                            panelKind === 'expense'
                                ? 'border-amber-500/50 bg-amber-500/15 text-amber-100'
                                : 'border-slate-700/80 bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                        }`}
                    >
                        الرسوم
                        <Banknote className="size-3.5 opacity-90" aria-hidden />
                    </button>
                </div>
            </div>

            {panelKind === 'branch' ? (
                <div className="mx-4 mb-4 mr-6 border-r-2 border-emerald-500/35 pr-4 pl-2 py-3 bg-slate-950/30 rounded-lg rounded-tr-none text-right space-y-3">
                    <p className="text-[11px] font-bold text-emerald-200/90">مسار إجرائي متفرع</p>
                    <ul className="space-y-2">
                        {task.subTasks.map((st) => (
                            <li
                                key={st.id}
                                className="flex flex-row-reverse items-start justify-between gap-2 py-1.5 border-b border-slate-800/80 last:border-0"
                            >
                                <input
                                    type="checkbox"
                                    className="mt-1 h-3.5 w-3.5 accent-emerald-500"
                                    checked={st.isCompleted}
                                    onChange={() => toggleSubTaskComplete(task.id, st.id)}
                                />
                                <div className="flex-1 min-w-0">
                                    <span
                                        className={`text-sm font-semibold block ${st.isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}
                                    >
                                        {st.title}
                                    </span>
                                    <input
                                        key={`${st.id}-${st.location ?? ''}`}
                                        dir="rtl"
                                        type="text"
                                        defaultValue={st.location ?? ''}
                                        placeholder="موقع الفرع (اختياري) — اكتب يدوياً"
                                        onBlur={(e) => {
                                            const v = e.target.value.trim();
                                            setSubTaskLocation(task.id, st.id, v.length > 0 ? v : null);
                                        }}
                                        className="mt-1.5 w-full rounded-md border border-slate-700/90 bg-slate-900/50 px-2 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-emerald-500/35"
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-col gap-2 pt-1">
                        <input
                            dir="rtl"
                            type="text"
                            placeholder="خطوة جديدة…"
                            value={subDraft}
                            onChange={(e) => setSubDraft(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500/40"
                        />
                        <input
                            dir="rtl"
                            type="text"
                            placeholder="موقع الفرع للخطوة الجديدة (اختياري، يدوي)…"
                            value={subNewLocDraft}
                            onChange={(e) => setSubNewLocDraft(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500/40"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const subLoc = subNewLocDraft.trim();
                                addSubTask(task.id, subDraft, subLoc.length > 0 ? subLoc : null);
                                setSubDraft('');
                                setSubNewLocDraft('');
                            }}
                            disabled={!subDraft.trim()}
                            className="text-xs font-extrabold py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white disabled:opacity-40 transition"
                        >
                            إضافة الخطوة
                        </button>
                    </div>
                </div>
            ) : null}

            {panelKind === 'brief' ? (
                <div className="mx-4 mb-4 mr-6 border-r-2 border-violet-500/35 pr-4 pl-2 py-3 bg-slate-950/30 rounded-lg rounded-tr-none text-right space-y-2">
                    <p className="text-[11px] font-bold text-violet-200/90">حقيبة المستندات</p>
                    <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                        {task.documentRequirements.map((d) => (
                            <li key={d.id} className="flex flex-row-reverse items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-600 accent-violet-500"
                                    checked={d.isChecked}
                                    onChange={() => toggleDocumentRequirement(task.id, d.id)}
                                />
                                <span
                                    className={`text-sm flex-1 ${d.isChecked ? 'text-slate-500 line-through' : 'text-slate-200'}`}
                                >
                                    {d.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="flex gap-2 flex-row-reverse">
                        <input
                            dir="rtl"
                            type="text"
                            placeholder="مستند مطلوب…"
                            value={docDraft}
                            onChange={(e) => setDocDraft(e.target.value)}
                            className="flex-1 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-violet-500/40"
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
                </div>
            ) : null}

            {panelKind === 'expense' ? (
                <div className="mx-4 mb-4 mr-6 border-r-2 border-amber-500/35 pr-4 pl-2 py-3 bg-slate-950/30 rounded-lg rounded-tr-none text-right space-y-2">
                    <p className="text-[11px] font-bold text-amber-200/90">مصروفات مسجلة</p>
                    <ul className="space-y-1 text-sm text-slate-300">
                        {task.expenses.map((e) => (
                            <li key={e.id} className="flex flex-row-reverse justify-between gap-2 border-b border-slate-800/60 pb-1">
                                <span className="font-bold text-amber-200/90 tabular-nums">{formatIqd(e.amount)}</span>
                                <span className="text-slate-400 truncate flex-1">{e.label}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="grid gap-2 sm:grid-cols-2 grid-cols-1">
                        <input
                            dir="ltr"
                            type="text"
                            inputMode="decimal"
                            placeholder="50000"
                            value={expAmount}
                            onChange={(e) => setExpAmount(e.target.value)}
                            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-amber-500/40 text-left"
                        />
                        <input
                            dir="rtl"
                            type="text"
                            placeholder="بند (مثلاً: رسم خبير)"
                            value={expLabel}
                            onChange={(e) => setExpLabel(e.target.value)}
                            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-amber-500/40"
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
                </div>
            ) : null}
        </li>
    );
}