import type { TransactionDocument } from '@/app/modules/transactionsThreading/types';
import { TxThreadDialogFrame } from './TxThreadDialogFrame';
import {
    TX_DIALOG_BTN_CANCEL,
    TX_DIALOG_BTN_DANGER,
    TX_INNER_SURFACE,
    TX_TEXT_PRIMARY,
    TX_TEXT_SECONDARY,
} from './transactionsGlassTheme';

export function DocumentsDeleteDialog({
    open,
    onOpenChange,
    target,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    target: TransactionDocument | null;
    onConfirm: () => void | Promise<void>;
}) {
    return (
        <TxThreadDialogFrame
            open={open}
            onOpenChange={onOpenChange}
            title="حذف مستمسك"
            description="سيتم حذف المستمسك من هذه المعاملة"
            footer={
                <>
                    <button type="button" onClick={() => onOpenChange(false)} className={TX_DIALOG_BTN_CANCEL}>
                        إلغاء
                    </button>
                    <button type="button" onClick={() => void onConfirm()} className={TX_DIALOG_BTN_DANGER}>
                        حذف
                    </button>
                </>
            }
        >
            <div className={`${TX_INNER_SURFACE} p-3 ${TX_TEXT_SECONDARY} text-sm leading-6`}>
                هل أنت متأكد من حذف المستمسك؟
                <div className={`mt-1.5 ${TX_TEXT_PRIMARY} font-extrabold truncate`}>{target?.title}</div>
            </div>
        </TxThreadDialogFrame>
    );
}
