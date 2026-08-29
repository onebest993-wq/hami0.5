import { TxThreadDialogFrame } from '../TxThreadDialogFrame';
import { GLASS_BTN, TX_DIALOG_BTN_CANCEL, TX_INNER_SURFACE, TX_TEXT_SECONDARY } from '../transactionsGlassTheme';

export function CompleteTransactionDialog({
    open,
    onOpenChange,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void | Promise<void>;
}) {
    return (
        <TxThreadDialogFrame
            open={open}
            onOpenChange={onOpenChange}
            title="إنهاء المعاملة"
            description="سيتم تحويل المعاملة إلى وضع القراءة فقط"
            footer={
                <>
                    <button type="button" onClick={() => onOpenChange(false)} className={TX_DIALOG_BTN_CANCEL}>
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onOpenChange(false);
                            void onConfirm();
                        }}
                        className={GLASS_BTN + ' !w-auto px-5 h-11'}
                    >
                        تأكيد الإنهاء
                    </button>
                </>
            }
        >
            <div className={`${TX_INNER_SURFACE} p-3 ${TX_TEXT_SECONDARY} text-sm leading-6 font-medium`}>
                بعد الإنهاء لن تتمكن من إضافة مهام أو مستمسكات أو تعديل الحالات.
            </div>
        </TxThreadDialogFrame>
    );
}
