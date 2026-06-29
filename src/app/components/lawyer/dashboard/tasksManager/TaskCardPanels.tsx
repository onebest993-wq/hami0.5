import React, { useState } from 'react';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import type { DocumentRequirementItem, LegalSubTask, TaskExpenseEntry } from '@/app/types/TaskEngine';
import { formatIqd, parseAmountInput } from './utils';
import { TASKS_INPUT } from './tasksBoucleTheme';

export type TaskCardBranchPanelProps = {
    subTasks: LegalSubTask[];
    branchOpen: boolean;
    addStepOpen: boolean;
    readOnly: boolean;
    onToggleSection: () => void;
    onOpenAddStep: () => void;
    onCloseAddStep: () => void;
    onAddSubTask: (title: string, location: string | null) => void;
    onToggleSubComplete: (subId: string) => void;
};

export function TaskCardBranchPanel({
    subTasks,
    branchOpen,
    addStepOpen,
    readOnly,
    onToggleSection,
    onOpenAddStep,
    onCloseAddStep,
    onAddSubTask,
    onToggleSubComplete,
}: TaskCardBranchPanelProps) {
    const [subDraft, setSubDraft] = useState('');
    const [subNewLocDraft, setSubNewLocDraft] = useState('');
    const hasSubTasks = subTasks.length > 0;

    const commitNewSubTask = () => {
        const trimmed = subDraft.trim();
        if (!trimmed) return false;
        const subLoc = subNewLocDraft.trim();
        onAddSubTask(trimmed, subLoc.length > 0 ? subLoc : null);
        setSubDraft('');
        setSubNewLocDraft('');
        return true;
    };

    return (
        <div className="mx-3 mb-3 border-r-2 border-emerald-500/35 pr-2.5 py-2 bg-[#0c0c0e]/35 rounded-lg rounded-tr-none text-right">
            <button
                type="button"
                onClick={onToggleSection}
                className="w-full min-h-[44px] flex flex-row-reverse items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-slate-800/40 transition touch-manipulation"
                aria-expanded={branchOpen}
            >
                <span className="text-[11px] font-bold text-emerald-200/90">
                    مسار إجرائي متفرع
                    {hasSubTasks ? ` (${subTasks.length})` : ''}
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
                            {subTasks.map((st, idx) => (
                                <li
                                    key={st.id}
                                    className={`rounded-lg border px-2.5 py-1.5 flex flex-row items-center gap-2 ${
                                        st.isCompleted
                                            ? 'border-emerald-500/25 bg-emerald-950/15'
                                            : 'border-[#A67C52]/18 bg-slate-900/35'
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
                                            onClick={() => onToggleSubComplete(st.id)}
                                            className="shrink-0 min-h-[44px] px-3 py-1 rounded-md bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/45 text-white text-[10px] font-extrabold transition whitespace-nowrap touch-manipulation"
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
                        <div className="border-t border-[#A67C52]/20 pt-2 space-y-1.5">
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
                                className={`w-full min-h-[44px] ${TASKS_INPUT}`}
                            />
                            <input
                                dir="rtl"
                                type="text"
                                placeholder="موقع الفرع (اختياري)…"
                                value={subNewLocDraft}
                                onChange={(e) => setSubNewLocDraft(e.target.value)}
                                className={`w-full min-h-[44px] ${TASKS_INPUT} text-[11px]`}
                            />
                            <div className="flex flex-row-reverse gap-1.5 pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => commitNewSubTask()}
                                    disabled={!subDraft.trim()}
                                    className={`flex-1 min-h-[44px] py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-extrabold disabled:opacity-40 transition touch-manipulation`}
                                >
                                    إضافة الخطوة
                                </button>
                                <button
                                    type="button"
                                    onClick={onCloseAddStep}
                                    className="flex-1 min-h-[44px] py-1.5 rounded-lg border border-slate-600/80 bg-slate-800/60 text-slate-200 text-xs font-extrabold hover:bg-slate-800 transition touch-manipulation"
                                >
                                    حفظ
                                </button>
                            </div>
                        </div>
                    ) : !readOnly ? (
                        <button
                            type="button"
                            onClick={onOpenAddStep}
                            className="mt-1 w-full min-h-[44px] py-1.5 rounded-lg border border-dashed border-emerald-500/35 text-emerald-200/90 text-[11px] font-extrabold hover:bg-emerald-950/20 transition touch-manipulation"
                        >
                            + إضافة خطوة
                        </button>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}

export type TaskCardDocPanelProps = {
    taskId: string;
    items: DocumentRequirementItem[];
    readOnly: boolean;
    onToggle: (itemId: string) => void;
    onAdd: (text: string) => void;
};

export function TaskCardDocPanel({ items, readOnly, onToggle, onAdd }: TaskCardDocPanelProps) {
    const [docDraft, setDocDraft] = useState('');

    return (
        <div className="mx-3.5 mb-3.5 mr-5 border-r-2 border-violet-500/35 pr-3 py-2.5 bg-[#0c0c0e]/35 rounded-lg rounded-tr-none text-right space-y-2">
            <p className="text-[11px] font-bold text-violet-200/90">حقيبة المستندات</p>
            <ul className="space-y-1.5 max-h-36 overflow-y-auto overscroll-y-contain">
                {items.map((d) => (
                    <li key={d.id} className="flex flex-row-reverse items-center gap-2 min-h-[44px]">
                        <input
                            type="checkbox"
                            className="rounded border-slate-600 accent-violet-500 size-5 touch-manipulation"
                            checked={d.isChecked}
                            disabled={readOnly}
                            onChange={() => !readOnly && onToggle(d.id)}
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
                        className={`flex-1 min-h-[44px] ${TASKS_INPUT}`}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            onAdd(docDraft);
                            setDocDraft('');
                        }}
                        disabled={!docDraft.trim()}
                        className="shrink-0 min-h-[44px] min-w-[44px] px-3 rounded-lg bg-violet-600/85 text-white text-xs font-extrabold disabled:opacity-40 touch-manipulation"
                    >
                        +
                    </button>
                </div>
            ) : null}
        </div>
    );
}

export type TaskCardExpensePanelProps = {
    expenses: TaskExpenseEntry[];
    readOnly: boolean;
    onAdd: (amount: number, label: string) => void;
};

export function TaskCardExpensePanel({ expenses, readOnly, onAdd }: TaskCardExpensePanelProps) {
    const [expAmount, setExpAmount] = useState('');
    const [expLabel, setExpLabel] = useState('');

    return (
        <div className="mx-3.5 mb-3.5 mr-5 border-r-2 border-amber-500/35 pr-3 py-2.5 bg-[#0c0c0e]/35 rounded-lg rounded-tr-none text-right space-y-2">
            <p className="text-[11px] font-bold text-amber-200/90">مصروفات مسجلة</p>
            <ul className="space-y-1 text-sm text-slate-300">
                {expenses.map((e) => (
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
                            className={`min-h-[44px] ${TASKS_INPUT} text-left`}
                        />
                        <input
                            dir="rtl"
                            type="text"
                            placeholder="بند (مثلاً: رسم خبير)"
                            value={expLabel}
                            onChange={(e) => setExpLabel(e.target.value)}
                            className={`min-h-[44px] ${TASKS_INPUT}`}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const amt = parseAmountInput(expAmount);
                            if (amt <= 0) return;
                            onAdd(amt, expLabel);
                            setExpAmount('');
                            setExpLabel('');
                        }}
                        className="w-full min-h-[44px] py-2 rounded-lg bg-amber-600/85 hover:bg-amber-600 text-white text-xs font-extrabold transition touch-manipulation"
                    >
                        حفظ المصروف
                    </button>
                </>
            ) : null}
        </div>
    );
}
