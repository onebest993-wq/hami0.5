import React from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { WORK_WEEK } from './constants';
import type { WeekAddState } from './types';
import { formatShortDate } from './utils';
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
};

export function WeeklyAgendaSection({
    weeklyDayBlocks,
    weekAdd,
    setWeekAdd,
    openWeekAdd,
    saveWeekBundle,
    renderTaskCard,
}: WeeklyAgendaSectionProps) {
    return (
        <>
            {weeklyDayBlocks.map((block) => (
                <article key={block.key} className={TASKS_DAY_PANEL}>
                    <div className="absolute top-3 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#A67C52]/25 to-transparent pointer-events-none" />
                    <header className="flex flex-row-reverse items-center justify-between gap-3 mb-5 flex-wrap relative">
                        <div className="text-right">
                            <h3 className="text-[#E8F5F0] font-extrabold text-lg tracking-tight">{block.label}</h3>
                            <p className="text-[#6BC4A8]/55 text-xs font-semibold mt-1.5">{formatShortDate(block.dayDate)}</p>
                        </div>
                        <button type="button" onClick={() => openWeekAdd(block.key)} className={TASKS_BTN_BRONZE}>
                            + إضافة مهمة
                        </button>
                    </header>

                    {weekAdd?.dayKey === block.key ? (
                        <div className={`mb-5 ${TASKS_GLASS_PANEL} p-4 space-y-4`}>
                            {weekAdd.step === 'location' ? (
                                <>
                                    <p className="text-[11px] font-bold text-[#B8956A]/90 text-right leading-relaxed">
                                        حدد المحكمة أو الدائرة أولاً
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
                                        className={TASKS_INPUT}
                                    />
                                    <div className="flex flex-row-reverse gap-2 justify-end">
                                        <button type="button" onClick={() => setWeekAdd(null)} className={TASKS_BTN_GHOST}>
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
                                            className={TASKS_BTN_PRIMARY}
                                        >
                                            متابعة
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-[10px] font-bold text-[#A67C52]/60 text-right">
                                        المكان:{' '}
                                        <span className="text-[#6BC4A8]">{weekAdd.location.trim()}</span>
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setWeekAdd((w) =>
                                                w && w.dayKey === block.key ? { ...w, step: 'location' } : w,
                                            )
                                        }
                                        className="text-[10px] font-bold text-[#B8956A]/90 underline-offset-4 hover:underline"
                                    >
                                        تعديل الموقع
                                    </button>
                                    <ul className="max-h-36 overflow-y-auto space-y-2 pr-1 text-right">
                                        {weekAdd.actionLines.map((line, idx) => (
                                            <li
                                                key={`${idx}-${line}`}
                                                className={`flex flex-row-reverse items-center justify-between gap-2 rounded-lg border border-[#A67C52]/15 ${TASKS_GLASS_PANEL} px-3 py-2 text-sm text-[#E8F5F0]`}
                                            >
                                                <span className="tabular-nums text-[#A67C52]/50 text-[11px] font-bold">{idx + 1}.</span>
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
                                            className={`flex-1 min-w-[10rem] ${TASKS_INPUT}`}
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
                                    <div className="flex flex-row-reverse gap-2 justify-end pt-1">
                                        <button type="button" onClick={() => setWeekAdd(null)} className={TASKS_BTN_GHOST}>
                                            إلغاء
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => saveWeekBundle(block.key)}
                                            disabled={weekAdd.actionLines.length === 0 && !weekAdd.lineDraft.trim()}
                                            className={`${TASKS_BTN_BRONZE} disabled:opacity-40`}
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
        </>
    );
}
