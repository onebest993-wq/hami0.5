import { memo, type ReactNode } from 'react';
import type { TransactionTask } from '@/app/modules/transactionsThreading/types';
import { TransactionsHubDialog } from '../TransactionsHubDialog';
import {
    GLASS_BTN,
    GLASS_FIELD,
    TX_DIALOG_BTN_CANCEL,
    TX_DIALOG_BTN_DANGER,
    TX_DIALOG_DESC,
    TX_DIALOG_SHELL,
    TX_DIALOG_TITLE,
    TX_GOLD_BTN,
    TX_INNER_SURFACE,
    TX_TEXT_MUTED,
    TX_TEXT_PRIMARY,
    TX_TEXT_SECONDARY,
} from '../transactionsGlassTheme';
import { TxDateInput } from '../TxDateInput';
import { clampTransactionText, TX_OFFICIAL_REF_MAX, TX_TASK_TITLE_MAX } from '@/app/services/transactions/transactionsInputSecurity';

export type TaskThreadDialogState = {
    editOpen: boolean;
    editTitle: string;
    editDeadlineDate: string;
    deleteOpen: boolean;
    deleteTarget: TransactionTask | null;
    deleteCount: number;
    completeOpen: boolean;
    completeTarget: TransactionTask | null;
    officialRef: string;
};

export type TaskThreadDialogActions = {
    setEditOpen: (open: boolean) => void;
    setEditTitle: (value: string) => void;
    setEditDeadlineDate: (value: string) => void;
    resetEdit: () => void;
    saveEdit: () => void;
    setDeleteOpen: (open: boolean) => void;
    resetDelete: () => void;
    confirmDelete: () => void;
    setCompleteOpen: (open: boolean) => void;
    setOfficialRef: (value: string) => void;
    resetComplete: () => void;
    confirmComplete: () => void;
};
function TaskThreadDialogShell({
    open,
    onOpenChange,
    testId,
    ariaLabel,
    title,
    description,
    children,
    footer,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    testId: string;
    ariaLabel: string;
    title: string;
    description: string;
    children: ReactNode;
    footer: ReactNode;
}) {
    return (
        <TransactionsHubDialog open={open} onOpenChange={onOpenChange} testId={testId} ariaLabel={ariaLabel}>
            <div className={TX_DIALOG_SHELL}>
                <div className="text-right space-y-1">
                    <h2 className={TX_DIALOG_TITLE}>{title}</h2>
                    <p className={TX_DIALOG_DESC}>{description}</p>
                </div>
                {children}
                <div className="mt-4 flex flex-wrap justify-start gap-2">{footer}</div>
            </div>
        </TransactionsHubDialog>
    );
}

export const TaskThreadDialogs = memo(function TaskThreadDialogs({
    state,
    actions,
}: {
    state: TaskThreadDialogState;
    actions: TaskThreadDialogActions;
}) {
    const {
        editOpen,
        editTitle,
        editDeadlineDate,
        deleteOpen,
        deleteTarget,
        deleteCount,
        completeOpen,
        completeTarget,
        officialRef,
    } = state;

    return (
        <>
            {editOpen ? (
                <TaskThreadDialogShell
                    open={editOpen}
                    onOpenChange={(open) => {
                        actions.setEditOpen(open);
                        if (!open) actions.resetEdit();
                    }}
                    testId="task-thread-edit-dialog"
                    ariaLabel="تعديل المهمة"
                    title="تعديل المهمة"
                    description="تعديل العنوان والمهلة (اختياري)"
                    footer={
                        <>
                            <button type="button" onClick={() => actions.setEditOpen(false)} className={TX_DIALOG_BTN_CANCEL}>
                                إلغاء
                            </button>
                            <button type="button" onClick={actions.saveEdit} className={TX_GOLD_BTN + ' !h-11 !px-5 !text-sm !w-auto'}>
                                حفظ
                            </button>
                        </>
                    }
                >
                    <div dir="rtl" className="text-right space-y-3 mt-4">
                        <div>
                            <label htmlFor="task-thread-edit-title" className={`${TX_TEXT_MUTED} text-[11px] mb-1.5 font-bold block`}>عنوان المهمة</label>
                            <input
                                id="task-thread-edit-title"
                                value={editTitle}
                                onChange={(e) =>
                                    actions.setEditTitle(clampTransactionText(e.target.value, TX_TASK_TITLE_MAX))
                                }
                                className={GLASS_FIELD}
                                autoComplete="off"
                                enterKeyHint="done"
                                autoCapitalize="sentences"
                            />
                        </div>
                        <div>
                            <div className={`${TX_TEXT_MUTED} text-[11px] mb-1.5 font-bold`}>تاريخ نفاذ الصلاحية / المهلة</div>
                            <TxDateInput
                                value={editDeadlineDate}
                                onChange={(e) => actions.setEditDeadlineDate(e.target.value)}
                            />
                            <p className={`${TX_TEXT_MUTED} text-[10px] mt-1.5 leading-5 font-medium`}>
                                يُربط تلقائياً بالتقويم للمهام غير المنجزة.
                            </p>
                        </div>
                    </div>
                </TaskThreadDialogShell>
            ) : null}

            {deleteOpen ? (
                <TaskThreadDialogShell
                    open={deleteOpen}
                    onOpenChange={(open) => {
                        actions.setDeleteOpen(open);
                        if (!open) actions.resetDelete();
                    }}
                    testId="task-thread-delete-dialog"
                    ariaLabel="حذف مهمة"
                    title="حذف مهمة"
                    description="سيتم حذف المهمة من المسار"
                    footer={
                        <>
                            <button type="button" onClick={() => actions.setDeleteOpen(false)} className={TX_DIALOG_BTN_CANCEL}>
                                إلغاء
                            </button>
                            <button type="button" onClick={actions.confirmDelete} className={TX_DIALOG_BTN_DANGER}>
                                حذف
                            </button>
                        </>
                    }
                >
                    <div dir="rtl" className="text-right mt-4">
                        <div className={`${TX_INNER_SURFACE} p-3 ${TX_TEXT_SECONDARY} text-sm leading-6`}>
                            {deleteCount > 1 ? (
                                <div>
                                    هذه المهمة تحتوي على مهام متفرعة. سيتم حذف {deleteCount} مهام (حذف تسلسلي).
                                </div>
                            ) : (
                                <div>هل أنت متأكد من حذف هذه المهمة؟</div>
                            )}
                            <div className={`mt-2 ${TX_TEXT_PRIMARY} font-extrabold truncate`}>{deleteTarget?.title}</div>
                        </div>
                    </div>
                </TaskThreadDialogShell>
            ) : null}

            {completeOpen ? (
                <TaskThreadDialogShell
                    open={completeOpen}
                    onOpenChange={(open) => {
                        actions.setCompleteOpen(open);
                        if (!open) actions.resetComplete();
                    }}
                    testId="task-thread-complete-dialog"
                    ariaLabel="إكمال المهمة"
                    title="إكمال المهمة"
                    description="إضافة رقم الصادر/الوارد أو الوصل؟ (اختياري)"
                    footer={
                        <>
                            <button type="button" onClick={() => actions.setCompleteOpen(false)} className={TX_DIALOG_BTN_CANCEL}>
                                إلغاء
                            </button>
                            <button type="button" onClick={actions.confirmComplete} className={GLASS_BTN + ' !w-auto !h-11 !px-5'}>
                                إكمال
                            </button>
                        </>
                    }
                >
                    <div dir="rtl" className="text-right mt-4">
                        <div className={`${TX_TEXT_PRIMARY} text-sm font-extrabold truncate`}>{completeTarget?.title}</div>
                        <input
                            id="task-thread-official-ref"
                            value={officialRef}
                            onChange={(e) =>
                                actions.setOfficialRef(clampTransactionText(e.target.value, TX_OFFICIAL_REF_MAX))
                            }
                            placeholder="مثال: 1234"
                            className={`${GLASS_FIELD} mt-3`}
                            autoComplete="off"
                            enterKeyHint="done"
                            inputMode="numeric"
                        />
                    </div>
                </TaskThreadDialogShell>
            ) : null}
        </>
    );
});
