import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { useTransactionsThreadingStore, ensureTransactionsUserBound } from '@/app/modules/transactionsThreading/store';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { resolveInitialTransactionsView } from '@/app/services/transactions/resolveInitialTransactionsView';
import { consumeOpenTransactionsAddSheet } from '@/app/services/transactions/procedureGuideNavigation';

export function useTransactionsHubSessionHydration({
    open,
    userId,
    setUserId,
    refreshTransactions,
    onInitialFocusConsumed,
    focusPendingRef,
    viewRef,
    setView,
    setSelectedId,
    setListAddSheetOpen,
}: {
    open: boolean;
    userId: string;
    setUserId: (userId: string) => Promise<void>;
    refreshTransactions: () => Promise<void>;
    onInitialFocusConsumed?: () => void;
    focusPendingRef: MutableRefObject<string | undefined>;
    viewRef: MutableRefObject<'list' | 'details'>;
    setView: Dispatch<SetStateAction<'list' | 'details'>>;
    setSelectedId: Dispatch<SetStateAction<string | null>>;
    setListAddSheetOpen: Dispatch<SetStateAction<boolean>>;
}): void {
    useEffect(() => {
        if (open) return;
        ensureTransactionsUserBound(userId);
        void setUserId(userId).catch(() => undefined);
    }, [open, setUserId, userId]);

    useEffect(() => {
        if (!open) return;
        ensureTransactionsUserBound(userId);
        let cancelled = false;
        let hydrated = false;

        const applyResolvedView = () => {
            if (cancelled) return;

            const focusId = focusPendingRef.current;
            if (!focusId) {
                if (consumeOpenTransactionsAddSheet()) {
                    setView('list');
                    setSelectedId(null);
                    setListAddSheetOpen(true);
                }
                return;
            }

            const resolved = resolveInitialTransactionsView(
                focusId,
                useTransactionsThreadingStore.getState().transactions,
            );
            if (resolved.missingFocusId) {
                if (hydrated) {
                    SmartToast.warning('تعذر فتح المعاملة المطلوبة');
                    focusPendingRef.current = undefined;
                    onInitialFocusConsumed?.();
                    setView('list');
                    setSelectedId(null);
                }
                return;
            }

            focusPendingRef.current = undefined;
            onInitialFocusConsumed?.();
            viewRef.current = resolved.view;
            setView(resolved.view);
            setSelectedId(resolved.selectedId);
        };

        const warmed = useTransactionsThreadingStore.getState();
        if (warmed.userId === userId) {
            applyResolvedView();
        }

        void (async () => {
            await setUserId(userId);
            if (cancelled) return;
            const afterBind = useTransactionsThreadingStore.getState();
            const focusId = focusPendingRef.current;
            const hasFocus =
                !focusId || (afterBind.transactions ?? []).some((item) => item.id === focusId);

            const runRefresh = async () => {
                try {
                    await refreshTransactions();
                } catch {
                    /* hydrate may still have seeded the store */
                }
                if (cancelled) return;
                hydrated = true;
                applyResolvedView();
            };

            if (hasFocus) {
                applyResolvedView();
                void runRefresh();
                return;
            }
            await runRefresh();
        })();
        return () => {
            cancelled = true;
        };
    }, [onInitialFocusConsumed, open, refreshTransactions, setUserId, userId]);
}
