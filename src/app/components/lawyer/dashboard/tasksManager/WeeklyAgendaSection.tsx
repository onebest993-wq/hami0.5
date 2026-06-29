import React from 'react';
import { Check } from 'lucide-react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { WORK_WEEK } from './constants';
import type { WeekAddState } from './types';
import { formatShortDate, isAgendaDayPast } from './utils';
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
    renderTaskCard: (task: LegalTask, fatalPulse: boolean) => React.ReactNode;
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
                const dayEmpty = block.tasks.length === 0;
                const showPastEmptyMark = dayPast && dayEmpty && weekAdd?.dayKey !== block.key;

                return (
                    <article
                        key={block.key}
                        data-testid={`tasks-week-day-${block.key}`}
                        className={`${TASKS_DAY_PANEL}${showPastEmptyMark ? ' opacity-70' : ''}`}
                    >
                        <div className="absolute top-3 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#A67C52]/25 to-transparent pointer-events-none" />
                        <header className="flex flex-row-reverse items-center justify-between gap-3 mb-3 flex-wrap relative">
                            <div className="text-right min-w-0 flex-1">
                                <h3
                                    className={`text-[#E8F5F0] font-extrabold text-lg tracking-tight${
                                        showPastEmptyMark ? ' line-through decoration-[#1A7059]/55 decoration-2' : ''
                                    }`}
                                >
                                    {block.label}
                                </h3>
                                <p className="text-[#6BC4A8]/55 text-xs font-semibold mt-1.5">
                                    {formatShortDate(block.dayDate)}
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

                        {showPastEmptyMark ? (
                            <div className="relative mb-3" aria-label="يوم منتهٍ بدون مهام">
                                <div className="absolute inset-x-3 top-1/2 h-px bg-gradient-to-r from-transparent via-[#1A7059]/50 to-transparent pointer-events-none" />
                                <div className="flex flex-row-reverse items-center gap-2 px-3 py-2 rounded-xl border border-[#1A7059]/22 bg-[#1A7059]/8 relative">
                                    <Check className="size-3.5 shrink-0 text-[#6BC4A8]/80" aria-hidden />
                                    <span className="text-xs font-bold text-[#6BC4A8]/65">انتهى اليوم — لا مهام</span>
                                </div>
                            </div>
                        ) : null}

                        {weekAdd?.dayKey === block.key ? (
                            <div className={`mb-3 ${TASKS_GLASS_PANEL} p-3 space-y-2.5`}>
                                <div className="text-right">
                                    <label className="block text-[11px] font-bold text-[#B8956A]/90 mb-1.5">
                                        تفاصيل المهمة
                                    </label>
                                    <textarea
                                        dir="rtl"
                                        rows={2}
                                        autoFocus
                                        data-testid="tasks-week-form-details"
                                        placeholder="اكتب تفاصيل المهمة أو وصفها…"
                                        value={weekAdd.details}
                                        onChange={(e) =>
                                            setWeekAdd((w) =>
                                                w && w.dayKey === block.key ? { ...w, details: e.target.value } : w,
                                            )
                                        }
                                        className={`${TASKS_INPUT} resize-none min-h-[4.5rem]`}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div className="text-right min-w-0">
                                        <label className="block text-[11px] font-bold text-[#B8956A]/90 mb-1.5">
                                            المحكمة أو الدائرة
                                        </label>
                                        <input
                                            dir="rtl"
                                            type="text"
                                            data-testid="tasks-week-form-location"
                                            placeholder="اكتب اسم المحكمة أو الدائرة…"
                                            value={weekAdd.location}
                                            onChange={(e) =>
                                                setWeekAdd((w) =>
                                                    w && w.dayKey === block.key ? { ...w, location: e.target.value } : w,
                                                )
                                            }
                                            className={TASKS_INPUT}
                                        />
                                    </div>

                                    <div className="text-right min-w-0">
                                        <label className="block text-[11px] font-bold text-[#B8956A]/90 mb-1.5">
                                            إجراء ميداني
                                        </label>
                                        <div className="flex flex-row-reverse gap-2 items-center">
                                            <input
                                                dir="rtl"
                                                type="text"
                                                placeholder="مثال: دفع رسم، تصوير قرار…"
                                                value={weekAdd.lineDraft}
                                                onChange={(e) =>
                                                    setWeekAdd((w) =>
                                                        w && w.dayKey === block.key
                                                            ? { ...w, lineDraft: e.target.value }
                                                            : w,
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
                                                className={`flex-1 min-w-0 ${TASKS_INPUT}`}
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
                                                className={`shrink-0 ${TASKS_BTN_PRIMARY}`}
                                            >
                                                إضافة
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {weekAdd.actionLines.length > 0 ? (
                                    <ul className="max-h-32 overflow-y-auto space-y-1.5 pr-0.5 text-right">
                                        {weekAdd.actionLines.map((line, idx) => (
                                            <li
                                                key={`${idx}-${line}`}
                                                className="flex flex-row-reverse items-center justify-between gap-2 rounded-lg border border-[#A67C52]/15 bg-[#0c0c0e]/35 px-2.5 py-1.5 text-sm text-[#E8F5F0]"
                                            >
                                                <span className="tabular-nums text-[#A67C52]/50 text-[11px] font-bold">
                                                    {idx + 1}.
                                                </span>
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
                                ) : null}

                                <div className="flex flex-row-reverse gap-2 justify-end pt-0.5">
                                    <button type="button" onClick={() => setWeekAdd(null)} data-testid="tasks-week-cancel" className={TASKS_BTN_GHOST}>
                                        إلغاء
                                    </button>
                                    <button
                                        type="button"
                                        data-testid="tasks-week-save"
                                        onClick={() => saveWeekBundle(block.key)}
                                        disabled={
                                            !weekAdd.location.trim() ||
                                            (!weekAdd.details.trim() &&
                                                weekAdd.actionLines.length === 0 &&
                                                !weekAdd.lineDraft.trim())
                                        }
                                        className={`${TASKS_BTN_BRONZE} disabled:opacity-40`}
                                    >
                                        حفظ المهام
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <ul className="space-y-3">{block.tasks.map((t) => renderTaskCard(t, false))}</ul>
                    </article>
                );
            })}
        </>
    );
});
