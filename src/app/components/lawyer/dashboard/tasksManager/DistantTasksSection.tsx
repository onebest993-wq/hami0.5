import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Hourglass } from 'lucide-react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { addDays } from '@/app/utils/nlpParser';
import type { TaskListOrdinal } from './TaskListOrdinalBadge';
import { SnoozedTaskCard } from './SnoozedTaskCard';
import {
    TASKS_SECTION_TITLE,
    TASKS_GLASS_PANEL,
    TASKS_INPUT,
    TASKS_BTN_BRONZE,
} from './tasksBoucleTheme';
import { dateFromYmdInput, formatLocalYmdInput, isDeferredSnoozedTask } from './utils';
import { markTasksDatePickerOpening } from './tasksDatePickerGrace';

export type DistantTasksSectionProps = {
    distantTasks: LegalTask[];
    snoozePanelOpen: boolean;
    setSnoozePanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    saveSnoozedTask: (title: string, dueIso: string) => void;
    minSnoozeIso: string;
    renderTaskCard: (task: LegalTask, fatalPulse: boolean, listOrdinal?: TaskListOrdinal) => React.ReactNode;
    now: Date;
};

export const DistantTasksSection = React.memo(function DistantTasksSection(props: DistantTasksSectionProps) {
    return (
        <section className="mt-10 pt-6 border-t border-[#A67C52]/15" data-testid="tasks-distant-section">
            <h2 className={`${TASKS_SECTION_TITLE} mb-5`}>
                <Hourglass className="size-5 text-[#A67C52]/70 shrink-0" aria-hidden />
                المهام المؤجلة
            </h2>
            <DistantTasksBody {...props} />
        </section>
    );
});

const SnoozeTaskForm = React.memo(function SnoozeTaskForm({
    minSnoozeIso,
    onSave,
}: {
    minSnoozeIso: string;
    onSave: (title: string, dueIso: string) => void;
}) {
    const dateRef = useRef<HTMLInputElement>(null);
    const defaultDueIso = useMemo(() => {
        const minDate = dateFromYmdInput(minSnoozeIso);
        if (!minDate) return minSnoozeIso;
        return formatLocalYmdInput(addDays(minDate, 1));
    }, [minSnoozeIso]);

    const [title, setTitle] = useState('');

    const handleSave = useCallback(() => {
        const dueIso = dateRef.current?.value ?? defaultDueIso;
        onSave(title, dueIso);
    }, [defaultDueIso, onSave, title]);

    return (
        <div
            className={`${TASKS_GLASS_PANEL} p-4 space-y-4 [contain:layout_style_paint]`}
            data-testid="tasks-snooze-form"
        >
            <input
                dir="rtl"
                type="text"
                placeholder="عنوان المهمة…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={TASKS_INPUT}
            />
            <div className="space-y-2 text-right">
                <label
                    htmlFor="tasks-snooze-due-date"
                    className="block text-[11px] font-bold text-[#A67C52]/80"
                >
                    تاريخ القيام بالمهمة
                </label>
                <input
                    ref={dateRef}
                    id="tasks-snooze-due-date"
                    type="date"
                    dir="ltr"
                    lang="ar-IQ"
                    defaultValue={defaultDueIso}
                    min={minSnoozeIso}
                    className={`${TASKS_INPUT} !py-2.5 text-sm touch-manipulation [color-scheme:dark] tabular-nums`}
                    data-testid="tasks-snooze-due-date"
                    onPointerDown={markTasksDatePickerOpening}
                    onFocus={markTasksDatePickerOpening}
                />
            </div>
            <div className="flex flex-row-reverse justify-end">
                <button
                    type="button"
                    data-testid="tasks-snooze-save"
                    onClick={handleSave}
                    disabled={!title.trim()}
                    className={`${TASKS_BTN_BRONZE} min-h-[44px] disabled:opacity-40 touch-manipulation`}
                >
                    حفظ المهمة المؤجلة
                </button>
            </div>
        </div>
    );
});

function DistantTasksBody(props: DistantTasksSectionProps) {
    const {
        distantTasks,
        snoozePanelOpen,
        setSnoozePanelOpen,
        saveSnoozedTask,
        minSnoozeIso,
        renderTaskCard,
        now,
    } = props;

    const { snoozedTasks, otherDistantTasks } = useMemo(() => {
        const snoozed: LegalTask[] = [];
        const other: LegalTask[] = [];
        for (const task of distantTasks) {
            if (isDeferredSnoozedTask(task, now)) snoozed.push(task);
            else other.push(task);
        }
        return { snoozedTasks: snoozed, otherDistantTasks: other };
    }, [distantTasks, now]);

    const handleSaveSnoozed = useCallback(
        (title: string, dueIso: string) => {
            saveSnoozedTask(title, dueIso);
            setSnoozePanelOpen(false);
        },
        [saveSnoozedTask, setSnoozePanelOpen],
    );

    return (
        <div className={`rounded-2xl border border-dashed border-[#A67C52]/25 ${TASKS_GLASS_PANEL} px-5 py-6 space-y-5`}>
            <div className="flex flex-row-reverse flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    data-testid="tasks-snooze-toggle"
                    onClick={() => setSnoozePanelOpen((open) => !open)}
                    className={TASKS_BTN_BRONZE}
                >
                    + إضافة مهمة مؤجلة
                </button>
            </div>

            {snoozePanelOpen ? (
                <SnoozeTaskForm minSnoozeIso={minSnoozeIso} onSave={handleSaveSnoozed} />
            ) : null}

            {snoozedTasks.length > 0 ? (
                <ul className="space-y-2" data-testid="tasks-snoozed-list">
                    {snoozedTasks.map((task, i) => (
                        <SnoozedTaskCard
                            key={task.id}
                            task={task}
                            listOrdinal={{ index: i, total: snoozedTasks.length }}
                        />
                    ))}
                </ul>
            ) : null}
            {otherDistantTasks.length > 0 ? (
                <ul className="space-y-4">
                    {otherDistantTasks.map((t, i) =>
                        renderTaskCard(t, false, { index: i, total: otherDistantTasks.length }),
                    )}
                </ul>
            ) : null}
        </div>
    );
}
