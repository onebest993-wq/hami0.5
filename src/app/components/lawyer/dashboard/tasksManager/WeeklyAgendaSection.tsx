import React, { useCallback, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { WORK_WEEK } from './constants';
import type { WeekAddState } from './types';
import type { TaskListOrdinal } from './TaskListOrdinalBadge';
import {
    formatShortDate,
    isAgendaDayPast,
    isWeeklyAgendaDayVisible,
    isWeeklyPastDayCompact,
} from './utils';
import {
    TASKS_DAY_PANEL,
    TASKS_INPUT,
    TASKS_BTN_PRIMARY,
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
    const [expandedPastDays, setExpandedPastDays] = useState<Set<string>>(() => new Set());

    const togglePastDay = useCallback((dayKey: string) => {
        setExpandedPastDays((prev) => {
            const next = new Set(prev);
            if (next.has(dayKey)) next.delete(dayKey);
            else next.add(dayKey);
            return next;
        });
    }, []);

    const visibleBlocks = useMemo(
        () =>
            weeklyDayBlocks.filter((block) =>
                isWeeklyAgendaDayVisible(block.dayDate, block.tasks.length, now, weekAdd?.dayKey, block.key),
            ),
        [weeklyDayBlocks, now, weekAdd?.dayKey],
    );

    return (
        <>
            {visibleBlocks.map((block) => {
                const dayPast = isAgendaDayPast(block.dayDate, now);
                const compactPast = isWeeklyPastDayCompact(block.dayDate, block.tasks.length, now);
                const expanded = expandedPastDays.has(block.key);
                const showTasks = !compactPast || expanded;

                return (
                    <article
                        key={block.key}
                        data-testid={`tasks-week-day-${block.key}`}
                        data-tasks-week-compact={compactPast && !expanded ? 'true' : 'false'}
                        className={`${TASKS_DAY_PANEL}${compactPast && !expanded ? ' py-2.5 px-4' : ''}`}
                    >
                        {compactPast && !expanded ? (
                            <button
                                type="button"
                                data-testid={`tasks-week-day-toggle-${block.key}`}
                                onClick={() => togglePastDay(block.key)}
                                className="w-full flex flex-row-reverse items-center justify-between gap-3 text-right touch-manipulation min-h-[44px]"
                                aria-expanded={false}
                            >
                                <div className="min-w-0 flex-1">
                                    <span className="text-[#E8F5F0]/75 font-bold text-sm">{block.label}</span>
                                    <span className="text-[#6BC4A8]/45 text-xs font-semibold mx-2">·</span>
                                    <span className="text-[#6BC4A8]/55 text-xs font-semibold">
                                        {formatShortDate(block.dayDate)}
                                    </span>
                                </div>
                                <div className="flex flex-row-reverse items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-extrabold tabular-nums px-2 py-0.5 rounded-md border border-[#A67C52]/25 bg-[#A67C52]/10 text-[#D4B896]">
                                        {block.tasks.length} مهمة
                                    </span>
                                    <ChevronDown className="size-4 text-[#6BC4A8]/50" aria-hidden />
                                </div>
                            </button>
                        ) : (
                            <>
                                <div className="absolute top-3 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#A67C52]/25 to-transparent pointer-events-none" />
                                <header className="flex flex-row-reverse items-center justify-between gap-3 mb-3 flex-wrap relative">
                                    <div className="text-right min-w-0 flex-1">
                                        {compactPast ? (
                                            <button
                                                type="button"
                                                data-testid={`tasks-week-day-toggle-${block.key}`}
                                                onClick={() => togglePastDay(block.key)}
                                                className="flex flex-row-reverse items-center gap-2 w-full text-right touch-manipulation min-h-[44px]"
                                                aria-expanded={true}
                                            >
                                                <h3 className="text-[#E8F5F0] font-extrabold text-lg tracking-tight">
                                                    {block.label}
                                                </h3>
                                                <ChevronDown
                                                    className="size-4 text-[#6BC4A8]/60 rotate-180 shrink-0"
                                                    aria-hidden
                                                />
                                            </button>
                                        ) : (
                                            <h3 className="text-[#E8F5F0] font-extrabold text-lg tracking-tight">
                                                {block.label}
                                            </h3>
                                        )}
                                        <p className="text-[#6BC4A8]/55 text-xs font-semibold mt-1.5">
                                            {formatShortDate(block.dayDate)}
                                            {compactPast ? ` · ${block.tasks.length} مهمة` : ''}
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

                                {showTasks ? (
                                    <ul className="space-y-3">
                                        {block.tasks.map((t, i) =>
                                            renderTaskCard(t, false, { index: i, total: block.tasks.length }),
                                        )}
                                    </ul>
                                ) : null}
                            </>
                        )}
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
    return (
        <div className={`mb-3 ${TASKS_GLASS_PANEL} p-3 space-y-2.5`}>
            <div className="text-right">
                <label className="block text-[11px] font-bold text-[#B8956A]/90 mb-1.5">تفاصيل المهمة</label>
                <textarea
                    dir="rtl"
                    rows={2}
                    autoFocus
                    data-testid="tasks-week-form-details"
                    placeholder="اكتب تفاصيل المهمة أو وصفها…"
                    value={weekAdd.details}
                    onChange={(e) =>
                        setWeekAdd((w) => (w && w.dayKey === block.key ? { ...w, details: e.target.value } : w))
                    }
                    className={`${TASKS_INPUT} resize-none min-h-[4.5rem]`}
                />
            </div>

            <div className="text-right min-w-0">
                <label className="block text-[11px] font-bold text-[#B8956A]/90 mb-1.5">الموقع</label>
                <input
                    dir="rtl"
                    type="text"
                    data-testid="tasks-week-form-location"
                    placeholder="اكتب الموقع…"
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
