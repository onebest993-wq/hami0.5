import { useEffect } from 'react';
import { releaseBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    applyTransactionsEscapeAction,
    resolveTransactionsEscapeAction,
    type TransactionsDetailsEscapeSnapshot,
    type TransactionsEscapeSnapshot,
} from '@/app/components/lawyer/TransactionsThreading/transactionsEscapeStack';

export type UseTransactionsEscapeStackParams = TransactionsEscapeSnapshot & {
    enabled?: boolean;
    onBack: () => void;
    onCloseListAddSheet: () => void;
    onBackToList: () => void;
    onCloseDetailsOverlay: (patch: Partial<TransactionsDetailsEscapeSnapshot>) => void;
};

/** Escape يغلق الطبقة الداخلية ثم يخرج من مركز المعاملات */
export function useTransactionsEscapeStack(params: UseTransactionsEscapeStackParams): void {
    const {
        enabled = true,
        view,
        listAddSheetOpen,
        details,
        onBack,
        onCloseListAddSheet,
        onBackToList,
        onCloseDetailsOverlay,
    } = params;

    useEffect(() => {
        if (!enabled) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();

            const action = resolveTransactionsEscapeAction({ view, listAddSheetOpen, details });
            applyTransactionsEscapeAction(action, {
                onBack: () => {
                    onBack();
                    releaseBodyScrollLock();
                },
                onCloseListAddSheet,
                onBackToList,
                onCloseDetailsOverlay,
            });
        };

        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [
        enabled,
        view,
        listAddSheetOpen,
        details,
        onBack,
        onCloseListAddSheet,
        onBackToList,
        onCloseDetailsOverlay,
    ]);
}
