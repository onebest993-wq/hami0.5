import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Banknote,
    ClipboardList,
    Flame,
    GitBranch,
    Hourglass,
    MapPinned,
    MoreHorizontal,
    Paperclip,
    Pin,
    ShieldAlert,
    X,
} from 'lucide-react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { useQuantumTasksContext } from '@/app/context/QuantumTasksContext';
import { addDays, isSameLocalDay, startOfLocalDay } from '@/app/utils/nlpParser';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

export type TasksManagerProps = {
    onClose: () => void;
};

const WORK_WEEK = [
    { key: 'sat', label: 'السبت', offset: 0 },
    { key: 'sun', label: 'الأحد', offset: 1 },
    { key: 'mon', label: 'الإثنين', offset: 2 },
    { key: 'tue', label: 'الثلاثاء', offset: 3 },
    { key: 'wed', label: 'الأربعاء', offset: 4 },
    { key: 'thu', label: 'الخميس', offset: 5 },
] as const;

type WeekAddState = {
    dayKey: (typeof WORK_WEEK)[number]['key'];
    step: 'location' | 'actions';
    location: string;
    actionLines: string[];
    lineDraft: string;
} | null;

type DetailPanel = { taskId: string; kind: 'branch' | 'brief' | 'expense' } | null;

function getSaturdayOfWeekContaining(ref: Date): Date {
    const d = startOfLocalDay(ref);
    const dow = d.getDay();
    const daysFromSat = (dow - 6 + 7) % 7;
    const sat = new Date(d);
    sat.setDate(d.getDate() - daysFromSat);
    return startOfLocalDay(sat);
}

function formatShortDate(d: Date): string {
    try {
        return d.toLocaleDateString('ar-IQ', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
        return d.toISOString().slice(0, 10);
    }
}

function formatIqd(n: number): string {
    try {
        return `${new Intl.NumberFormat('ar-IQ').format(n)} د.ع.`;
    } catch {
        return `${n} د.ع.`;
    }
}

function parseAmountInput(s: string): number {
    const n = parseFloat(String(s).replace(/[,\s٬]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function isReminderDue(task: LegalTask, now: Date): boolean {
    if (task.reminderAt === null) return false;
    const today = startOfLocalDay(now).getTime();
    const r = startOfLocalDay(task.reminderAt).getTime();
    return today >= r;
}

function snoozeAfterDays(days: number): Date {
    return addDays(startOfLocalDay(new Date()), days);
}

/** تاريخ محلي من حقل date (yyyy-mm-dd) دون انزياح UTC */
function dateFromYmdInput(ymd: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    if (Number.isNaN(dt.getTime())) return null;
    return startOfLocalDay(dt);
}

type TaskCardProps = {
    task: LegalTask;
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

function TaskCard({
    task,
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

export const TasksManager: React.FC<TasksManagerProps> = ({ onClose }) => {
    const {
        pendingTasks,
        addWeeklyLocationBundle,
        addSnoozedBacklogTask,
        updateTask,
        deleteTask,
        completeTask,
        toggleTaskFatalDeadline,
        toggleTaskPinnedToFieldCurtain,
        setTaskLocation,
        addSubTask,
        toggleSubTaskComplete,
        setSubTaskLocation,
        addDocumentRequirement,
        toggleDocumentRequirement,
        addExpense,
    } = useQuantumTasksContext();

    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 60_000);
        return () => window.clearInterval(id);
    }, []);

    const [fatalConfirmId, setFatalConfirmId] = useState<string | null>(null);
    const [weekAdd, setWeekAdd] = useState<WeekAddState>(null);
    const [locationPickFor, setLocationPickFor] = useState<string | null>(null);
    const [detailPanel, setDetailPanel] = useState<DetailPanel>(null);

    const [snoozePanelOpen, setSnoozePanelOpen] = useState(false);
    const [snoozeTitle, setSnoozeTitle] = useState('');
    const [snoozeCustomIso, setSnoozeCustomIso] = useState('');

    const [reminderModalTaskId, setReminderModalTaskId] = useState<string | null>(null);
    const [reminderSnoozeCustom, setReminderSnoozeCustom] = useState('');

    const [editOpen, setEditOpen] = useState(false);
    const [editTaskId, setEditTaskId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editLocation, setEditLocation] = useState('');

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const fatalTasks = useMemo(() => pendingTasks.filter((t) => t.isFatalDeadline), [pendingTasks]);

    const weeklyDayBlocks = useMemo(() => {
        const weekStart = getSaturdayOfWeekContaining(new Date());
        return WORK_WEEK.map((d) => {
            const dayDate = addDays(weekStart, d.offset);
            const tasksThisDay = pendingTasks.filter(
                (t) =>
                    !t.isFatalDeadline &&
                    t.parsedDate !== null &&
                    isSameLocalDay(t.parsedDate, dayDate),
            );
            return { ...d, dayDate, tasks: tasksThisDay };
        });
    }, [pendingTasks]);

    const distantTasks = useMemo(() => {
        const ws = getSaturdayOfWeekContaining(new Date());
        const we = addDays(ws, 5);
        const wsT = ws.getTime();
        const weT = we.getTime();
        return pendingTasks.filter((t) => {
            if (t.isFatalDeadline) return false;
            if (t.parsedDate === null) return true;
            const pt = startOfLocalDay(t.parsedDate).getTime();
            return pt < wsT || pt > weT;
        });
    }, [pendingTasks]);

    const reminderModalTask = useMemo(
        () => (reminderModalTaskId ? pendingTasks.find((t) => t.id === reminderModalTaskId) ?? null : null),
        [pendingTasks, reminderModalTaskId],
    );

    const editTarget = useMemo(
        () => (editTaskId ? pendingTasks.find((t) => t.id === editTaskId) ?? null : null),
        [pendingTasks, editTaskId],
    );

    const onCompleteRequest = useCallback(
        (task: LegalTask) => {
            if (task.isFatalDeadline) {
                setFatalConfirmId(task.id);
                return;
            }
            completeTask(task.id);
        },
        [completeTask],
    );

    const confirmFatalComplete = useCallback(() => {
        if (fatalConfirmId === null) return;
        completeTask(fatalConfirmId);
        setFatalConfirmId(null);
    }, [fatalConfirmId, completeTask]);

    const openWeekAdd = (dayKey: (typeof WORK_WEEK)[number]['key']) => {
        setWeekAdd((cur) =>
            cur?.dayKey === dayKey
                ? null
                : { dayKey, step: 'location', location: '', actionLines: [], lineDraft: '' },
        );
    };

    const saveWeekBundle = (dayKey: (typeof WORK_WEEK)[number]['key']) => {
        if (!weekAdd || weekAdd.dayKey !== dayKey || weekAdd.step !== 'actions') return;
        const lines = [...weekAdd.actionLines];
        const last = weekAdd.lineDraft.trim();
        if (last) lines.push(last);
        if (!weekAdd.location.trim() || lines.length === 0) return;
        const weekStart = getSaturdayOfWeekContaining(new Date());
        const d = WORK_WEEK.find((x) => x.key === dayKey);
        if (!d) return;
        const scheduledFor = addDays(weekStart, d.offset);
        addWeeklyLocationBundle(scheduledFor, weekAdd.location.trim(), lines);
        setWeekAdd(null);
    };

    const applySnoozeChoice = (afterDays: number | null, customIso?: string) => {
        const t = snoozeTitle.trim();
        if (!t) return;
        let when: Date;
        if (afterDays !== null) {
            when = snoozeAfterDays(afterDays);
        } else if (customIso) {
            const parsed = dateFromYmdInput(customIso);
            if (!parsed) return;
            when = parsed;
        } else {
            return;
        }
        addSnoozedBacklogTask(t, when, null);
        setSnoozeTitle('');
        setSnoozeCustomIso('');
        setSnoozePanelOpen(false);
    };

    const openEdit = (task: LegalTask) => {
        setEditTaskId(task.id);
        setEditTitle(task.title);
        setEditLocation(task.location ?? '');
        setEditOpen(true);
    };

    const saveEdit = () => {
        if (!editTaskId) return;
        const title = editTitle.trim();
        if (!title) return;
        const loc = editLocation.trim();
        updateTask(editTaskId, {
            title,
            rawText: title,
            location: loc.length > 0 ? loc : null,
        });
        setEditOpen(false);
        setEditTaskId(null);
    };

    const requestDelete = (task: LegalTask) => {
        setDeleteConfirmId(task.id);
    };

    const confirmDelete = () => {
        if (deleteConfirmId === null) return;
        const id = deleteConfirmId;
        deleteTask(id);
        setDeleteConfirmId(null);
        setDetailPanel((p) => (p?.taskId === id ? null : p));
    };

    const renderTaskCard = (t: LegalTask, fatalPulse: boolean, listKey?: string) => (
        <TaskCard
            key={listKey ?? t.id}
            task={t}
            now={now}
            onCompleteRequest={onCompleteRequest}
            onToggleFatal={toggleTaskFatalDeadline}
            onTogglePin={toggleTaskPinnedToFieldCurtain}
            onSetLocation={setTaskLocation}
            locationPickFor={locationPickFor}
            onToggleLocationPicker={setLocationPickFor}
            fatalPulse={fatalPulse}
            detailPanel={detailPanel}
            setDetailPanel={setDetailPanel}
            addSubTask={addSubTask}
            toggleSubTaskComplete={toggleSubTaskComplete}
            setSubTaskLocation={setSubTaskLocation}
            addDocumentRequirement={addDocumentRequirement}
            toggleDocumentRequirement={toggleDocumentRequirement}
            addExpense={addExpense}
            onEditRequest={openEdit}
            onDeleteRequest={requestDelete}
            onReminderBadgeClick={(task) => setReminderModalTaskId(task.id)}
        />
    );

    const weekStartLive = getSaturdayOfWeekContaining(new Date());

    return (
        <div className="fixed inset-0 z-[220] flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 font-['Tajawal','Cairo',sans-serif]">
            <Dialog
                open={fatalConfirmId !== null}
                onOpenChange={(open) => {
                    if (!open) setFatalConfirmId(null);
                }}
            >
                <DialogContent className="border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md [&]:translate-x-[-50%] [&]:translate-y-[-50%]">
                    <DialogHeader className="text-right sm:text-right space-y-2">
                        <DialogTitle className="text-rose-200 text-base font-extrabold">موعد حتمي</DialogTitle>
                        <DialogDescription className="text-slate-300 text-sm leading-relaxed">
                            هذا الإجراء مرتبط بسقوط حق أو أجل قطعي. هل تأكدت من إنجازه قبل التحويد؟
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
                        <button
                            type="button"
                            onClick={confirmFatalComplete}
                            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-colors"
                        >
                            تأكيد الإكمال
                        </button>
                        <button
                            type="button"
                            onClick={() => setFatalConfirmId(null)}
                            className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-slate-200 text-xs font-bold"
                        >
                            إلغاء
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteConfirmId !== null} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
                <DialogContent className="border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md [&]:translate-x-[-50%] [&]:translate-y-[-50%]">
                    <DialogHeader className="text-right space-y-2">
                        <DialogTitle className="text-rose-200 text-base font-extrabold">حذف المهمة</DialogTitle>
                        <DialogDescription className="text-slate-300 text-sm leading-relaxed">
                            لن يُمكن استرجاع البيانات بعد الحذف. هل تريد المتابعة؟
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
                        <button
                            type="button"
                            onClick={confirmDelete}
                            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold"
                        >
                            حذف نهائياً
                        </button>
                        <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-slate-200 text-xs font-bold"
                        >
                            إلغاء
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={editOpen}
                onOpenChange={(o) => {
                    if (!o) {
                        setEditOpen(false);
                        setEditTaskId(null);
                    }
                }}
            >
                <DialogContent className="border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md [&]:translate-x-[-50%] [&]:translate-y-[-50%]">
                    <DialogHeader className="text-right space-y-2">
                        <DialogTitle className="text-slate-100 text-base font-extrabold">✏️ تعديل المهمة</DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            {editTarget ? `المعرّف: ${editTarget.id.slice(0, 8)}…` : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-right py-2">
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">عنوان المهمة</label>
                            <input
                                dir="rtl"
                                className="w-full rounded-xl border border-slate-600 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500/50"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">المحكمة / الدائرة (اختياري)</label>
                            <input
                                dir="rtl"
                                className="w-full rounded-xl border border-slate-600 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
                                value={editLocation}
                                onChange={(e) => setEditLocation(e.target.value)}
                                placeholder="اسم المحكمة أو الدائرة إن وُجد"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
                        <button
                            type="button"
                            onClick={saveEdit}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold"
                        >
                            حفظ
                        </button>
                        <button
                            type="button"
                            onClick={() => (setEditOpen(false), setEditTaskId(null))}
                            className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-slate-200 text-xs font-bold"
                        >
                            إلغاء
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={reminderModalTaskId !== null} onOpenChange={(o) => !o && setReminderModalTaskId(null)}>
                <DialogContent className="border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md [&]:translate-x-[-50%] [&]:translate-y-[-50%]">
                    <DialogHeader className="text-right space-y-2">
                        <DialogTitle className="text-amber-100 text-base font-extrabold leading-relaxed">
                            حان وقت التخطيط لهذه المهمة
                        </DialogTitle>
                        <DialogDescription className="text-slate-300 text-sm font-semibold">
                            {reminderModalTask?.title ?? ''}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-right py-1">
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 mb-2">نقل إلى يوم محدد (الأسبوع الحالي)</p>
                            <div className="flex flex-col gap-2">
                                {WORK_WEEK.map((d) => {
                                    const dayDate = addDays(weekStartLive, d.offset);
                                    return (
                                        <button
                                            key={d.key}
                                            type="button"
                                            onClick={() => {
                                                if (!reminderModalTaskId) return;
                                                updateTask(reminderModalTaskId, {
                                                    parsedDate: dayDate,
                                                    reminderAt: null,
                                                });
                                                setReminderModalTaskId(null);
                                            }}
                                            className="w-full rounded-xl border border-slate-600 bg-slate-800/50 py-2.5 text-xs font-extrabold text-slate-100 hover:border-amber-500/40"
                                        >
                                            {d.label} — {formatShortDate(dayDate)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="pt-2 border-t border-slate-700/70">
                            <p className="text-[11px] font-bold text-slate-500 mb-2">⏳ تأجيل مجدداً</p>
                            <div className="flex flex-row-reverse flex-wrap gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!reminderModalTaskId) return;
                                        updateTask(reminderModalTaskId, { reminderAt: snoozeAfterDays(7) });
                                        setReminderModalTaskId(null);
                                    }}
                                    className="text-[10px] font-extrabold px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:border-amber-500/40"
                                >
                                    أسبوع
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!reminderModalTaskId) return;
                                        updateTask(reminderModalTaskId, { reminderAt: snoozeAfterDays(14) });
                                        setReminderModalTaskId(null);
                                    }}
                                    className="text-[10px] font-extrabold px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:border-amber-500/40"
                                >
                                    أسبوعين
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!reminderModalTaskId) return;
                                        updateTask(reminderModalTaskId, { reminderAt: snoozeAfterDays(30) });
                                        setReminderModalTaskId(null);
                                    }}
                                    className="text-[10px] font-extrabold px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:border-amber-500/40"
                                >
                                    شهر
                                </button>
                            </div>
                            <div className="mt-3 flex flex-row-reverse flex-wrap gap-2 items-center justify-end">
                                <input
                                    type="date"
                                    className="rounded-lg border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-100"
                                    value={reminderSnoozeCustom}
                                    onChange={(e) => setReminderSnoozeCustom(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!reminderModalTaskId || !reminderSnoozeCustom) return;
                                        const parsed = dateFromYmdInput(reminderSnoozeCustom);
                                        if (!parsed) return;
                                        updateTask(reminderModalTaskId, {
                                            reminderAt: parsed,
                                        });
                                        setReminderSnoozeCustom('');
                                        setReminderModalTaskId(null);
                                    }}
                                    className="text-[10px] font-extrabold px-3 py-1.5 rounded-lg bg-amber-600/80 text-white"
                                >
                                    مخصص
                                </button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <header className="shrink-0 border-b border-slate-800/80 px-5 py-5 flex items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-xl">
                <div className="flex items-center gap-3 min-w-0 flex-row-reverse">
                    <div className="w-12 h-12 rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-md flex items-center justify-center text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                        <ClipboardList size={24} />
                    </div>
                    <div className="min-w-0 text-right">
                        <h1 className="text-slate-50 font-extrabold text-xl truncate tracking-tight">أجندة المهام</h1>
                        <p className="text-slate-500 text-xs font-medium mt-1">مخطط أسبوعي وتخطيط لاحق — موحّد مع ستارة الميدان</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 w-11 h-11 rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-md flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-500 transition-all"
                    aria-label="إغلاق"
                >
                    <X size={22} />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-6 pb-16 max-w-3xl mx-auto w-full space-y-10">
                <section
                    className={
                        fatalTasks.length === 0
                            ? 'rounded-xl border border-rose-900/40 bg-rose-950/10 px-5 py-4'
                            : 'rounded-2xl border border-rose-500/45 bg-rose-950/20 backdrop-blur-md px-5 py-6 shadow-[0_0_40px_rgba(244,63,94,0.18)]'
                    }
                    aria-labelledby="fatal-deadlines-heading"
                >
                    <h2
                        id="fatal-deadlines-heading"
                        className={`font-extrabold flex flex-row-reverse items-center gap-2 mb-3 ${
                            fatalTasks.length === 0 ? 'text-sm text-rose-200/80' : 'text-lg text-rose-100'
                        }`}
                    >
                        <ShieldAlert
                            className={`shrink-0 ${fatalTasks.length === 0 ? 'size-4 text-rose-400/80' : 'size-6 text-rose-400'}`}
                            aria-hidden
                        />
                        مواعيد حتمية قاطعة
                    </h2>
                    {fatalTasks.length === 0 ? (
                        <span className="text-slate-500 text-sm font-medium block text-center py-2">
                            ✅ لا توجد مواعيد حتمية قريبة.
                        </span>
                    ) : (
                        <ul className="space-y-4 mt-2">{fatalTasks.map((t) => renderTaskCard(t, true))}</ul>
                    )}
                </section>

                {weeklyDayBlocks.map((block) => (
                    <article
                        key={block.key}
                        className="bg-slate-800/40 backdrop-blur-md border border-slate-700/45 rounded-2xl p-6 mb-2 shadow-xl shadow-black/20 hover:border-slate-600/70 transition-all duration-300"
                    >
                        <header className="flex flex-row-reverse items-center justify-between gap-3 mb-5 flex-wrap">
                            <div className="text-right">
                                <h3 className="text-slate-50 font-extrabold text-lg tracking-tight">{block.label}</h3>
                                <p className="text-slate-500 text-xs font-semibold mt-1.5">{formatShortDate(block.dayDate)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => openWeekAdd(block.key)}
                                className="text-xs font-extrabold px-4 py-2 rounded-xl border border-slate-600/80 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:border-amber-500/35 transition"
                            >
                                + إضافة مهمة
                            </button>
                        </header>

                        {weekAdd?.dayKey === block.key ? (
                            <div className="mb-5 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4 space-y-4">
                                {weekAdd.step === 'location' ? (
                                    <>
                                        <p className="text-[11px] font-bold text-amber-200/90 text-right leading-relaxed">
                                            📍 حدد المحكمة أو الدائرة أولاً
                                        </p>
                                        <input
                                            dir="rtl"
                                            type="text"
                                            autoFocus
                                            placeholder="اكتب اسم المحكمة أو الدائرة يدوياً…"
                                            value={weekAdd.location}
                                            onChange={(e) =>
                                                setWeekAdd((w) =>
                                                    w && w.dayKey === block.key ? { ...w, location: e.target.value } : w,
                                                )
                                            }
                                            className="w-full rounded-xl border border-slate-600/80 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-500/40"
                                        />
                                        <div className="flex flex-row-reverse gap-2 justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setWeekAdd(null)}
                                                className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-600 text-slate-400"
                                            >
                                                إلغاء
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!weekAdd.location.trim()}
                                                onClick={() =>
                                                    setWeekAdd((w) =>
                                                        w && w.dayKey === block.key ? { ...w, step: 'actions' } : w,
                                                    )
                                                }
                                                className="text-xs font-extrabold px-4 py-2 rounded-lg bg-emerald-600/85 text-white disabled:opacity-40"
                                            >
                                                متابعة
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-[10px] font-bold text-slate-500 text-right">
                                            الموضع:{' '}
                                            <span className="text-emerald-200">{weekAdd.location.trim()}</span>
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setWeekAdd((w) =>
                                                    w && w.dayKey === block.key ? { ...w, step: 'location' } : w,
                                                )
                                            }
                                            className="text-[10px] font-bold text-amber-200/90 underline-offset-4 hover:underline"
                                        >
                                            تعديل الموقع
                                        </button>
                                        <p className="text-[11px] font-bold text-slate-300 text-right">إجراءات متعددة لنفس المحكمة</p>
                                        <ul className="max-h-36 overflow-y-auto space-y-2 pr-1 text-right">
                                            {weekAdd.actionLines.map((line, idx) => (
                                                <li
                                                    key={`${idx}-${line}`}
                                                    className="flex flex-row-reverse items-center justify-between gap-2 rounded-lg border border-slate-700/60 bg-slate-950/30 px-3 py-2 text-sm text-slate-100"
                                                >
                                                    <span className="tabular-nums text-slate-500 text-[11px] font-bold">{idx + 1}.</span>
                                                    <span className="flex-1 font-semibold">{line}</span>
                                                    <button
                                                        type="button"
                                                        className="text-[10px] font-bold text-rose-300 px-1"
                                                        onClick={() =>
                                                            setWeekAdd((w) => {
                                                                if (!w || w.dayKey !== block.key) return w;
                                                                const next = [...w.actionLines];
                                                                next.splice(idx, 1);
                                                                return { ...w, actionLines: next };
                                                            })
                                                        }
                                                    >
                                                        ×
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="flex flex-row-reverse gap-2 flex-wrap">
                                            <input
                                                dir="rtl"
                                                type="text"
                                                placeholder="إجراء جديد (مثال: دفع رسم، تصوير قرار…)"
                                                value={weekAdd.lineDraft}
                                                onChange={(e) =>
                                                    setWeekAdd((w) =>
                                                        w && w.dayKey === block.key ? { ...w, lineDraft: e.target.value } : w,
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key !== 'Enter') return;
                                                    e.preventDefault();
                                                    const v = weekAdd.lineDraft.trim();
                                                    if (!v) return;
                                                    setWeekAdd((w) => {
                                                        if (!w || w.dayKey !== block.key) return w;
                                                        return {
                                                            ...w,
                                                            actionLines: [...w.actionLines, v],
                                                            lineDraft: '',
                                                        };
                                                    });
                                                }}
                                                className="flex-1 min-w-[10rem] rounded-xl border border-slate-600/80 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-sky-500/40"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const v = weekAdd.lineDraft.trim();
                                                    if (!v) return;
                                                    setWeekAdd((w) => {
                                                        if (!w || w.dayKey !== block.key) return w;
                                                        return {
                                                            ...w,
                                                            actionLines: [...w.actionLines, v],
                                                            lineDraft: '',
                                                        };
                                                    });
                                                }}
                                                className="shrink-0 px-4 py-2 rounded-xl bg-sky-600/85 text-white text-xs font-extrabold"
                                            >
                                                إضافة
                                            </button>
                                        </div>
                                        <div className="flex flex-row-reverse gap-2 justify-end pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setWeekAdd(null)}
                                                className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-600 text-slate-400"
                                            >
                                                إلغاء
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => saveWeekBundle(block.key)}
                                                disabled={
                                                    weekAdd.actionLines.length === 0 && !weekAdd.lineDraft.trim()
                                                }
                                                className="text-xs font-extrabold px-4 py-2 rounded-lg bg-amber-600/85 text-white disabled:opacity-40"
                                            >
                                                حفظ المهام
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : null}

                        <ul className="space-y-4">{block.tasks.map((t) => renderTaskCard(t, false))}</ul>
                    </article>
                ))}

                <section className="mt-12 pt-4 border-t border-slate-800/90">
                    <h2 className="text-lg font-extrabold text-slate-400 flex flex-row-reverse items-center gap-2 mb-5">
                        <Hourglass className="size-5 text-slate-500 shrink-0" aria-hidden />
                        المهام البعيدة وغير المجدولة
                    </h2>
                    <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/35 backdrop-blur-sm px-5 py-6 space-y-5">
                        <div className="flex flex-row-reverse flex-wrap items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => setSnoozePanelOpen((o) => !o)}
                                className="text-xs font-extrabold px-4 py-2 rounded-xl border border-amber-500/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15 transition"
                            >
                                + إضافة مهمة مؤجلة
                            </button>
                            <p className="text-[11px] text-slate-500 text-right max-w-md leading-relaxed">
                                ⏳ ذكرني بعد: أسبوع، أسبوعين، شهر، أو تاريخ مخصص — يظهر تنبيه عند حلول الموعد.
                            </p>
                        </div>

                        {snoozePanelOpen ? (
                            <div className="rounded-xl border border-slate-700/50 bg-slate-950/30 p-4 space-y-4">
                                <input
                                    dir="rtl"
                                    type="text"
                                    placeholder="عنوان المهمة المؤجلة…"
                                    value={snoozeTitle}
                                    onChange={(e) => setSnoozeTitle(e.target.value)}
                                    className="w-full rounded-xl border border-slate-600 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500/40"
                                />
                                <div className="flex flex-row-reverse flex-wrap gap-2 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => applySnoozeChoice(7)}
                                        className="text-[10px] font-extrabold px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:border-amber-500/40"
                                    >
                                        أسبوع
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applySnoozeChoice(14)}
                                        className="text-[10px] font-extrabold px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:border-amber-500/40"
                                    >
                                        أسبوعين
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applySnoozeChoice(30)}
                                        className="text-[10px] font-extrabold px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:border-amber-500/40"
                                    >
                                        شهر
                                    </button>
                                </div>
                                <div className="flex flex-row-reverse flex-wrap gap-2 items-center justify-end">
                                    <input
                                        type="date"
                                        className="rounded-lg border border-slate-600 bg-slate-900/60 px-2 py-2 text-xs text-slate-100"
                                        value={snoozeCustomIso}
                                        onChange={(e) => setSnoozeCustomIso(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => applySnoozeChoice(null, snoozeCustomIso)}
                                        disabled={!snoozeTitle.trim() || !snoozeCustomIso}
                                        className="text-[10px] font-extrabold px-3 py-2 rounded-lg bg-amber-600/80 text-white disabled:opacity-40"
                                    >
                                        مخصص — حفظ
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {distantTasks.length === 0 ? (
                            <p className="text-slate-600 text-sm text-center font-medium py-8">
                                لا مهام هامشية — أسبوعك نظيف.
                            </p>
                        ) : (
                            <ul className="space-y-4">{distantTasks.map((t) => renderTaskCard(t, false))}</ul>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};
