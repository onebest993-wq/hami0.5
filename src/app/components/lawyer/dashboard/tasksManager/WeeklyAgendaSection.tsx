import React, { useEffect, useRef } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { WORK_WEEK } from './constants';
import type { WeekAddState } from './types';
import type { TaskListOrdinal } from './TaskListOrdinalBadge';
import { formatShortDate, isAgendaDayPast } from './utils';
import {
    TASKS_DAY_PANEL,
    TASKS_INPUT,
    TASKS_BTN_BRONZE,
    TASKS_BTN_GHOST,
    TASKS_GLASS_PANEL,
} from './tasksBoucleTheme';

export type WeeklyDayBlock = {
    key: (typeof WORK_WEEK)[number]['key'];
    label: string;
    offset: number;
    dayDate: Date;
    tasks: LegalTask[];
};

export type WeeklyAgendaSectionProps = {
    weeklyDayBlocks: WeeklyDayBlock[];
    weekAdd: WeekAddState;
    setWeekAdd: React.Dispatch<React.SetStateAction<WeekAddState>>;
    openWeekAdd: (dayKey: (typeof WORK_WEEK)[number]['key']) => void;
    saveWeekBundle: (dayKey: (typeof WORK_WEEK)[number]['key']) => void;
    renderTaskCard: (task: LegalTask, fatalPulse: boolean, listOrdinal?: TaskListOrdinal) => React.ReactNode;
    now?: Date;
};

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

                return (
                    <article
                        key={block.key}
                        data-testid={`tasks-week-day-${block.key}`}
                        data-tasks-week-past={dayPast ? 'true' : 'false'}
                        className={TASKS_DAY_PANEL}
                    >
                        <div className="absolute top-3 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#E6C673]/25 to-transparent pointer-events-none" />
                        <header className="flex flex-row-reverse items-center justify-between gap-3 mb-3 flex-wrap relative">
                            <div className="text-right min-w-0 flex-1">
                                <h3
                                    className={`text-[#F4F4F5] font-extrabold text-lg tracking-tight ${
                                        dayPast ? 'line-through decoration-[#E6C673]/45 decoration-2' : ''
                                    }`}
                                >
                                    {block.label}
                                </h3>
                                <p
                                    className={`text-xs font-semibold mt-1.5 ${
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
                                <button
                                    type="button"
                                    data-testid={`tasks-week-add-${block.key}`}
                                    onClick={() => openWeekAdd(block.key)}
                                    className={TASKS_BTN_BRONZE}
                                >
                                    + إضافة مهمة
                                </button>
                            ) : null}
                        </header>

                        {weekAdd?.dayKey === block.key ? (
                            <WeekAddForm
                                block={block}
                                weekAdd={weekAdd}
                                setWeekAdd={setWeekAdd}
                                saveWeekBundle={saveWeekBundle}
                            />
                        ) : null}

                        {block.tasks.length > 0 ? (
                            <ul className="space-y-3">
                                {block.tasks.map((t, i) =>
                                    renderTaskCard(t, false, { index: i, total: block.tasks.length }),
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

function WeekAddForm({ block, weekAdd, setWeekAdd, saveWeekBundle }: WeekAddFormProps) {
    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const node = formRef.current;
        if (!node) return;
        const frame = requestAnimationFrame(() => {
            node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            const details = node.querySelector<HTMLTextAreaElement>('[data-testid="tasks-week-form-details"]');
            details?.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    return (
        <div
            ref={formRef}
            data-testid="tasks-week-add-form"
            className={`mb-3 ${TASKS_GLASS_PANEL} p-3 space-y-2.5`}
        >
            <div className="text-right">
                <label className="block text-[11px] font-bold text-[#C9A85C]/90 mb-1.5">تفاصيل المهمة</label>
                <textarea
                    dir="rtl"
                    rows={2}
                    data-testid="tasks-week-form-details"
                    value={weekAdd.details}
                    onChange={(e) =>
                        setWeekAdd((w) => (w && w.dayKey === block.key ? { ...w, details: e.target.value } : w))
                    }
                    className={`${TASKS_INPUT} resize-none min-h-[4.5rem]`}
                />
            </div>

            <div className="text-right min-w-0">
                <label className="block text-[11px] font-bold text-[#C9A85C]/90 mb-1.5">الموقع</label>
                <input
                    dir="rtl"
                    type="text"
                    data-testid="tasks-week-form-location"
                    value={weekAdd.location}
                    onChange={(e) =>
                        setWeekAdd((w) => (w && w.dayKey === block.key ? { ...w, location: e.target.value } : w))
                    }
                    className={TASKS_INPUT}
                />
            </div>

            <div className="flex flex-row-reverse gap-2 justify-end pt-0.5">
                <button
                    type="button"
                    onClick={() => setWeekAdd(null)}
                    data-testid="tasks-week-cancel"
                    className={TASKS_BTN_GHOST}
                >
                    إلغاء
                </button>
                <button
                    type="button"
                    data-testid="tasks-week-save"
                    onClick={() => saveWeekBundle(block.key)}
                    disabled={!weekAdd.location.trim() || !weekAdd.details.trim()}
                    className={`${TASKS_BTN_BRONZE} disabled:opacity-40`}
                >
                    حفظ المهمة
                </button>
            </div>
        </div>
    );
}
