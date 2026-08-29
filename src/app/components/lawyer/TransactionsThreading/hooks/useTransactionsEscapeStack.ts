import { useEffect } from 'react';
import { releaseBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';
import {
    applyTransactionsEscapeAction,
    resolveTransactionsEscapeAction,
    type TransactionsDetailsEscapeSnapshot,
    type TransactionsEscapeSnapshot,
} from '../transactionsEscapeStack';

type UseTransactionsEscapeStackParams = TransactionsEscapeSnapshot & {
    enabled?: boolean;
    onBack: () => void;
    onCloseListAddSheet: () => void;
    onBackToList: () => void;
    onCloseDetailsOverlay: (patch: Partial<TransactionsDetailsEscapeSnapshot>) => void;
};

/** Escape + زر الرجوع الأندرويد — يغلق الطبقة الداخلية ثم يخرج من مركز المعاملات */
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

        const consumeBackStack = (): boolean => {
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
            return true;
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            consumeBackStack();
        };

        window.addEventListener('keydown', onKeyDown, true);
        const unregisterNativeBack = registerNativeBackHandler(() => consumeBackStack());
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
        };
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
