import React, { useEffect } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { addDays } from '@/app/utils/nlpParser';
import {
    blockTasksOverlayEscape,
    unblockTasksOverlayEscape,
} from '@/app/components/lawyer/dashboard/fieldTasks/tasksEscapeCoordinator';
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';
import { TasksManagerDialogContent } from './TasksManagerDialogContent';
import { WORK_WEEK } from './constants';
import { formatShortDate } from './utils';

export type EditSubTaskDraft = {
    id: string;
    title: string;
    location: string;
    isCompleted: boolean;
};

export type TasksManagerModalsProps = {
    fatalOpen: boolean;
    onFatalOpenChange: (open: boolean) => void;
    onConfirmFatalComplete: () => void;
    deleteConfirmId: string | null;
    onDismissDelete: () => void;
    onConfirmDelete: () => void;
    editOpen: boolean;
    onEditOpenChange: (open: boolean) => void;
    onCancelEdit: () => void;
    editTarget: LegalTask | null;
    editTitle: string;
    onEditTitleChange: (value: string) => void;
    editLocation: string;
    onEditLocationChange: (value: string) => void;
    editSubTasks: EditSubTaskDraft[];
    onEditSubTaskChange: (subId: string, patch: Partial<Pick<EditSubTaskDraft, 'title' | 'location'>>) => void;
    onRemoveEditSubTask: (subId: string) => void;
    onSaveEdit: () => void;
    reminderModalTaskId: string | null;
    onDismissReminder: () => void;
    reminderModalTask: LegalTask | null;
    reminderSnoozeCustom: string;
    onReminderSnoozeCustomChange: (value: string) => void;
    weekStartLive: Date;
    onReminderMoveToDay: (dayDate: Date) => void;
    onReminderSnoozeDays: (days: number) => void;
    onReminderSnoozeCustomDate: () => void;
};

const TASKS_DIALOG_CONTENT =
    'border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md';

const TASKS_DIALOG_CONTENT_WIDE =
    'border-slate-700 bg-slate-900 text-slate-100 sm:max-w-lg max-h-[90dvh] overflow-y-auto';

export function TasksManagerModals({
    fatalOpen,
    onFatalOpenChange,
    onConfirmFatalComplete,
    deleteConfirmId,
    onDismissDelete,
    onConfirmDelete,
    editOpen,
    onEditOpenChange,
    onCancelEdit,
    editTarget,
    editTitle,
    onEditTitleChange,
    editLocation,
    onEditLocationChange,
    editSubTasks,
    onEditSubTaskChange,
    onRemoveEditSubTask,
    onSaveEdit,
    reminderModalTaskId,
    onDismissReminder,
    reminderModalTask,
    reminderSnoozeCustom,
    onReminderSnoozeCustomChange,
    weekStartLive,
    onReminderMoveToDay,
    onReminderSnoozeDays,
    onReminderSnoozeCustomDate,
}: TasksManagerModalsProps) {
    useEffect(() => {
        const keys: string[] = [];
        if (fatalOpen) keys.push('manager-fatal');
        if (deleteConfirmId) keys.push('manager-delete');
        if (editOpen) keys.push('manager-edit');
        if (reminderModalTaskId) keys.push('manager-reminder');
        keys.forEach((key) => blockTasksOverlayEscape(key));
        return () => keys.forEach((key) => unblockTasksOverlayEscape(key));
    }, [fatalOpen, deleteConfirmId, editOpen, reminderModalTaskId]);

    return (
        <>
            <Dialog open={fatalOpen} onOpenChange={onFatalOpenChange}>
                <TasksManagerDialogContent className={TASKS_DIALOG_CONTENT}>
                    <DialogHeader className="text-right sm:text-right space-y-2">
                        <DialogTitle className="text-rose-200 text-base font-extrabold">موعد حتمي</DialogTitle>
                        <DialogDescription className="text-slate-300 text-sm leading-relaxed">
                            هذا الإجراء مرتبط بسقوط حق أو أجل قطعي. هل تأكدت من إنجازه قبل التحويد؟
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
                        <button
                            type="button"
                            onClick={onConfirmFatalComplete}
                            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-colors"
                        >
                            تأكيد الإكمال
                        </button>
                        <button
                            type="button"
                            onClick={() => onFatalOpenChange(false)}
                            className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-slate-200 text-xs font-bold"
                        >
                            إلغاء
                        </button>
                    </DialogFooter>
                </TasksManagerDialogContent>
            </Dialog>

            <Dialog
                open={deleteConfirmId !== null}
                onOpenChange={(open) => {
                    if (!open) onDismissDelete();
                }}
            >
                <TasksManagerDialogContent className={TASKS_DIALOG_CONTENT} instant hideCloseButton>
                    <DialogHeader className="text-right space-y-2">
                        <DialogTitle className="text-rose-200 text-base font-extrabold">حذف المهمة</DialogTitle>
                        <DialogDescription className="text-slate-300 text-sm leading-relaxed">
                            لن يُمكن استرجاع البيانات بعد الحذف. هل تريد المتابعة؟
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
                        <button
                            type="button"
                            data-testid="tasks-delete-confirm"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                onConfirmDelete();
                            }}
                            className="min-h-[44px] px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold touch-manipulation"
                        >
                            حذف نهائياً
                        </button>
                        <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                onDismissDelete();
                            }}
                            className="min-h-[44px] px-4 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-slate-200 text-xs font-bold touch-manipulation"
                        >
                            إلغاء
                        </button>
                    </DialogFooter>
                </TasksManagerDialogContent>
            </Dialog>

            <Dialog open={editOpen} onOpenChange={onEditOpenChange}>
                <TasksManagerDialogContent className={TASKS_DIALOG_CONTENT_WIDE} instant>
                    <DialogHeader className="text-right space-y-2">
                        <DialogTitle className="text-slate-100 text-base font-extrabold">✏️ تعديل المهمة</DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            {editTarget ? `المعرّف: ${editTarget.id.slice(0, 8)}…` : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <EditTaskFields
                        editTitle={editTitle}
                        onEditTitleChange={onEditTitleChange}
                        editLocation={editLocation}
                        onEditLocationChange={onEditLocationChange}
                        editSubTasks={editSubTasks}
                        onEditSubTaskChange={onEditSubTaskChange}
                        onRemoveEditSubTask={onRemoveEditSubTask}
                    />
                    <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start sticky bottom-0 bg-slate-900 pt-2">
                        <button
                            type="button"
                            data-testid="tasks-edit-save"
                            onClick={onSaveEdit}
                            disabled={!editTitle.trim() && !editLocation.trim()}
                            className="min-h-[44px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold disabled:opacity-40 touch-manipulation"
                        >
                            حفظ
                        </button>
                        <button
                            type="button"
                            onClick={onCancelEdit}
                            className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-slate-200 text-xs font-bold"
                        >
                            إلغاء
                        </button>
                    </DialogFooter>
                </TasksManagerDialogContent>
            </Dialog>

            <Dialog open={reminderModalTaskId !== null} onOpenChange={(o) => !o && onDismissReminder()}>
                <TasksManagerDialogContent className={TASKS_DIALOG_CONTENT}>
                    <DialogHeader className="text-right space-y-2">
                        <DialogTitle className="text-amber-100 text-base font-extrabold leading-relaxed">
                            حان وقت التخطيط لهذه المهمة
                        </DialogTitle>
                        <DialogDescription className="text-slate-300 text-sm font-semibold">
                            {reminderModalTask?.title ?? ''}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-right py-1">
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 mb-2">نقل إلى يوم محدد (الأسبوع الحالي)</p>
                            <div className="flex flex-col gap-2">
                                {WORK_WEEK.map((d) => {
                                    const dayDate = addDays(weekStartLive, d.offset);
                                    return (
                                        <button
                                            key={d.key}
                                            type="button"
                                            onClick={() => onReminderMoveToDay(dayDate)}
                                            className="w-full rounded-xl border border-slate-600 bg-slate-800/50 py-2.5 text-xs font-extrabold text-slate-100 hover:border-amber-500/40"
                                        >
                                            {d.label} — {formatShortDate(dayDate)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="pt-2 border-t border-slate-700/70">
                            <p className="text-[11px] font-bold text-slate-500 mb-2">⏳ تأجيل مجدداً</p>
                            <ReminderSnoozeActions
                                onReminderSnoozeDays={onReminderSnoozeDays}
                                reminderSnoozeCustom={reminderSnoozeCustom}
                                onReminderSnoozeCustomChange={onReminderSnoozeCustomChange}
                                onReminderSnoozeCustomDate={onReminderSnoozeCustomDate}
                            />
                        </div>
                    </div>
                </TasksManagerDialogContent>
            </Dialog>
        </>
    );
}

function EditTaskFields({
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
                <label className="text-[11px] font-bold text-slate-500 block mb-1">تفاصيل المهمة</label>
                <textarea
                    dir="rtl"
                    rows={3}
                    className="w-full rounded-xl border border-slate-600 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500/50 resize-none min-h-[4.5rem]"
                    value={editTitle}
                    onChange={(e) => onEditTitleChange(e.target.value)}
                />
            </div>
            <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">الموقع</label>
                <input
                    dir="rtl"
                    className="w-full rounded-xl border border-slate-600 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
                    value={editLocation}
                    onChange={(e) => onEditLocationChange(e.target.value)}
                    placeholder="اكتب الموقع…"
                />
            </div>
            {editSubTasks.length > 0 ? (
                <div className="border-t border-slate-700/60 pt-3">
                    <p className="text-[11px] font-bold text-sky-300/90 mb-2">الإجراءات الفرعية</p>
                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                        {editSubTasks.map((st, idx) => (
                            <li
                                key={st.id}
                                className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-2.5 space-y-2"
                            >
                                <div className="flex flex-row-reverse items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                                        {idx + 1}. {st.isCompleted ? '(منجز)' : ''}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveEditSubTask(st.id)}
                                        className="text-[10px] font-bold text-rose-300 hover:text-rose-200"
                                    >
                                        حذف
                                    </button>
                                </div>
                                <input
                                    dir="rtl"
                                    className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-2.5 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500/45"
                                    value={st.title}
                                    onChange={(e) => onEditSubTaskChange(st.id, { title: e.target.value })}
                                    placeholder="عنوان الإجراء الفرعي"
                                />
                                <input
                                    dir="rtl"
                                    className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-2.5 py-1.5 text-[11px] text-slate-100 outline-none focus:border-emerald-500/45"
                                    value={st.location}
                                    onChange={(e) => onEditSubTaskChange(st.id, { location: e.target.value })}
                                    placeholder="موقع الفرع (اختياري)"
                                />
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}

function ReminderSnoozeActions({
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
                    className="text-[10px] font-extrabold px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:border-amber-500/40"
                >
                    أسبوع
                </button>
                <button
                    type="button"
                    onClick={() => onReminderSnoozeDays(14)}
                    className="text-[10px] font-extrabold px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:border-amber-500/40"
                >
                    أسبوعين
                </button>
                <button
                    type="button"
                    onClick={() => onReminderSnoozeDays(30)}
                    className="text-[10px] font-extrabold px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:border-amber-500/40"
                >
                    شهر
                </button>
            </div>
            <div className="mt-3 flex flex-row-reverse flex-wrap gap-2 items-center justify-end">
                <input
                    type="date"
                    className="rounded-lg border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-100"
                    value={reminderSnoozeCustom}
                    onChange={(e) => onReminderSnoozeCustomChange(e.target.value)}
                />
                <button
                    type="button"
                    onClick={onReminderSnoozeCustomDate}
                    className="text-[10px] font-extrabold px-3 py-1.5 rounded-lg bg-amber-600/80 text-white"
                >
                    مخصص
                </button>
            </div>
        </>
    );
}
