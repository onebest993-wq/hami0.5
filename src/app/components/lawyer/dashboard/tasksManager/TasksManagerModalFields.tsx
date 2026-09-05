import {
    TASKS_BTN_BRONZE,
    TASKS_BTN_GHOST,
    TASKS_DIALOG_MUTED,
    TASKS_DIALOG_SUBPANEL,
    TASKS_INPUT,
    TASKS_LABEL,
} from './tasksBoucleTheme';

export type EditSubTaskDraft = {
    id: string;
    title: string;
    location: string;
    isCompleted: boolean;
};

export function EditTaskFields({
    editTitle,
    onEditTitleChange,
    editLocation,
    onEditLocationChange,
    editSubTasks,
    onEditSubTaskChange,
    onRemoveEditSubTask,
}: {
    editTitle: string;
    onEditTitleChange: (v: string) => void;
    editLocation: string;
    onEditLocationChange: (v: string) => void;
    editSubTasks: EditSubTaskDraft[];
    onEditSubTaskChange: (subId: string, patch: Partial<Pick<EditSubTaskDraft, 'title' | 'location'>>) => void;
    onRemoveEditSubTask: (subId: string) => void;
}) {
    return (
        <div className="space-y-3 text-right py-2">
            <div>
                <label className={TASKS_LABEL}>تفاصيل المهمة</label>
                <textarea
                    dir="rtl"
                    rows={3}
                    className={`${TASKS_INPUT} resize-none min-h-[4.5rem]`}
                    value={editTitle}
                    onChange={(e) => onEditTitleChange(e.target.value)}
                    enterKeyHint="done"
                />
            </div>
            <div>
                <label className={TASKS_LABEL}>الموقع</label>
                <input
                    dir="rtl"
                    className={TASKS_INPUT}
                    value={editLocation}
                    onChange={(e) => onEditLocationChange(e.target.value)}
                    enterKeyHint="done"
                />
            </div>
            {editSubTasks.length > 0 ? (
                <div className="border-t border-[#E6C673]/20 pt-3">
                    <p className="text-[11px] font-bold text-[#34D399]/80 mb-2">الإجراءات الفرعية</p>
                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                        {editSubTasks.map((st, idx) => (
                            <li key={st.id} className={TASKS_DIALOG_SUBPANEL}>
                                <div className="flex flex-row-reverse items-center justify-between gap-2">
                                    <span className={`${TASKS_DIALOG_MUTED} tabular-nums`}>
                                        {idx + 1}. {st.isCompleted ? '(منجز)' : ''}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveEditSubTask(st.id)}
                                        className="min-h-[44px] min-w-[44px] px-2 text-[10px] font-bold text-rose-300 hover:text-rose-200 touch-manipulation"
                                    >
                                        حذف
                                    </button>
                                </div>
                                <input
                                    dir="rtl"
                                    className={TASKS_INPUT}
                                    value={st.title}
                                    onChange={(e) => onEditSubTaskChange(st.id, { title: e.target.value })}
                                    enterKeyHint="done"
                                />
                                <input
                                    dir="rtl"
                                    className={TASKS_INPUT}
                                    value={st.location}
                                    onChange={(e) => onEditSubTaskChange(st.id, { location: e.target.value })}
                                    enterKeyHint="done"
                                />
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}

export function ReminderSnoozeActions({
    onReminderSnoozeDays,
    reminderSnoozeCustom,
    onReminderSnoozeCustomChange,
    onReminderSnoozeCustomDate,
}: {
    onReminderSnoozeDays: (days: number) => void;
    reminderSnoozeCustom: string;
    onReminderSnoozeCustomChange: (v: string) => void;
    onReminderSnoozeCustomDate: () => void;
}) {
    return (
        <>
            <div className="flex flex-row-reverse flex-wrap gap-2 justify-end">
                <button
                    type="button"
                    onClick={() => onReminderSnoozeDays(7)}
                    className={`${TASKS_BTN_GHOST} text-[10px] px-3 py-1.5`}
                >
                    أسبوع
                </button>
                <button
                    type="button"
                    onClick={() => onReminderSnoozeDays(14)}
                    className={`${TASKS_BTN_GHOST} text-[10px] px-3 py-1.5`}
                >
                    أسبوعين
                </button>
                <button
                    type="button"
                    onClick={() => onReminderSnoozeDays(30)}
                    className={`${TASKS_BTN_GHOST} text-[10px] px-3 py-1.5`}
                >
                    شهر
                </button>
            </div>
            <div className="mt-3 flex flex-row-reverse flex-wrap gap-2 items-center justify-end">
                <input
                    type="date"
                    className={`${TASKS_INPUT} w-auto min-h-[44px] text-base py-2.5`}
                    value={reminderSnoozeCustom}
                    onChange={(e) => onReminderSnoozeCustomChange(e.target.value)}
                />
                <button
                    type="button"
                    onClick={onReminderSnoozeCustomDate}
                    className={`${TASKS_BTN_BRONZE} text-[10px] px-3 py-1.5`}
                >
                    مخصص
                </button>
            </div>
        </>
    );
}
