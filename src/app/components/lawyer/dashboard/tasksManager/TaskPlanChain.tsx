import React, { useState } from 'react';
import { Check } from '@/app/components/ui/icons/Check';
import { Pause } from '@/app/components/ui/icons/Pause';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Plus } from '@/app/components/ui/icons/Plus';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { LegalSubTask, LegalSubTaskPlanStatus } from '@/app/types/TaskEngine';
import { TASKS_INPUT, TASKS_INNER_GLASS_SOFT } from './tasksBoucleTheme';

export type PlanChainDraftStep = { id: string; title: string };

/**
 * سلسلة تلتف للسطر التالي عند ضيق العرض — لا تمرير أفقي مزعج.
 * خيط ذهبي قصير يربط الحلقات داخل الصف.
 */
const PLAN_TRACK =
    'flex min-w-0 w-full flex-row-reverse flex-wrap content-start items-center gap-x-0 gap-y-3';

const PLAN_BEAD =
    'flex max-w-full flex-row-reverse items-center';

const PLAN_CARD =
    'relative flex min-h-[44px] min-w-[10.5rem] max-w-[14rem] flex-[1_1_10.5rem] flex-row-reverse items-center gap-1.5 ' +
    'rounded-lg border border-white/[0.09] bg-white/[0.035] px-2 py-1.5 ' +
    'shadow-[inset_0_1px_0_rgba(230,198,115,0.08)]';

const PLAN_THREAD =
    'pointer-events-none relative mx-1 h-px w-4 shrink-0 ' +
    'bg-gradient-to-l from-transparent via-[#E6C673]/55 to-transparent';

const PLAN_THREAD_DOT =
    'absolute start-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E6C673]';

function newPlanStepId(): string {
    return `plan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function statusLabel(status: LegalSubTaskPlanStatus | undefined, isCompleted: boolean): string {
    const s = status ?? (isCompleted ? 'done' : 'pending');
    if (s === 'done' || isCompleted) return 'تم';
    if (s === 'delayed') return 'تأخير';
    if (s === 'paused') return 'توقف';
    return 'بانتظار';
}

function statusTone(status: LegalSubTaskPlanStatus | undefined, isCompleted: boolean): string {
    const s = status ?? (isCompleted ? 'done' : 'pending');
    if (s === 'done' || isCompleted) return 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-100';
    if (s === 'delayed') return 'border-amber-500/30 bg-amber-500/[0.08] text-amber-100';
    if (s === 'paused') return 'border-slate-400/25 bg-slate-500/[0.08] text-slate-200';
    return 'border-white/[0.09] bg-white/[0.035] text-[#F4F4F5]';
}

function PlanThread() {
    return (
        <span className={PLAN_THREAD} aria-hidden>
            <span className={PLAN_THREAD_DOT} />
        </span>
    );
}

/** محرّر سلسلة أفقية خفيفة — تلتف للأسفل عند ضيق الشاشة */
export function TaskPlanChainDraftEditor(props: {
    steps: PlanChainDraftStep[];
    onChange: (steps: PlanChainDraftStep[]) => void;
    /** إخفاء عنوان «سلسلة الخطة» عند تضمين المحرّر داخل غلاف خارجي */
    hideTitle?: boolean;
}) {
    const { steps, onChange, hideTitle = false } = props;

    const updateTitle = (id: string, title: string) => {
        onChange(steps.map((s) => (s.id === id ? { ...s, title } : s)));
    };

    const addStep = () => {
        onChange([...steps, { id: newPlanStepId(), title: '' }]);
    };

    const removeAt = (id: string) => {
        if (steps.length <= 1) {
            onChange([{ id: steps[0]?.id ?? newPlanStepId(), title: '' }]);
            return;
        }
        onChange(steps.filter((s) => s.id !== id));
    };

    return (
        <div className="min-w-0 w-full space-y-2 text-right" data-testid="tasks-plan-chain-draft">
            {!hideTitle ? (
                <div className="flex flex-row-reverse items-center justify-between gap-2 px-0.5">
                    <p className="text-[11px] font-extrabold tracking-tight text-[#E6C673]/88">سلسلة الخطة</p>
                    <span className="text-[10px] font-semibold tabular-nums text-[#F4F4F5]/45">
                        {steps.length} حلقة
                    </span>
                </div>
            ) : null}

            <div className={PLAN_TRACK} role="list">
                {steps.map((step, index) => (
                    <div key={step.id} className={PLAN_BEAD} role="listitem">
                        <div className={PLAN_CARD}>
                            <span
                                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-[#E6C673]/30 bg-[#E6C673]/10 text-[10px] font-extrabold tabular-nums text-[#E6C673]"
                                aria-hidden
                            >
                                {index + 1}
                            </span>
                            <input
                                dir="rtl"
                                type="text"
                                value={step.title}
                                placeholder={`الخطوة ${index + 1}`}
                                onChange={(e) => updateTitle(step.id, e.target.value)}
                                className="min-w-0 flex-1 border-0 bg-transparent px-0.5 py-1 text-[12px] font-semibold text-[#F4F4F5] outline-none placeholder:text-white/30"
                                aria-label={`عنوان الخطوة ${index + 1}`}
                            />
                            {steps.length > 1 ? (
                                <button
                                    type="button"
                                    onClick={() => removeAt(step.id)}
                                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-rose-300/80 hover:bg-rose-500/10 touch-manipulation"
                                    aria-label={`حذف الخطوة ${index + 1}`}
                                >
                                    <Trash2 className="size-3" aria-hidden />
                                </button>
                            ) : null}
                        </div>
                        {index < steps.length - 1 ? <PlanThread /> : null}
                    </div>
                ))}

                {steps.length > 0 ? <PlanThread /> : null}

                <button
                    type="button"
                    onClick={addStep}
                    data-testid="tasks-plan-chain-add"
                    className="inline-flex min-h-[44px] min-w-[44px] shrink-0 flex-row-reverse items-center justify-center gap-1 rounded-lg border border-dashed border-[#E6C673]/35 bg-[#E6C673]/[0.06] px-2.5 text-[11px] font-extrabold text-[#E6C673] touch-manipulation"
                    aria-label="إضافة حلقة"
                >
                    <Plus className="size-3.5" aria-hidden />
                    إضافة
                </button>
            </div>
        </div>
    );
}

type TaskPlanChainLiveProps = {
    subTasks: LegalSubTask[];
    readOnly: boolean;
    onSetPlanStatus: (subId: string, status: LegalSubTaskPlanStatus) => void;
    onRename: (subId: string, title: string) => void;
    onRemove: (subId: string) => void;
    onAdd: (title: string) => void;
};

/** عرض سلسلة الخطة بعد الحفظ — أفقية تلتف بخيوط خفيفة */
export function TaskPlanChainLive({
    subTasks,
    readOnly,
    onSetPlanStatus,
    onRename,
    onRemove,
    onAdd,
}: TaskPlanChainLiveProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [addDraft, setAddDraft] = useState('');

    if (subTasks.length === 0 && readOnly) return null;

    return (
        <div className="min-w-0 w-full space-y-2" data-testid="tasks-plan-chain-live">
            <div className={PLAN_TRACK} role="list">
                {subTasks.map((st, index) => {
                    const status = st.planStatus ?? (st.isCompleted ? 'done' : 'pending');
                    const isActive = activeId === st.id;
                    return (
                        <div key={st.id} className={PLAN_BEAD} role="listitem">
                            <button
                                type="button"
                                onClick={() => {
                                    if (readOnly) return;
                                    setActiveId(isActive ? null : st.id);
                                    setEditingId(null);
                                    setAddOpen(false);
                                }}
                                className={`flex min-h-[44px] min-w-[9.5rem] max-w-[13rem] flex-[1_1_9.5rem] flex-col gap-0.5 rounded-lg border px-2.5 py-2 text-right touch-manipulation ${statusTone(status, st.isCompleted)} ${
                                    isActive ? 'ring-1 ring-[#E6C673]/40' : ''
                                }`}
                            >
                                <span className="flex flex-row-reverse items-center justify-between gap-1">
                                    <span className="text-[9px] font-extrabold tabular-nums text-[#E6C673]/85">
                                        {index + 1}
                                    </span>
                                    <span className="rounded px-1 py-px text-[8px] font-bold opacity-75">
                                        {statusLabel(status, st.isCompleted)}
                                    </span>
                                </span>
                                <span
                                    className={`line-clamp-2 text-[11px] font-bold leading-snug break-words ${
                                        st.isCompleted || status === 'done' ? 'line-through opacity-70' : ''
                                    }`}
                                >
                                    {st.title}
                                </span>
                            </button>
                            {index < subTasks.length - 1 ? <PlanThread /> : null}
                        </div>
                    );
                })}
                {!readOnly ? (
                    <>
                        {subTasks.length > 0 ? <PlanThread /> : null}
                        <button
                            type="button"
                            onClick={() => {
                                setAddOpen(true);
                                setActiveId(null);
                            }}
                            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-dashed border-[#E6C673]/30 text-[#E6C673] touch-manipulation"
                            aria-label="إضافة حلقة للخطة"
                        >
                            <Plus className="size-3.5" aria-hidden />
                        </button>
                    </>
                ) : null}
            </div>

            {activeId && !readOnly ? (
                <div className={`rounded-lg border border-white/10 ${TASKS_INNER_GLASS_SOFT} space-y-1.5 p-1.5`}>
                    {editingId === activeId ? (
                        <div className="flex min-w-0 flex-row-reverse gap-1.5">
                            <input
                                dir="rtl"
                                className={`min-h-[44px] min-w-0 flex-1 ${TASKS_INPUT} text-[12px]`}
                                value={editDraft}
                                onChange={(e) => setEditDraft(e.target.value)}
                            />
                            <button
                                type="button"
                                className="min-h-[44px] shrink-0 rounded-lg border border-emerald-500/35 px-3 text-[11px] font-bold text-emerald-200 touch-manipulation"
                                onClick={() => {
                                    const t = editDraft.trim();
                                    if (t) onRename(activeId, t);
                                    setEditingId(null);
                                }}
                            >
                                حفظ
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                type="button"
                                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-white/10 text-[11px] font-bold text-slate-200 touch-manipulation"
                                onClick={() => {
                                    const cur = subTasks.find((s) => s.id === activeId);
                                    setEditDraft(cur?.title ?? '');
                                    setEditingId(activeId);
                                }}
                            >
                                <Pencil className="size-3" aria-hidden />
                                تعديل
                            </button>
                            <button
                                type="button"
                                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-emerald-500/35 text-[11px] font-bold text-emerald-200 touch-manipulation"
                                onClick={() => {
                                    onSetPlanStatus(activeId, 'done');
                                    setActiveId(null);
                                }}
                            >
                                <Check className="size-3" aria-hidden />
                                تم
                            </button>
                            <button
                                type="button"
                                className="min-h-[44px] rounded-lg border border-amber-500/35 text-[11px] font-bold text-amber-200 touch-manipulation"
                                onClick={() => {
                                    onSetPlanStatus(activeId, 'delayed');
                                    setActiveId(null);
                                }}
                            >
                                تأخير
                            </button>
                            <button
                                type="button"
                                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-slate-400/35 text-[11px] font-bold text-slate-200 touch-manipulation"
                                onClick={() => {
                                    onSetPlanStatus(activeId, 'paused');
                                    setActiveId(null);
                                }}
                            >
                                <Pause className="size-3" aria-hidden />
                                توقف
                            </button>
                            <button
                                type="button"
                                className="col-span-2 inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-rose-500/35 text-[11px] font-bold text-rose-200 touch-manipulation"
                                onClick={() => {
                                    onRemove(activeId);
                                    setActiveId(null);
                                }}
                            >
                                <Trash2 className="size-3" aria-hidden />
                                حذف الحلقة
                            </button>
                        </div>
                    )}
                </div>
            ) : null}

            {addOpen && !readOnly ? (
                <div className="flex min-w-0 flex-row-reverse gap-1.5">
                    <input
                        dir="rtl"
                        className={`min-h-[44px] min-w-0 flex-1 ${TASKS_INPUT} text-[12px]`}
                        placeholder="حلقة جديدة…"
                        value={addDraft}
                        onChange={(e) => setAddDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            const t = addDraft.trim();
                            if (!t) return;
                            onAdd(t);
                            setAddDraft('');
                            setAddOpen(false);
                        }}
                    />
                    <button
                        type="button"
                        className="min-h-[44px] shrink-0 rounded-lg border border-emerald-500/35 px-3 text-[11px] font-bold text-emerald-200 touch-manipulation"
                        onClick={() => {
                            const t = addDraft.trim();
                            if (!t) return;
                            onAdd(t);
                            setAddDraft('');
                            setAddOpen(false);
                        }}
                    >
                        إضافة
                    </button>
                    <button
                        type="button"
                        className="min-h-[44px] shrink-0 rounded-lg border border-white/10 px-3 text-[11px] font-bold text-slate-300 touch-manipulation"
                        onClick={() => {
                            setAddOpen(false);
                            setAddDraft('');
                        }}
                    >
                        إلغاء
                    </button>
                </div>
            ) : null}
        </div>
    );
}
