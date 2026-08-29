import React, { useState } from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import type { LegalSubTask } from '@/app/types/TaskEngine';
import { CURTAIN_GLASS_INNER, TASKS_INNER_GLASS_HOVER, TASKS_INNER_GLASS_SOFT } from './tasksBoucleTheme';
import { TaskRingToggle } from './TaskRingToggle';

export type TaskSubTasksCollapsibleProps = {
    subTasks: LegalSubTask[];
    readOnly: boolean;
    onToggleSubComplete: (subId: string) => void;
    /** تسمية القسم — افتراضي: إجراءات فرعية */
    sectionLabel?: string;
    /** صنف الحاوية الداخلية للعناصر غير المكتملة */
    innerGlassClass?: string;
    /** أزرار الإكمال مضغوطة (ستارة الميدان) */
    compactActions?: boolean;
    testIdPrefix?: string;
};

export function TaskSubTasksCollapsible({
    subTasks,
    readOnly,
    onToggleSubComplete,
    sectionLabel = 'إجراءات فرعية',
    innerGlassClass = `border-[#E6C673]/18 ${TASKS_INNER_GLASS_SOFT}`,
    compactActions = false,
    testIdPrefix,
}: TaskSubTasksCollapsibleProps) {
    const [open, setOpen] = useState(false);
    const activeSubs = subTasks.filter((s) => !s.isCompleted);
    if (subTasks.length === 0) return null;

    return (
        <div className="mt-2 border-t border-[#E6C673]/15 pt-2">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`w-full min-h-[44px] flex flex-row-reverse items-center justify-between gap-2 rounded-md px-1 py-0.5 ${TASKS_INNER_GLASS_HOVER} touch-manipulation`}
                aria-expanded={open}
                data-testid={testIdPrefix ? `${testIdPrefix}-subs-toggle` : undefined}
            >
                <span className="text-[11px] font-bold text-[#C9A85C]/90">
                    {sectionLabel} ({subTasks.length}
                    {activeSubs.length > 0 ? ` · ${activeSubs.length} متبق` : ''})
                </span>
                <ChevronDown
                    className={`size-4 text-[#E6C673]/70 shrink-0 transition-transform duration-150 ${
                        open ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                />
            </button>
            {open ? (
                <ul className="mt-1.5 space-y-1">
                    {subTasks.map((st, idx) => (
                        <li
                            key={st.id}
                            data-testid={testIdPrefix ? `${testIdPrefix}-sub-${st.id}` : undefined}
                            className={`rounded-md border px-1.5 py-1 flex flex-row-reverse items-center gap-2 min-h-[44px] ${
                                st.isCompleted
                                    ? 'border-[#059669]/20 bg-[#059669]/8 opacity-75'
                                    : compactActions
                                      ? `${CURTAIN_GLASS_INNER} border-white/[0.06]`
                                      : `border-[#E6C673]/18 ${innerGlassClass}`
                            }`}
                        >
                            <TaskRingToggle
                                checked={st.isCompleted}
                                disabled={readOnly}
                                label={st.isCompleted ? `إلغاء إنجاز: ${st.title}` : `إنجاز: ${st.title}`}
                                onToggle={() => onToggleSubComplete(st.id)}
                                tone="emerald"
                                size="sm"
                            />
                            <div className="flex-1 min-w-0 text-right">
                                <div className="flex flex-row-reverse items-center gap-1">
                                    <span className="text-[10px] text-[#E6C673]/50 tabular-nums">{idx + 1}.</span>
                                    <span
                                        className={`text-[12px] font-bold leading-snug break-words ${
                                            st.isCompleted
                                                ? 'text-[#F4F4F5]/40 line-through decoration-[#34D399]/35'
                                                : 'text-[#F4F4F5]'
                                        }`}
                                    >
                                        {st.title}
                                    </span>
                                </div>
                                {st.location ? (
                                    <p className="mt-0.5 text-[10px] text-[#34D399]/75 truncate">{st.location}</p>
                                ) : null}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
