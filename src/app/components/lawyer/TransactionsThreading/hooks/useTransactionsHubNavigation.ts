import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import { useTransactionsThreadingStore, ensureTransactionsUserBound } from '@/app/modules/transactionsThreading/store';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { resolveInitialTransactionsView } from '@/app/services/transactions/resolveInitialTransactionsView';
import {
    consumeOpenTransactionsAddSheet,
    subscribeOpenTransactionsHub,
} from '@/app/services/transactions/procedureGuideNavigation';
import { useTransactionsEscapeStack } from './useTransactionsEscapeStack';
import { useTransactionsHubSessionHydration } from './useTransactionsHubSessionHydration';
import { useTransactionsOpenInteractionGuard } from './useTransactionsOpenInteractionGuard';
import {
    applyTransactionsEscapeAction,
    isSameTransactionsDetailsEscape,
    resolveTransactionsEscapeAction,
    type TransactionsDetailsEscapeSnapshot,
} from '../transactionsEscapeStack';

export function useTransactionsHubNavigation({
    onBack,
    userId,
    initialTransactionId,
    onInitialFocusConsumed,
    open,
}: {
    onBack: () => void;
    userId: string;
    initialTransactionId?: string;
    onInitialFocusConsumed?: () => void;
    open: boolean;
}) {
    const refreshTransactions = useTransactionsThreadingStore((s) => s.refreshTransactions);
    const setUserId = useTransactionsThreadingStore((s) => s.setUserId);
    const [view, setView] = useState<'list' | 'details'>('list');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [listAddSheetOpen, setListAddSheetOpen] = useState(false);
    const [detailsEscape, setDetailsEscape] = useState<TransactionsDetailsEscapeSnapshot | null>(null);
    const closeDetailsOverlayRef = useRef<(patch: Partial<TransactionsDetailsEscapeSnapshot>) => void>(
        () => undefined,
    );
    const wasOpenRef = useRef(false);
    const focusPendingRef = useRef<string | undefined>();
    const viewRef = useRef<'list' | 'details'>('list');
    viewRef.current = view;

    const cardsInteractive = useTransactionsOpenInteractionGuard(open);

    useLayoutEffect(() => {
        if (open && !wasOpenRef.current) {
            focusPendingRef.current = initialTransactionId?.trim() || undefined;
        }
        if (!open) {
            focusPendingRef.current = undefined;
        }
        wasOpenRef.current = open;
    }, [open, initialTransactionId]);

    useEffect(() => {
        if (open) return;
        setListAddSheetOpen(false);
        setView('list');
        setSelectedId(null);
        setDetailsEscape(null);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        return subscribeOpenTransactionsHub((detail) => {
            if (!detail.openAddSheet) return;
            consumeOpenTransactionsAddSheet();
            setView('list');
            setSelectedId(null);
            setDetailsEscape(null);
            setListAddSheetOpen(true);
        });
    }, [open]);

    useTransactionsHubSessionHydration({
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
    });


    const openDetails = useCallback((tx: Transaction) => {
        setSelectedId(tx.id);
        setView('details');
    }, []);

    const onTransactionCreated = useCallback(
        (tx: Transaction) => {
            setListAddSheetOpen(false);
            openDetails(tx);
        },
        [openDetails],
    );

    const backToList = useCallback(() => {
        setView('list');
        setDetailsEscape(null);
    }, []);

    const handleDetailsEscapeSnapshot = useCallback((snapshot: TransactionsDetailsEscapeSnapshot) => {
        setDetailsEscape((prev) => (isSameTransactionsDetailsEscape(prev, snapshot) ? prev : snapshot));
    }, []);

    const registerDetailsEscapeCloser = useCallback(
        (closer: ((patch: Partial<TransactionsDetailsEscapeSnapshot>) => void) | null) => {
            closeDetailsOverlayRef.current = closer ?? (() => undefined);
        },
        [],
    );

    const escapeHandlers = useCallback(
        () => ({
            onBack,
            onCloseListAddSheet: () => setListAddSheetOpen(false),
            onBackToList: backToList,
            onCloseDetailsOverlay: (patch: Partial<TransactionsDetailsEscapeSnapshot>) =>
                closeDetailsOverlayRef.current(patch),
        }),
        [onBack, backToList],
    );

    const handleHubBack = useCallback(() => {
        const action = resolveTransactionsEscapeAction({
            view,
            listAddSheetOpen,
            details: view === 'details' ? detailsEscape : null,
        });
        applyTransactionsEscapeAction(action, escapeHandlers());
    }, [view, listAddSheetOpen, detailsEscape, escapeHandlers]);

    useTransactionsEscapeStack({
        enabled: open,
        view,
        listAddSheetOpen,
        details: view === 'details' ? detailsEscape : null,
        onBack,
        onCloseListAddSheet: () => setListAddSheetOpen(false),
        onBackToList: backToList,
        onCloseDetailsOverlay: (patch) => closeDetailsOverlayRef.current(patch),
    });

    return {
        view,
        selectedId,
        listAddSheetOpen,
        setListAddSheetOpen,
        cardsInteractive,
        openDetails,
        onTransactionCreated,
        handleHubBack,
        handleDetailsEscapeSnapshot,
        registerDetailsEscapeCloser,
    };
}
