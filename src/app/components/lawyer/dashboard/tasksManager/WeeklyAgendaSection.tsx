import React from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { WORK_WEEK } from './constants';
import type { WeekAddState } from './types';
import { formatShortDate } from './utils';

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
        </>
    );
}
