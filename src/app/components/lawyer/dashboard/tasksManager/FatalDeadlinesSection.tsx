import React from 'react';
import { ShieldAlert } from 'lucide-react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { TASKS_GLASS_PANEL } from './tasksBoucleTheme';

export type FatalDeadlinesSectionProps = {
    fatalTasks: LegalTask[];
    renderTaskCard: (task: LegalTask, fatalPulse: boolean) => React.ReactNode;
};

export const FatalDeadlinesSection = React.memo(function FatalDeadlinesSection({
    fatalTasks,
    renderTaskCard,
}: FatalDeadlinesSectionProps) {
    const hasTasks = fatalTasks.length > 0;

    return (
        <section
            className={
                hasTasks
                    ? `${TASKS_GLASS_PANEL} border-[#A67C52]/35 px-5 py-6 shadow-[0_0_28px_rgba(166,124,82,0.1)]`
                    : `${TASKS_GLASS_PANEL} border-[#A67C52]/20 px-5 py-4`
            }
            aria-labelledby="fatal-deadlines-heading"
            data-testid="tasks-fatal-section"
        >
            <div className="h-px bg-gradient-to-r from-transparent via-[#A67C52]/30 to-transparent mb-3" />
            <h2
                id="fatal-deadlines-heading"
                className={`font-extrabold flex flex-row-reverse items-center gap-2 mb-3 ${
                    hasTasks ? 'text-lg text-[#E8F5F0]' : 'text-sm text-[#D4B896]/85'
                }`}
            >
                <ShieldAlert
                    className={`shrink-0 ${hasTasks ? 'size-6 text-[#A67C52]' : 'size-4 text-[#A67C52]/70'}`}
                    aria-hidden
                />
                مواعيد حتمية قاطعة
            </h2>
            {hasTasks ? (
                <ul className="space-y-4 mt-2">{fatalTasks.map((t) => renderTaskCard(t, true))}</ul>
            ) : (
                <span
                    className="text-[#6BC4A8]/50 text-sm font-medium block text-center py-2"
                    data-testid="tasks-fatal-empty"
                >
                    لا توجد مواعيد حتمية قريبة.
                </span>
            )}
        </section>
    );
});
