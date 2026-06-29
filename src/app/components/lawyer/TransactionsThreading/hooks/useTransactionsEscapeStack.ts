import { useEffect } from 'react';
import { releaseBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
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
            switch (action) {
                case 'close-report':
                    onCloseDetailsOverlay({ reportOpen: false });
                    break;
                case 'close-complete':
                    onCloseDetailsOverlay({ completeOpen: false });
                    break;
                case 'close-save-template':
                    onCloseDetailsOverlay({ saveTemplateOpen: false });
                    break;
                case 'close-templates':
                    onCloseDetailsOverlay({ templatesOpen: false });
                    break;
                case 'close-add-task':
                    onCloseDetailsOverlay({ addTaskSheetOpen: false });
                    break;
                case 'close-task-complete':
                    onCloseDetailsOverlay({ taskCompleteOpen: false });
                    break;
                case 'close-task-edit':
                    onCloseDetailsOverlay({ taskEditOpen: false });
                    break;
                case 'close-task-delete':
                    onCloseDetailsOverlay({ taskDeleteOpen: false });
                    break;
                case 'close-add-transaction':
                    onCloseListAddSheet();
                    break;
                case 'back-to-list':
                    onBackToList();
                    break;
                case 'exit-hub':
                    onBack();
                    releaseBodyScrollLock();
                    break;
                default:
                    break;
            }
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
