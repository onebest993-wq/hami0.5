import { memo, useState } from 'react';
import { CloseIcon } from '../transactionsTheme/icons';
import { TX_GOLD_BTN, TX_ICON_BTN, TX_TEXT_MUTED, TX_TEXT_PRIMARY } from '../transactionsGlassTheme';
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
        <div className="relative py-3">
            {!readOnly ? (
                <button
                    type="button"
                    onClick={() => {
                        localStorage.setItem(emptyPathDismissKey(transactionId), '1');
                        setDismissed(true);
                    }}
                    className={`absolute top-2 left-0 ${TX_ICON_BTN}`}
                    aria-label="إخفاء التلميح"
                >
                    <CloseIcon className="w-4 h-4" />
                </button>
            ) : null}
            <div className={`${TX_TEXT_PRIMARY} font-semibold text-sm`}>لا يوجد مسار بعد</div>
            <div className={`${TX_TEXT_MUTED} text-xs mt-1.5 leading-6 font-medium`}>
                أضف مهمة من الزر السفلي أو استورد قالباً جاهزاً.
            </div>
            {!readOnly && onImportFromMyTemplates ? (
                <button type="button" onClick={onImportFromMyTemplates} className={`${TX_GOLD_BTN} mt-2`}>
                    استيراد من قوالبي
                </button>
            ) : null}
        </div>
    );
});
