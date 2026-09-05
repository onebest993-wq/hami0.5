import React, { useEffect } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { addDays } from '@/app/utils/localDay';
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
import { TasksManagerFatalDialog } from './TasksManagerFatalDialog';
import { WORK_WEEK } from './constants';
import { formatShortDate } from './utils';
import {
    TASKS_DIALOG_CONTENT,
    TASKS_DIALOG_CONTENT_WIDE,
    TASKS_DIALOG_DESC,
    TASKS_DIALOG_FOOTER,
    TASKS_DIALOG_MUTED,
    TASKS_DIALOG_BTN_CANCEL,
    TASKS_INPUT,
    TASKS_LABEL,
    TASKS_GLASS_PANEL,
    TASKS_BTN_PRIMARY,
    TASKS_BTN_GHOST,
} from './tasksBoucleTheme';
import {
    EditTaskFields,
    ReminderSnoozeActions,
    type EditSubTaskDraft,
} from './TasksManagerModalFields';

export type { EditSubTaskDraft };

export type TasksManagerModalsProps = {
    fatalOpen?: boolean;
    onFatalOpenChange?: (open: boolean) => void;
    onConfirmFatalComplete?: () => void;
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
    postponeTaskId: string | null;
    onDismissPostpone: () => void;
    postponeTarget: LegalTask | null;
    postponeDateYmd: string;
    onPostponeDateYmdChange: (value: string) => void;
    minPostponeIso: string;
    onConfirmPostpone: () => void;
};

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
    postponeTaskId,
    onDismissPostpone,
    postponeTarget,
    postponeDateYmd,
    onPostponeDateYmdChange,
    minPostponeIso,
    onConfirmPostpone,
}: TasksManagerModalsProps) {
    useEffect(() => {
        const keys: string[] = [];
        if (fatalOpen) keys.push('manager-fatal');
        if (deleteConfirmId) keys.push('manager-delete');
        if (editOpen) keys.push('manager-edit');
        if (reminderModalTaskId) keys.push('manager-reminder');
        if (postponeTaskId) keys.push('manager-postpone');
        keys.forEach((key) => blockTasksOverlayEscape(key));
        return () => keys.forEach((key) => unblockTasksOverlayEscape(key));
    }, [fatalOpen, deleteConfirmId, editOpen, reminderModalTaskId, postponeTaskId]);

    return (
        <>
            <TasksManagerFatalDialog
                open={fatalOpen}
                onOpenChange={onFatalOpenChange}
                onConfirm={onConfirmFatalComplete}
            />

            <Dialog
                open={deleteConfirmId !== null}
                onOpenChange={(open) => {
                    if (!open) onDismissDelete();
                }}
            >
                <TasksManagerDialogContent className={TASKS_DIALOG_CONTENT} instant hideCloseButton>
                    <DialogHeader className="text-right space-y-2">
                        <DialogTitle className="text-rose-200 text-base font-extrabold">حذف المهمة</DialogTitle>
                        <DialogDescription className={TASKS_DIALOG_DESC}>
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
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold touch-manipulation"
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
                            className={TASKS_DIALOG_BTN_CANCEL}
                        >
                            إلغاء
                        </button>
                    </DialogFooter>
                </TasksManagerDialogContent>
            </Dialog>

            <Dialog open={editOpen} onOpenChange={onEditOpenChange}>
                <TasksManagerDialogContent className={TASKS_DIALOG_CONTENT_WIDE} instant>
                    <DialogHeader className="text-right space-y-2">
                        <DialogTitle className="text-[#F4F4F5] text-base font-extrabold">تعديل المهمة</DialogTitle>
                        <DialogDescription className={TASKS_DIALOG_MUTED}>
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
                    <DialogFooter className={TASKS_DIALOG_FOOTER}>
                        <button
                            type="button"
                            data-testid="tasks-edit-save"
                            onClick={onSaveEdit}
                            disabled={!editTitle.trim() && !editLocation.trim()}
                            className={`${TASKS_BTN_PRIMARY} disabled:opacity-40`}
                        >
                            حفظ
                        </button>
                        <button
                            type="button"
                            onClick={onCancelEdit}
                            className={TASKS_BTN_GHOST}
                        >
                            إلغاء
                        </button>
                    </DialogFooter>
                </TasksManagerDialogContent>
            </Dialog>

            <Dialog open={reminderModalTaskId !== null} onOpenChange={(o) => !o && onDismissReminder()}>
                <TasksManagerDialogContent className={TASKS_DIALOG_CONTENT}>
                    <DialogHeader className="text-right space-y-2">
                        <DialogTitle className="text-[#E6C673] text-base font-extrabold leading-relaxed">
                            حان وقت التخطيط لهذه المهمة
                        </DialogTitle>
                        <DialogDescription className={`${TASKS_DIALOG_DESC} font-semibold`}>
                            {reminderModalTask?.title ?? ''}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-right py-1">
                        <div>
                            <p className={`${TASKS_DIALOG_MUTED} mb-2`}>نقل إلى يوم محدد (الأسبوع الحالي)</p>
                            <div className="flex flex-col gap-2">
                                {WORK_WEEK.map((d) => {
                                    const dayDate = addDays(weekStartLive, d.offset);
                                    return (
                                        <button
                                            key={d.key}
                                            type="button"
                                            onClick={() => onReminderMoveToDay(dayDate)}
                                            className={`w-full min-h-[44px] py-2.5 text-xs font-extrabold text-[#F4F4F5] touch-manipulation ${TASKS_GLASS_PANEL} hover:border-[#E6C673]/35`}
                                        >
                                            {d.label} — {formatShortDate(dayDate)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="pt-2 border-t border-[#E6C673]/20">
                            <p className={`${TASKS_DIALOG_MUTED} mb-2`}>تأجيل مجدداً</p>
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

            <Dialog open={postponeTaskId !== null} onOpenChange={(o) => !o && onDismissPostpone()}>
                <TasksManagerDialogContent className={TASKS_DIALOG_CONTENT} instant>
                    <DialogHeader className="text-right space-y-2">
                        <DialogTitle className="text-[#E6C673] text-base font-extrabold">ترحيل المهمة</DialogTitle>
                        <DialogDescription className={TASKS_DIALOG_DESC}>
                            {postponeTarget?.title ?? ''}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-right py-2">
                        <p className={TASKS_DIALOG_MUTED}>
                            اختر اليوم الذي تريد نقل المهمة إليه. إن كان داخل الأسبوع الحالي تظهر في الأجندة؛ وإن كان
                            في أسبوع لاحق تنتقل إلى المهام المؤجلة.
                        </p>
                        <label className={TASKS_LABEL}>تاريخ الترحيل</label>
                        <input
                            type="date"
                            dir="ltr"
                            className={TASKS_INPUT}
                            value={postponeDateYmd}
                            min={minPostponeIso}
                            onChange={(e) => onPostponeDateYmdChange(e.target.value)}
                            data-testid="tasks-postpone-date"
                        />
                    </div>
                    <DialogFooter className={TASKS_DIALOG_FOOTER}>
                        <button
                            type="button"
                            data-testid="tasks-postpone-confirm"
                            onClick={onConfirmPostpone}
                            disabled={!postponeDateYmd}
                            className={`${TASKS_BTN_PRIMARY} disabled:opacity-40`}
                        >
                            ترحيل
                        </button>
                        <button type="button" onClick={onDismissPostpone} className={TASKS_BTN_GHOST}>
                            إلغاء
                        </button>
                    </DialogFooter>
                </TasksManagerDialogContent>
            </Dialog>
        </>
    );
}
