import React, { useState } from 'react';
import { ChevronDown, GitBranch, MapPinned, Plus } from '@/app/components/ui/lucideIcons';
import type { DocumentRequirementItem, LegalSubTask, TaskExpenseEntry } from '@/app/types/TaskEngine';
import { formatIqd, parseAmountInput } from './utils';
import { TASKS_INPUT, TASKS_INNER_GLASS, TASKS_INNER_GLASS_SOFT, TASKS_INNER_GLASS_HOVER } from './tasksBoucleTheme';
import { TaskRingToggle } from './TaskRingToggle';

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
        <div className={`mx-3 mb-3 rounded-xl border border-sky-500/22 ${TASKS_INNER_GLASS_SOFT} overflow-hidden text-right`}>
            <button
                type="button"
                onClick={onToggleSection}
                className="w-full min-h-[44px] flex flex-row-reverse items-center justify-between gap-2 px-3 py-2.5 border-b border-sky-500/15 bg-sky-500/6 hover:bg-sky-500/10 transition touch-manipulation"
                aria-expanded={branchOpen}
            >
                <span className="text-[11px] font-extrabold text-sky-200/95 flex flex-row-reverse items-center gap-1.5">
                    <GitBranch className="size-3.5 shrink-0 opacity-90" aria-hidden />
                    مسار إجرائي متفرع
                    {hasSubTasks ? ` (${subTasks.length})` : ''}
                </span>
                <ChevronDown
                    className={`size-4 text-sky-300/75 shrink-0 transition-transform duration-200 ${
                        branchOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                />
            </button>

            {branchOpen ? (
                <div className="px-3 py-2.5 space-y-2">
                    {hasSubTasks ? (
                        <ul className="space-y-1.5">
                            {subTasks.map((st, idx) => (
                                <li
                                    key={st.id}
                                    className={`rounded-lg border px-2.5 py-2 flex flex-row-reverse items-start gap-2 ${
                                        st.isCompleted
                                            ? 'border-[#059669]/30 bg-[#059669]/8'
                                            : `border-[#E6C673]/18 ${TASKS_INNER_GLASS_SOFT}`
                                    }`}
                                >
                                    <span className="text-[10px] font-bold text-[#E6C673]/55 tabular-nums shrink-0 pt-0.5">
                                        {idx + 1}.
                                    </span>
                                    <div className="flex-1 min-w-0 text-right">
                                        <span
                                            className={`block text-sm font-bold leading-snug break-words ${
                                                st.isCompleted
                                                    ? 'text-[#34D399]/55 line-through'
                                                    : 'text-[#F4F4F5]'
                                            }`}
                                        >
                                            {st.title}
                                        </span>
                                        {st.location ? (
                                            <p className="mt-1 text-[10px] font-semibold text-[#34D399]/90 flex flex-row-reverse items-center gap-1 justify-end">
                                                <MapPinned className="size-3 shrink-0 opacity-75" aria-hidden />
                                                {st.location}
                                            </p>
                                        ) : (
                                            <p className="mt-0.5 text-[10px] font-medium text-[#F4F4F5]/30 italic">
                                                بدون موقع فرعي
                                            </p>
                                        )}
                                    </div>
                                    {st.isCompleted ? (
                                        <TaskRingToggle
                                            checked
                                            disabled={readOnly}
                                            label={`إلغاء إنجاز: ${st.title}`}
                                            onToggle={() => onToggleSubComplete(st.id)}
                                            tone="sky"
                                            size="sm"
                                        />
                                    ) : readOnly ? null : (
                                        <TaskRingToggle
                                            checked={false}
                                            label={`إنجاز: ${st.title}`}
                                            onToggle={() => onToggleSubComplete(st.id)}
                                            tone="sky"
                                            size="sm"
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : !addStepOpen ? (
                        <p className="text-[11px] text-[#F4F4F5]/45 py-1">لا توجد خطوات فرعية بعد.</p>
                    ) : null}

                    {!readOnly && addStepOpen ? (
                        <div className={`rounded-lg border border-sky-500/18 ${TASKS_INNER_GLASS_SOFT} p-2.5 space-y-1.5`}>
                            <input
                                dir="rtl"
                                type="text"
                                placeholder="خطوة فرعية جديدة…"
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
                                    className="flex-1 min-h-[44px] py-1.5 rounded-full bg-[#059669]/85 hover:bg-[#059669] text-white text-xs font-extrabold disabled:opacity-40 transition touch-manipulation"
                                >
                                    إضافة
                                </button>
                                <button
                                    type="button"
                                    onClick={onCloseAddStep}
                                    className={`flex-1 min-h-[44px] py-1.5 rounded-full border border-[#E6C673]/22 ${TASKS_INNER_GLASS_SOFT} text-[#F4F4F5]/82 text-xs font-extrabold ${TASKS_INNER_GLASS_HOVER} transition touch-manipulation`}
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    ) : !readOnly ? (
                        <button
                            type="button"
                            onClick={onOpenAddStep}
                            className="w-full min-h-[44px] py-2 rounded-full border border-dashed border-sky-500/30 text-sky-200/90 text-[11px] font-extrabold hover:bg-sky-500/8 transition touch-manipulation flex flex-row-reverse items-center justify-center gap-1"
                        >
                            <Plus className="size-3.5 shrink-0" aria-hidden />
                            إضافة خطوة فرعية
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

export type TaskCardDocPanelProps = {
    taskId: string;
    items: DocumentRequirementItem[];
    readOnly: boolean;
    embedded?: boolean;
    showAdd?: boolean;
    onToggle: (itemId: string) => void;
    onAdd: (text: string) => void;
};

export function TaskCardDocPanel({
    items,
    readOnly,
    embedded = false,
    showAdd = true,
    onToggle,
    onAdd,
}: TaskCardDocPanelProps) {
    const [docDraft, setDocDraft] = useState('');
    const openCount = items.filter((d) => !d.isChecked).length;

    return (
        <div
            className={
                embedded
                    ? 'text-right space-y-1.5'
                    : `mx-3.5 mb-3.5 mr-5 border-r-2 border-violet-500/35 pr-3 py-2.5 ${TASKS_INNER_GLASS_SOFT} rounded-lg rounded-tr-none text-right space-y-2`
            }
        >
            {embedded && items.length > 0 ? (
                <p className="text-[10px] font-bold text-violet-200/75 flex flex-row-reverse items-center justify-between gap-2 px-0.5">
                    <span>الطلبات</span>
                    <span className="tabular-nums text-violet-300/60">
                        {openCount > 0 ? `${openCount} متبق` : 'مكتمل'}
                    </span>
                </p>
            ) : !embedded ? (
                <p className="text-[11px] font-bold text-violet-200/90">حقيبة المستندات</p>
            ) : null}
            {items.length > 0 ? (
                <ul className="space-y-0.5 max-h-32 overflow-y-auto overscroll-y-contain">
                    {items.map((d, idx) => (
                        <li
                            key={d.id}
                            className={`flex flex-row-reverse items-center gap-2 min-h-[36px] rounded-md px-1 ${
                                d.isChecked ? 'opacity-65' : ''
                            }`}
                        >
                            <TaskRingToggle
                                checked={d.isChecked}
                                disabled={readOnly}
                                label={d.isChecked ? `إلغاء: ${d.text}` : `إنجاز: ${d.text}`}
                                onToggle={() => !readOnly && onToggle(d.id)}
                                tone="violet"
                                size="sm"
                            />
                            {items.length > 1 ? (
                                <span className="text-[10px] font-extrabold tabular-nums text-violet-300/55 shrink-0 w-4 text-center">
                                    {idx + 1}
                                </span>
                            ) : null}
                            <span
                                className={`text-[12px] flex-1 leading-snug break-words ${
                                    d.isChecked
                                        ? 'text-[#F4F4F5]/45 line-through decoration-violet-300/30'
                                        : 'text-[#F4F4F5]/90'
                                }`}
                            >
                                {d.text}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : null}
            {!readOnly && showAdd ? (
                <div className="flex gap-1.5 flex-row-reverse pt-0.5">
                    <input
                        dir="rtl"
                        type="text"
                        data-testid="tasks-doc-add-input"
                        value={docDraft}
                        onChange={(e) => setDocDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            const t = docDraft.trim();
                            if (!t) return;
                            onAdd(t);
                            setDocDraft('');
                        }}
                        className={`flex-1 min-h-[40px] ${TASKS_INPUT} !py-2 text-[12px]`}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            const t = docDraft.trim();
                            if (!t) return;
                            onAdd(t);
                            setDocDraft('');
                        }}
                        disabled={!docDraft.trim()}
                        className="shrink-0 min-h-[40px] min-w-[40px] px-2 rounded-lg border border-violet-400/35 bg-violet-500/15 text-violet-100 text-sm font-bold disabled:opacity-40 touch-manipulation"
                        aria-label="إضافة طلب"
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
        <div className={`mx-3.5 mb-3.5 mr-5 border-r-2 border-amber-500/35 pr-3 py-2.5 ${TASKS_INNER_GLASS_SOFT} rounded-lg rounded-tr-none text-right space-y-2`}>
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
