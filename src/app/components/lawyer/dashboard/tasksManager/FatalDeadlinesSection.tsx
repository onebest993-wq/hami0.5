import React from 'react';
import { ShieldAlert } from 'lucide-react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { TASKS_GLASS_PANEL } from './tasksBoucleTheme';

export type FatalDeadlinesSectionProps = {
    fatalTasks: LegalTask[];
    renderTaskCard: (task: LegalTask, fatalPulse: boolean) => React.ReactNode;
};

export function FatalDeadlinesSection({ fatalTasks, renderTaskCard }: FatalDeadlinesSectionProps) {
    return (
        <section
            className={
                fatalTasks.length === 0
                    ? `${TASKS_GLASS_PANEL} border-rose-900/30 px-5 py-4`
                    : `${TASKS_GLASS_PANEL} border-rose-500/40 px-5 py-6 shadow-[0_0_32px_rgba(244,63,94,0.12)]`
            }
            aria-labelledby="fatal-deadlines-heading"
        >
            <h2
                id="fatal-deadlines-heading"
                className={`font-extrabold flex flex-row-reverse items-center gap-2 mb-3 ${
                    fatalTasks.length === 0 ? 'text-sm text-rose-200/75' : 'text-lg text-rose-100'
                }`}
            >
                <ShieldAlert
                    className={`shrink-0 ${fatalTasks.length === 0 ? 'size-4 text-rose-400/70' : 'size-6 text-rose-400'}`}
                    aria-hidden
                />
                مواعيد حتمية قاطعة
            </h2>
            {fatalTasks.length === 0 ? (
                <span className="text-[#6BC4A8]/50 text-sm font-medium block text-center py-2">
                    لا توجد مواعيد حتمية قريبة.
                </span>
            ) : (
                <ul className="space-y-4 mt-2">{fatalTasks.map((t) => renderTaskCard(t, true))}</ul>
            )}
        </section>
    );
}
