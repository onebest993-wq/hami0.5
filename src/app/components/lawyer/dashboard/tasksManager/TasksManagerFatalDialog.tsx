import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';
import { TasksManagerDialogContent } from './TasksManagerDialogContent';
import { TASKS_DIALOG_BTN_CANCEL, TASKS_DIALOG_CONTENT, TASKS_DIALOG_DESC } from './tasksBoucleTheme';

type TasksManagerFatalDialogProps = {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onConfirm?: () => void;
};

export function TasksManagerFatalDialog({
    open,
    onOpenChange,
    onConfirm,
}: TasksManagerFatalDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <TasksManagerDialogContent className={TASKS_DIALOG_CONTENT}>
                <DialogHeader className="text-right sm:text-right space-y-2">
                    <DialogTitle className="text-rose-200 text-base font-extrabold">موعد حتمي</DialogTitle>
                    <DialogDescription className={TASKS_DIALOG_DESC}>
                        هذا الإجراء مرتبط بسقوط حق أو أجل قطعي. هل تأكدت من إنجازه قبل التحويد؟
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-colors touch-manipulation"
                    >
                        تأكيد الإكمال
                    </button>
                    <button
                        type="button"
                        onClick={() => onOpenChange?.(false)}
                        className={TASKS_DIALOG_BTN_CANCEL}
                    >
                        إلغاء
                    </button>
                </DialogFooter>
            </TasksManagerDialogContent>
        </Dialog>
    );
}
