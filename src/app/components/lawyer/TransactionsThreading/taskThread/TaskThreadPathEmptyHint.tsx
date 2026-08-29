import { memo, useState } from 'react';
import { X } from '@/app/components/ui/icons/X';
import { GLASS_BTN, TX_ICON_BTN, TX_TEXT_MUTED, TX_TEXT_PRIMARY, TxGlassPanel } from '../transactionsGlassTheme';
import { emptyPathDismissKey } from './taskThreadUtils';

export const TaskThreadPathEmptyHint = memo(function TaskThreadPathEmptyHint({
    transactionId,
    onImportFromMyTemplates,
    readOnly,
}: {
    transactionId: string;
    onImportFromMyTemplates?: () => void;
    readOnly?: boolean;
}) {
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(emptyPathDismissKey(transactionId)) === '1';
    });

    if (dismissed) return null;

    return (
        <TxGlassPanel className="p-3 relative">
            {!readOnly ? (
                <button
                    type="button"
                    onClick={() => {
                        localStorage.setItem(emptyPathDismissKey(transactionId), '1');
                        setDismissed(true);
                    }}
                    className={`absolute top-2.5 left-2.5 ${TX_ICON_BTN}`}
                    aria-label="إخفاء التلميح"
                >
                    <X className="w-4 h-4" />
                </button>
            ) : null}
            <div className={`${TX_TEXT_PRIMARY} font-semibold text-sm pr-1`}>لا يوجد مسار بعد</div>
            <div className={`${TX_TEXT_MUTED} text-xs mt-1.5 leading-6 font-medium`}>
                أضف مهمة من الزر السفلي أو استورد قالباً جاهزاً.
            </div>
            {!readOnly && onImportFromMyTemplates ? (
                <button type="button" onClick={onImportFromMyTemplates} className={`${GLASS_BTN} mt-3 !text-xs`}>
                    استيراد من قوالبي
                </button>
            ) : null}
        </TxGlassPanel>
    );
});
