import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    consumeOpenTransactionsAddSheet,
    subscribeOpenTransactionsHub,
} from '@/app/services/transactions/procedureGuideNavigation';
import { useTransactionsEscapeStack } from './useTransactionsEscapeStack';
import { useTransactionsHubSessionHydration } from './useTransactionsHubSessionHydration';
import { useTransactionsOpenInteractionGuard } from './useTransactionsOpenInteractionGuard';
import { createTransactionsDetailsReveal } from '../transactionsDetailsReveal';
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

    const detailsReveal = useMemo(
        () =>
            createTransactionsDetailsReveal({
                go: (transactionId) => {
                    setSelectedId(transactionId);
                    setView('details');
                },
                onChunkFailed: () => {
                    SmartToast.error('تعذر فتح التفاصيل — حاول مرة أخرى');
                },
            }),
        [],
    );

    useEffect(() => {
        if (open) return;
        detailsReveal.invalidate();
        setListAddSheetOpen(false);
        setView('list');
        setSelectedId(null);
        setDetailsEscape(null);
    }, [open, detailsReveal]);

    useEffect(() => {
        if (!open) return;
        return subscribeOpenTransactionsHub((detail) => {
            if (!detail.openAddSheet) return;
            consumeOpenTransactionsAddSheet();
            detailsReveal.invalidate();
            setView('list');
            setSelectedId(null);
            setDetailsEscape(null);
            setListAddSheetOpen(true);
        });
    }, [open, detailsReveal]);

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
        revealDetails: detailsReveal.reveal,
    });

    const openDetails = useCallback(
        (tx: Transaction) => {
            detailsReveal.reveal(tx.id);
        },
        [detailsReveal],
    );

    const onTransactionCreated = useCallback(
        (tx: Transaction) => {
            setListAddSheetOpen(false);
            openDetails(tx);
        },
        [openDetails],
    );

    const backToList = useCallback(() => {
        detailsReveal.invalidate();
        setView('list');
        setDetailsEscape(null);
    }, [detailsReveal]);

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
