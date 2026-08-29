import { clampTransactionText, TX_TEMPLATE_NAME_MAX } from '@/app/services/transactions/transactionsInputSecurity';
import { TxThreadDialogFrame } from '../TxThreadDialogFrame';
import {
    GLASS_BTN,
    GLASS_FIELD,
    TX_DIALOG_BTN_CANCEL,
    TX_INNER_SURFACE,
    TX_TEXT_MUTED,
} from '../transactionsGlassTheme';

export function SaveTemplateDialog({
    open,
    onOpenChange,
    canSave,
    templateName,
    onTemplateNameChange,
    onSave,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    canSave: boolean;
    templateName: string;
    onTemplateNameChange: (value: string) => void;
    onSave: () => void;
}) {
    return (
        <TxThreadDialogFrame
            open={open}
            onOpenChange={onOpenChange}
            title="حفظ المسار كقالب"
            description="سيظهر القالب ضمن “قوالبي” للاستيراد لاحقاً"
            footer={
                <>
                    <button type="button" onClick={() => onOpenChange(false)} className={TX_DIALOG_BTN_CANCEL}>
                        إلغاء
                    </button>
                    <button
                        type="button"
                        disabled={!canSave}
                        onClick={onSave}
                        className={GLASS_BTN + ' !w-auto px-5 h-11 disabled:opacity-45'}
                    >
                        حفظ
                    </button>
                </>
            }
        >
            <div className="space-y-3">
                {!canSave ? (
                    <div className={`${TX_INNER_SURFACE} p-3 ${TX_TEXT_MUTED} text-xs leading-5 font-medium`}>
                        أضف مهمة واحدة على الأقل في المسار قبل حفظ القالب.
                    </div>
                ) : null}
                <div>
                    <label htmlFor="transactions-template-name" className={`${TX_TEXT_MUTED} text-[11px] font-bold mb-1.5 block`}>
                        اسم القالب
                    </label>
                    <input
                        id="transactions-template-name"
                        value={templateName}
                        onChange={(e) => onTemplateNameChange(clampTransactionText(e.target.value, TX_TEMPLATE_NAME_MAX))}
                        className={GLASS_FIELD}
                        placeholder="مثال: مسار قسام شرعي"
                        disabled={!canSave}
                        autoComplete="off"
                        enterKeyHint="done"
                        autoCapitalize="sentences"
                    />
                </div>
            </div>
        </TxThreadDialogFrame>
    );
}
