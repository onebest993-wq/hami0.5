import { memo } from 'react';
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

export type TaskThreadDialogState = {
    editOpen: boolean;
    editTarget: TransactionTask | null;
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
            <TransactionsHubDialog
                open={editOpen}
                onOpenChange={(open) => {
                    actions.setEditOpen(open);
                    if (!open) actions.resetEdit();
                }}
                testId="task-thread-edit-dialog"
                ariaLabel="تعديل المهمة"
            >
                <div className={TX_DIALOG_SHELL}>
                    <div className="text-right space-y-1">
                        <h2 className={TX_DIALOG_TITLE}>تعديل المهمة</h2>
                        <p className={TX_DIALOG_DESC}>تعديل العنوان والمهلة (اختياري)</p>
                    </div>
                    <div dir="rtl" className="text-right space-y-3 mt-4">
                        <div>
                            <div className={`${TX_TEXT_MUTED} text-sm mb-2 font-medium`}>عنوان المهمة</div>
                            <input value={editTitle} onChange={(e) => actions.setEditTitle(e.target.value)} className={GLASS_FIELD} />
                        </div>
                        <div>
                            <div className={`${TX_TEXT_MUTED} text-sm mb-2 font-medium`}>تاريخ نفاذ الصلاحية / المهلة</div>
                            <TxDateInput
                                value={editDeadlineDate}
                                onChange={(e) => actions.setEditDeadlineDate(e.target.value)}
                            />
                            <p className={`${TX_TEXT_MUTED} text-[10px] mt-1.5 leading-5 font-medium`}>
                                يُربط تلقائياً بالتقويم للمهام غير المنجزة.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 flex flex-wrap justify-start gap-2">
                        <button type="button" onClick={() => actions.setEditOpen(false)} className={TX_DIALOG_BTN_CANCEL}>
                            إلغاء
                        </button>
                        <button type="button" onClick={actions.saveEdit} className={TX_GOLD_BTN + ' !h-11 !px-5 !text-sm !w-auto'}>
                            حفظ
                        </button>
                    </div>
                </div>
            </TransactionsHubDialog>

            <TransactionsHubDialog
                open={deleteOpen}
                onOpenChange={(open) => {
                    actions.setDeleteOpen(open);
                    if (!open) actions.resetDelete();
                }}
                testId="task-thread-delete-dialog"
                ariaLabel="حذف مهمة"
            >
                <div className={TX_DIALOG_SHELL}>
                    <div className="text-right space-y-1">
                        <h2 className={TX_DIALOG_TITLE}>حذف مهمة</h2>
                        <p className={TX_DIALOG_DESC}>سيتم حذف المهمة من المسار</p>
                    </div>
                    <div dir="rtl" className="text-right mt-4">
                        <div className={`${TX_INNER_SURFACE} p-4 ${TX_TEXT_SECONDARY} text-sm leading-7`}>
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
                    <div className="mt-5 flex flex-wrap justify-start gap-2">
                        <button type="button" onClick={() => actions.setDeleteOpen(false)} className={TX_DIALOG_BTN_CANCEL}>
                            إلغاء
                        </button>
                        <button type="button" onClick={actions.confirmDelete} className={TX_DIALOG_BTN_DANGER}>
                            حذف
                        </button>
                    </div>
                </div>
            </TransactionsHubDialog>

            <TransactionsHubDialog
                open={completeOpen}
                onOpenChange={(open) => {
                    actions.setCompleteOpen(open);
                    if (!open) actions.resetComplete();
                }}
                testId="task-thread-complete-dialog"
                ariaLabel="إكمال المهمة"
            >
                <div className={TX_DIALOG_SHELL}>
                    <div className="text-right space-y-1">
                        <h2 className={TX_DIALOG_TITLE}>إكمال المهمة</h2>
                        <p className={TX_DIALOG_DESC}>إضافة رقم الصادر/الوارد أو الوصل؟ (اختياري)</p>
                    </div>
                    <div dir="rtl" className="text-right mt-4">
                        <div className={`${TX_TEXT_PRIMARY} text-sm font-extrabold truncate`}>{completeTarget?.title}</div>
                        <input
                            value={officialRef}
                            onChange={(e) => actions.setOfficialRef(e.target.value)}
                            placeholder="مثال: 1234"
                            className={`${GLASS_FIELD} mt-3`}
                        />
                    </div>
                    <div className="mt-5 flex flex-wrap justify-start gap-2">
                        <button type="button" onClick={() => actions.setCompleteOpen(false)} className={TX_DIALOG_BTN_CANCEL}>
                            إلغاء
                        </button>
                        <button type="button" onClick={actions.confirmComplete} className={GLASS_BTN + ' !w-auto !h-11 !px-5'}>
                            إكمال
                        </button>
                    </div>
                </div>
            </TransactionsHubDialog>
        </>
    );
});
