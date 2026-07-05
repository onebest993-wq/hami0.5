import { useCallback, useEffect, useRef, useState, memo } from 'react';
import { motion } from 'motion/react';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import { useTransactionsThreadingStore, ensureTransactionsUserBound } from '@/app/modules/transactionsThreading/store';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { resolveInitialTransactionsView } from '@/app/services/transactions/resolveInitialTransactionsView';
import { TransactionsListScreen } from './TransactionsListScreen';
import { TransactionDetailsScreen } from './TransactionDetailsScreen';
import { TX_OVERLAY } from './transactionsGlassTheme';
import { useTransactionsEscapeStack } from './hooks/useTransactionsEscapeStack';
import type { TransactionsDetailsEscapeSnapshot } from './transactionsEscapeStack';
import {
    applyTransactionsEscapeAction,
    resolveTransactionsEscapeAction,
} from '@/app/components/lawyer/TransactionsThreading/transactionsEscapeStack';

export const TransactionsThreadingSystem = memo(function TransactionsThreadingSystem({
  onBack,
  userId,
  initialTransactionId,
  open = true,
}: {
  onBack: () => void;
  userId: string;
  initialTransactionId?: string;
  open?: boolean;
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
  const hasOpenedRef = useRef(false);
  const reduceMotion = useReduceMotion();

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) {
      hasOpenedRef.current = true;
      return;
    }
    setListAddSheetOpen(false);
    setView('list');
    setSelectedId(null);
    setDetailsEscape(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    ensureTransactionsUserBound(userId);
    let cancelled = false;
    void (async () => {
      await setUserId(userId);
      if (cancelled) return;
      void refreshTransactions().catch(() => undefined);
      const resolved = resolveInitialTransactionsView(
        initialTransactionId,
        useTransactionsThreadingStore.getState().transactions,
      );
      if (cancelled) return;
      if (resolved.missingFocusId) {
        SmartToast.warning('تعذر فتح المعاملة المطلوبة');
      }
      setView(resolved.view);
      setSelectedId(resolved.selectedId);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialTransactionId, open, refreshTransactions, setUserId, userId]);

  const openDetails = useCallback((tx: Transaction) => {
    setSelectedId(tx.id);
    setView('details');
  }, []);

  const backToList = useCallback(() => {
    setView('list');
    setSelectedId(null);
    setDetailsEscape(null);
  }, []);

  const handleDetailsEscapeSnapshot = useCallback((snapshot: TransactionsDetailsEscapeSnapshot) => {
    setDetailsEscape(snapshot);
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

  const shouldFadeIn = !reduceMotion && !hasOpenedRef.current;

  return (
    <motion.div
      initial={shouldFadeIn ? { opacity: 0 } : undefined}
      animate={{ opacity: open ? 1 : 0 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      className={`${TX_OVERLAY}${open ? '' : ' hidden pointer-events-none'}`}
      aria-hidden={!open}
      data-testid="transactions-hub"
    >
      {view === 'list' ? (
        <TransactionsListScreen
          onBack={handleHubBack}
          onOpenDetails={openDetails}
          addSheetOpen={listAddSheetOpen}
          onAddSheetOpenChange={setListAddSheetOpen}
          hubOpen={open}
          hubUserId={userId}
        />
      ) : selectedId ? (
        <TransactionDetailsScreen
          transactionId={selectedId}
          onBack={handleHubBack}
          onEscapeSnapshotChange={handleDetailsEscapeSnapshot}
          registerEscapeCloser={registerDetailsEscapeCloser}
          hubOpen={open}
        />
      ) : null}
    </motion.div>
  );
});
export default TransactionsThreadingSystem;
