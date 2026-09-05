import React, { useEffect, useRef } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { Plus } from '@/app/components/ui/icons/Plus';
import { X } from '@/app/components/ui/icons/X';
import { WORK_WEEK } from './constants';
import type { WeekAddState } from './types';
import type { TaskListOrdinal } from './TaskListOrdinalBadge';
import { formatShortDate, isAgendaDayPast, type AgendaWeeklyDayBlock } from './utils';
import {
    TASKS_DAY_PANEL,
    TASKS_INPUT,
    TASKS_BTN_BRONZE,
    TASKS_BTN_GHOST,
    TASKS_GLASS_PANEL,
} from './tasksBoucleTheme';
import { TaskPlanChainDraftEditor } from './TaskPlanChain';
import {
    blockTasksOverlayEscape,
    unblockTasksOverlayEscape,
} from '@/app/components/lawyer/dashboard/fieldTasks/tasksEscapeCoordinator';
import { SmartToast } from '@/app/components/ui/SmartToast';

export type WeeklyDayBlock = AgendaWeeklyDayBlock;

export type WeeklyAgendaSectionProps = {
    weeklyDayBlocks: WeeklyDayBlock[];
    weekAdd: WeekAddState;
    setWeekAdd: React.Dispatch<React.SetStateAction<WeekAddState>>;
    openWeekAdd: (dayKey: (typeof WORK_WEEK)[number]['key'], opts?: { withPlan?: boolean }) => void;
    saveWeekBundle: (dayKey: (typeof WORK_WEEK)[number]['key']) => void;
    renderTaskCard: (task: LegalTask, listOrdinal?: TaskListOrdinal) => React.ReactNode;
    now?: Date;
};

const ADD_CHIP =
    'inline-flex min-h-[40px] flex-row-reverse items-center gap-1 rounded-lg border border-dashed ' +
    'border-white/14 bg-transparent px-2.5 text-[11px] font-bold text-[#F4F4F5]/68 ' +
    'hover:border-[#E6C673]/35 hover:text-[#E6C673] touch-manipulation transition';

const FIELD_SHELL =
    'min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 space-y-1.5 text-right';

export const WeeklyAgendaSection = React.memo(function WeeklyAgendaSection({
    weeklyDayBlocks,
    weekAdd,
    setWeekAdd,
    openWeekAdd,
    saveWeekBundle,
    renderTaskCard,
    now = new Date(),
}: WeeklyAgendaSectionProps) {
    return (
        <>
            {weeklyDayBlocks.map((block) => {
                const dayPast = isAgendaDayPast(block.dayDate, now);
                const formOpen = weekAdd?.dayKey === block.key;
                const planActive = Boolean(formOpen && weekAdd?.planOpen);

                return (
                    <article
                        key={block.key}
                        data-testid={`tasks-week-day-${block.key}`}
                        data-tasks-week-past={dayPast ? 'true' : 'false'}
                        className={TASKS_DAY_PANEL}
                    >
                        <header className="mb-2 flex flex-row-reverse flex-wrap items-center justify-between gap-2 relative">
                            <div className="min-w-0 flex-1 text-right">
                                <h3
                                    className={`text-sm font-semibold tracking-tight text-[#F4F4F5] ${
                                        dayPast ? 'line-through decoration-[#E6C673]/45 decoration-2' : ''
                                    }`}
                                >
                                    {block.label}
                                </h3>
                                <p
                                    className={`mt-0.5 text-[11px] font-medium ${
                                        dayPast
                                            ? 'text-[#E6C673]/38 line-through decoration-[#E6C673]/35'
                                            : 'text-[#E6C673]/62'
                                    }`}
                                >
                                    {formatShortDate(block.dayDate)}
                                    {block.tasks.length > 0 ? ` · ${block.tasks.length} مهمة` : ''}
                                </p>
                            </div>
                            {!dayPast ? (
                                <div className="flex shrink-0 flex-row-reverse items-center gap-1.5">
                                    <button
                                        type="button"
                                        data-testid={`tasks-week-add-${block.key}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openWeekAdd(block.key);
                                        }}
                                        className={TASKS_BTN_BRONZE}
                                    >
                                        + إضافة مهمة
                                    </button>
                                    <button
                                        type="button"
                                        data-testid={`tasks-week-plan-${block.key}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openWeekAdd(block.key, { withPlan: true });
                                        }}
                                        className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-semibold touch-manipulation transition ${
                                            planActive
                                                ? 'border-[#E6C673]/45 bg-[#E6C673]/12 text-[#E6C673]'
                                                : 'border-white/12 bg-transparent text-[#F4F4F5]/75 hover:border-[#E6C673]/28 hover:text-[#E6C673]'
                                        }`}
                                    >
                                        إنشاء خطة
                                    </button>
                                </div>
                            ) : null}
                        </header>

                        {formOpen && weekAdd ? (
                            <WeekAddForm
                                block={block}
                                weekAdd={weekAdd}
                                setWeekAdd={setWeekAdd}
                                saveWeekBundle={saveWeekBundle}
                            />
                        ) : null}

                        {block.tasks.length > 0 ? (
                            <ul className="space-y-2">
                                {block.tasks.map((t, i) =>
                                    renderTaskCard(t, { index: i, total: block.tasks.length }),
                                )}
                            </ul>
                        ) : null}
                    </article>
                );
            })}
        </>
    );
});

type WeekAddFormProps = {
    block: WeeklyDayBlock;
    weekAdd: NonNullable<WeekAddState>;
    setWeekAdd: React.Dispatch<React.SetStateAction<WeekAddState>>;
    saveWeekBundle: (dayKey: (typeof WORK_WEEK)[number]['key']) => void;
};

function patchWeek(
    setWeekAdd: React.Dispatch<React.SetStateAction<WeekAddState>>,
    dayKey: (typeof WORK_WEEK)[number]['key'],
    patch: Partial<NonNullable<WeekAddState>>,
) {
    setWeekAdd((w) => (w && w.dayKey === dayKey ? { ...w, ...patch } : w));
}

function WeekAddForm({ block, weekAdd, setWeekAdd, saveWeekBundle }: WeekAddFormProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const reduceMotion = useReduceMotion();

    const details = weekAdd.detailsOpen ? weekAdd.details.trim() : '';
    const location = weekAdd.locationOpen ? weekAdd.location.trim() : '';
    const planTitles = weekAdd.planOpen
        ? weekAdd.planSteps.map((s) => s.title.trim()).filter((t) => t.length > 0)
        : [];
    const canSave = Boolean(details || location || planTitles.length > 0);
    const showChips = !weekAdd.detailsOpen || !weekAdd.locationOpen || !weekAdd.planOpen;

    useEffect(() => {
        void import('@/app/services/tasks/quantumTaskCreateLoad')
            .then((m) => m.loadQuantumTaskCreateBundle())
            .catch(() => undefined);
    }, []);

    useEffect(() => {
        blockTasksOverlayEscape('week-add');
        return () => unblockTasksOverlayEscape('week-add');
    }, []);

    useEffect(() => {
        const node = formRef.current;
        if (!node) return;
        const frame = requestAnimationFrame(() => {
            const scroller = node.closest('[class*="overflow-y-auto"]');
            if (scroller instanceof HTMLElement) {
                const nodeRect = node.getBoundingClientRect();
                const scrollerRect = scroller.getBoundingClientRect();
                if (nodeRect.bottom > scrollerRect.bottom || nodeRect.top < scrollerRect.top) {
                    const delta =
                        nodeRect.top - scrollerRect.top - Math.max(12, scrollerRect.height * 0.08);
                    scroller.scrollBy({
                        top: delta,
                        behavior: reduceMotion ? 'auto' : 'smooth',
                    });
                }
            }
            const first =
                node.querySelector<HTMLTextAreaElement>('[data-testid="tasks-week-form-details"]') ??
                node.querySelector<HTMLInputElement>('[data-testid="tasks-week-form-location"]') ??
                node.querySelector<HTMLInputElement>('[data-testid="tasks-plan-chain-draft"] input');
            first?.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(frame);
        // مرّة عند فتح النموذج فقط — فتح الشرائح يركّز الحقل من زر الإضافة
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only focus/scroll
    }, [reduceMotion]);

    const focusField = (testId: string) => {
        requestAnimationFrame(() => {
            const el = formRef.current?.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
            if (el instanceof HTMLElement) el.focus({ preventScroll: true });
            else {
                const input = formRef.current?.querySelector<HTMLInputElement>(
                    `[data-testid="${testId}"] input`,
                );
                input?.focus({ preventScroll: true });
            }
        });
    };

    const commitSave = () => {
        if (!canSave) {
            SmartToast.error('أضف تفصيلاً أو موقعاً أو خطوة ثم احفظ');
            return;
        }
        saveWeekBundle(block.key);
    };

    return (
        <form
            ref={formRef}
            data-testid="tasks-week-add-form"
            className={`mb-2 min-w-0 overflow-x-hidden ${TASKS_GLASS_PANEL} space-y-2 p-2.5`}
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                commitSave();
            }}
        >
            {weekAdd.detailsOpen ? (
                <div className={FIELD_SHELL}>
                    <div className="flex flex-row-reverse items-center justify-between gap-2">
                        <label className="text-[11px] font-bold text-[#C9A85C]/90" htmlFor="tasks-week-details">
                            التفاصيل
                        </label>
                        <button
                            type="button"
                            data-testid="tasks-week-remove-details"
                            className="inline-flex size-8 items-center justify-center rounded-md text-[#F4F4F5]/45 hover:bg-white/[0.06] hover:text-[#F4F4F5]/80 touch-manipulation"
                            aria-label="إخفاء التفاصيل"
                            onClick={() =>
                                patchWeek(setWeekAdd, block.key, { detailsOpen: false, details: '' })
                            }
                        >
                            <X className="size-3.5" aria-hidden />
                        </button>
                    </div>
                    <textarea
                        id="tasks-week-details"
                        dir="rtl"
                        rows={2}
                        data-testid="tasks-week-form-details"
                        autoComplete="off"
                        enterKeyHint="enter"
                        value={weekAdd.details}
                        onChange={(e) => patchWeek(setWeekAdd, block.key, { details: e.target.value })}
                        className={`${TASKS_INPUT} min-h-[3.75rem] resize-none`}
                        placeholder="ماذا تريد إنجازه؟"
                    />
                </div>
            ) : null}

            {weekAdd.locationOpen ? (
                <div className={FIELD_SHELL}>
                    <div className="flex flex-row-reverse items-center justify-between gap-2">
                        <label className="text-[11px] font-bold text-[#C9A85C]/90" htmlFor="tasks-week-location">
                            الموقع
                        </label>
                        <button
                            type="button"
                            data-testid="tasks-week-remove-location"
                            className="inline-flex size-8 items-center justify-center rounded-md text-[#F4F4F5]/45 hover:bg-white/[0.06] hover:text-[#F4F4F5]/80 touch-manipulation"
                            aria-label="إخفاء الموقع"
                            onClick={() =>
                                patchWeek(setWeekAdd, block.key, { locationOpen: false, location: '' })
                            }
                        >
                            <X className="size-3.5" aria-hidden />
                        </button>
                    </div>
                    <input
                        id="tasks-week-location"
                        dir="rtl"
                        type="text"
                        data-testid="tasks-week-form-location"
                        autoComplete="off"
                        enterKeyHint="done"
                        value={weekAdd.location}
                        onChange={(e) => patchWeek(setWeekAdd, block.key, { location: e.target.value })}
                        className={TASKS_INPUT}
                        placeholder="محكمة، دائرة، عنوان…"
                    />
                </div>
            ) : null}

            {weekAdd.planOpen ? (
                <div className={FIELD_SHELL}>
                    <div className="flex flex-row-reverse items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-[#C9A85C]/90">خطوات الخطة</span>
                        <button
                            type="button"
                            data-testid="tasks-week-remove-plan"
                            className="inline-flex size-8 items-center justify-center rounded-md text-[#F4F4F5]/45 hover:bg-white/[0.06] hover:text-[#F4F4F5]/80 touch-manipulation"
                            aria-label="إخفاء خطوات الخطة"
                            onClick={() =>
                                patchWeek(setWeekAdd, block.key, {
                                    planOpen: false,
                                    planSteps: [{ id: `plan_${Date.now()}`, title: '' }],
                                })
                            }
                        >
                            <X className="size-3.5" aria-hidden />
                        </button>
                    </div>
                    <TaskPlanChainDraftEditor
                        hideTitle
                        steps={weekAdd.planSteps}
                        onChange={(planSteps) => patchWeek(setWeekAdd, block.key, { planSteps })}
                    />
                </div>
            ) : null}

            {showChips ? (
                <div
                    className="flex min-w-0 flex-row-reverse flex-wrap items-center gap-1.5"
                    data-testid="tasks-week-add-chips"
                    role="group"
                    aria-label="إضافة حقول اختيارية"
                >
                    {!weekAdd.detailsOpen ? (
                        <button
                            type="button"
                            data-testid="tasks-week-chip-details"
                            className={ADD_CHIP}
                            onClick={() => {
                                patchWeek(setWeekAdd, block.key, { detailsOpen: true });
                                focusField('tasks-week-form-details');
                            }}
                        >
                            <Plus className="size-3.5 opacity-80" aria-hidden />
                            تفاصيل
                        </button>
                    ) : null}
                    {!weekAdd.locationOpen ? (
                        <button
                            type="button"
                            data-testid="tasks-week-chip-location"
                            className={ADD_CHIP}
                            onClick={() => {
                                patchWeek(setWeekAdd, block.key, { locationOpen: true });
                                focusField('tasks-week-form-location');
                            }}
                        >
                            <Plus className="size-3.5 opacity-80" aria-hidden />
                            موقع
                        </button>
                    ) : null}
                    {!weekAdd.planOpen ? (
                        <button
                            type="button"
                            data-testid="tasks-week-chip-step"
                            className={ADD_CHIP}
                            onClick={() => {
                                patchWeek(setWeekAdd, block.key, {
                                    planOpen: true,
                                    planSteps:
                                        weekAdd.planSteps.length > 0
                                            ? weekAdd.planSteps
                                            : [{ id: `plan_${Date.now()}`, title: '' }],
                                });
                                focusField('tasks-plan-chain-draft');
                            }}
                        >
                            <Plus className="size-3.5 opacity-80" aria-hidden />
                            خطوة
                        </button>
                    ) : null}
                </div>
            ) : null}

            {!canSave ? (
                <p className="text-right text-[10px] font-semibold text-[#F4F4F5]/40" role="status">
                    أضف تفصيلاً أو موقعاً أو خطوة للحفظ
                </p>
            ) : null}

            <div className="sticky bottom-0 z-[1] -mx-0.5 flex flex-row-reverse justify-end gap-2 border-t border-white/[0.06] bg-[#0A0F1C] px-0.5 pb-0.5 pt-2">
                <button
                    type="button"
                    onClick={() => setWeekAdd(null)}
                    data-testid="tasks-week-cancel"
                    className={TASKS_BTN_GHOST}
                >
                    إلغاء
                </button>
                <button
                    type="submit"
                    data-testid="tasks-week-save"
                    disabled={!canSave}
                    className={`${TASKS_BTN_BRONZE} disabled:cursor-not-allowed disabled:opacity-55`}
                >
                    حفظ المهمة
                </button>
            </div>
        </form>
    );
}
