import React from 'react';
import { Hourglass } from 'lucide-react';
import type { LegalTask } from '@/app/types/TaskEngine';

export type DistantTasksSectionProps = {
    distantTasks: LegalTask[];
    snoozePanelOpen: boolean;
    setSnoozePanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    snoozeTitle: string;
    setSnoozeTitle: React.Dispatch<React.SetStateAction<string>>;
    snoozeCustomIso: string;
    setSnoozeCustomIso: React.Dispatch<React.SetStateAction<string>>;
    applySnoozeChoice: (afterDays: number | null, customIso?: string) => void;
    renderTaskCard: (task: LegalTask, fatalPulse: boolean) => React.ReactNode;
};

export function DistantTasksSection({
    distantTasks,
    snoozePanelOpen,
    setSnoozePanelOpen,
    snoozeTitle,
    setSnoozeTitle,
    snoozeCustomIso,
    setSnoozeCustomIso,
    applySnoozeChoice,
    renderTaskCard,
}: DistantTasksSectionProps) {
    return (
        <section className="mt-12 pt-4 border-t border-slate-800/90">
            <h2 className="text-lg font-extrabold text-slate-400 flex flex-row-reverse items-center gap-2 mb-5">
                <Hourglass className="size-5 text-slate-500 shrink-0" aria-hidden />
                المهام البعيدة وغير المجدولة
            </h2>
            <DistantTasksBody
                distantTasks={distantTasks}
                snoozePanelOpen={snoozePanelOpen}
                setSnoozePanelOpen={setSnoozePanelOpen}
                snoozeTitle={snoozeTitle}
                setSnoozeTitle={setSnoozeTitle}
                snoozeCustomIso={snoozeCustomIso}
                setSnoozeCustomIso={setSnoozeCustomIso}
                applySnoozeChoice={applySnoozeChoice}
                renderTaskCard={renderTaskCard}
            />
        </section>
    );
}

function DistantTasksBody(props: DistantTasksSectionProps) {
    const {
        distantTasks,
        snoozePanelOpen,
        setSnoozePanelOpen,
        snoozeTitle,
        setSnoozeTitle,
        snoozeCustomIso,
        setSnoozeCustomIso,
        applySnoozeChoice,
        renderTaskCard,
    } = props;

    return (
        <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/35 backdrop-blur-sm px-5 py-6 space-y-5">
            <div className="flex flex-row-reverse flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => setSnoozePanelOpen((o) => !o)}
                    className="text-xs font-extrabold px-4 py-2 rounded-xl border border-amber-500/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15 transition"
                >
                    + إضافة مهمة مؤجلة
                </button>
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
    );
}
