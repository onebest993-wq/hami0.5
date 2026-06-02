import React from 'react';
import { ShieldAlert } from 'lucide-react';
import type { LegalTask } from '@/app/types/TaskEngine';

export type FatalDeadlinesSectionProps = {
    fatalTasks: LegalTask[];
    renderTaskCard: (task: LegalTask, fatalPulse: boolean) => React.ReactNode;
};

export function FatalDeadlinesSection({ fatalTasks, renderTaskCard }: FatalDeadlinesSectionProps) {
    return (
        <section
            className={
                fatalTasks.length === 0
                    ? 'rounded-xl border border-rose-900/40 bg-rose-950/10 px-5 py-4'
                    : 'rounded-2xl border border-rose-500/45 bg-rose-950/20 backdrop-blur-md px-5 py-6 shadow-[0_0_40px_rgba(244,63,94,0.18)]'
            }
            aria-labelledby="fatal-deadlines-heading"
        >
            <h2
                id="fatal-deadlines-heading"
                className={`font-extrabold flex flex-row-reverse items-center gap-2 mb-3 ${
                    fatalTasks.length === 0 ? 'text-sm text-rose-200/80' : 'text-lg text-rose-100'
                }`}
            >
                <ShieldAlert
                    className={`shrink-0 ${fatalTasks.length === 0 ? 'size-4 text-rose-400/80' : 'size-6 text-rose-400'}`}
                    aria-hidden
                />
                مواعيد حتمية قاطعة
            </h2>
            {fatalTasks.length === 0 ? (
                <span className="text-slate-500 text-sm font-medium block text-center py-2">
                    ✅ لا توجد مواعيد حتمية قريبة.
                </span>
            ) : (
                <ul className="space-y-4 mt-2">{fatalTasks.map((t) => renderTaskCard(t, true))}</ul>
            )}
        </section>
    );
}
