import { TxThreadDialogFrame } from '../TxThreadDialogFrame';
import { GLASS_BTN, TX_INNER_SURFACE, TX_TEXT_SECONDARY } from '../transactionsGlassTheme';

export function ClientReportDialog({
    open,
    onOpenChange,
    reportText,
    copied,
    onCopy,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reportText: string;
    copied: boolean;
    onCopy: () => void | Promise<void>;
}) {
    return (
        <TxThreadDialogFrame
            open={open}
            onOpenChange={onOpenChange}
            title="تحديث الموكل"
            description="نص جاهز للنسخ"
            footer={
                <button type="button" onClick={() => void onCopy()} className={GLASS_BTN + ' !w-auto px-5 h-11'}>
                    {copied ? 'تم النسخ' : 'نسخ النص'}
                </button>
            }
        >
            <div
                className={`${TX_INNER_SURFACE} p-3 ${TX_TEXT_SECONDARY} text-sm whitespace-pre-wrap leading-6 max-h-[46dvh] overflow-y-auto font-medium`}
            >
                {reportText}
            </div>
        </TxThreadDialogFrame>
    );
}
