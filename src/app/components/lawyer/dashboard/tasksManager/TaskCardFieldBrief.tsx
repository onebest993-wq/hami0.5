import React from 'react';
import { MapPinned } from '@/app/components/ui/lucideIcons';
import type { LegalSubTask } from '@/app/types/TaskEngine';
import { TaskRingToggle } from './TaskRingToggle';
import { TaskListOrdinalBadge } from './TaskListOrdinalBadge';

export type TaskCardFieldBriefProps = {
    fieldActions: LegalSubTask[];
    readOnly: boolean;
    onToggleSubComplete: (subId: string) => void;
};

/** إجراءات ميدانية — شريط مضغوط داخل البطاقة */
export function TaskCardFieldBrief({ fieldActions, readOnly, onToggleSubComplete }: TaskCardFieldBriefProps) {
    if (fieldActions.length === 0) return null;

    const showItemOrdinals = fieldActions.length > 1;

    return (
        <div
            className={`rounded-lg border border-[#E6C673]/18 bg-gradient-to-l from-[#E6C673]/12 to-transparent px-2 py-1.5`}
            data-testid="tasks-task-field-brief"
        >
            {showItemOrdinals ? (
                <p className="text-[10px] font-bold text-[#E6C673]/55 text-right mb-1 px-0.5">
                    {fieldActions.length} إجراءات ميدانية
                </p>
            ) : null}
            <ul className="space-y-1">
                {fieldActions.map((st, idx) => (
                    <li
                        key={st.id}
                        className={`flex flex-row-reverse items-center gap-2 rounded-md px-1.5 py-1 min-h-[36px] ${
                            st.isCompleted ? 'opacity-70' : ''
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
                        {showItemOrdinals ? (
                            <TaskListOrdinalBadge
                                ordinal={{ index: idx, total: fieldActions.length }}
                                compact
                                placement="inline"
                                testId={`tasks-task-field-item-ordinal-${st.id}`}
                            />
                        ) : null}
                        <div className="flex-1 min-w-0 text-right">
                            <span
                                className={`block text-[12px] font-bold leading-snug break-words ${
                                    st.isCompleted
                                        ? 'text-[#34D399]/60 line-through decoration-[#34D399]/40'
                                        : 'text-[#F4F4F5]/92'
                                }`}
                            >
                                {st.title}
                            </span>
                            {st.location ? (
                                <p className="mt-0.5 text-[10px] text-[#34D399]/75 flex flex-row-reverse items-center gap-0.5 justify-end truncate">
                                    <MapPinned className="size-2.5 shrink-0 opacity-70" aria-hidden />
                                    {st.location}
                                </p>
                            ) : null}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
