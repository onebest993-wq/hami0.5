import { useCallback, useEffect, useRef, useState, memo } from 'react';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import { useTransactionsThreadingStore, ensureTransactionsUserBound } from '@/app/modules/transactionsThreading/store';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { resolveInitialTransactionsView } from '@/app/services/transactions/resolveInitialTransactionsView';
import {
  consumeOpenTransactionsAddSheet,
  subscribeOpenTransactionsHub,
} from '@/app/services/transactions/procedureGuideNavigation';
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

  useBodyScrollLock(open);

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

  useEffect(() => {
    if (open) return;
    /* keepAlive مخفي: جهّز المخزن قبل أول فتح */
    ensureTransactionsUserBound(userId);
    let cancelled = false;
    void setUserId(userId)
      .then(() => (cancelled ? undefined : refreshTransactions()))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, refreshTransactions, setUserId, userId]);

  useEffect(() => {
    if (!open) return;
    ensureTransactionsUserBound(userId);
    let cancelled = false;

    const applyResolvedView = () => {
      if (cancelled) return;
      const resolved = resolveInitialTransactionsView(
        initialTransactionId,
        useTransactionsThreadingStore.getState().transactions,
      );
      if (resolved.missingFocusId) {
        SmartToast.warning('تعذر فتح المعاملة المطلوبة');
      }
      setView(resolved.view);
      setSelectedId(resolved.selectedId);
      if (consumeOpenTransactionsAddSheet()) {
        setView('list');
        setSelectedId(null);
        setListAddSheetOpen(true);
      }
    };

    /* إن وُجدت بيانات دافئة — طبّق العرض فوراً بلا انتظار refresh */
    const warmed = useTransactionsThreadingStore.getState();
    if (warmed.userId === userId) {
      applyResolvedView();
    }

    void (async () => {
      await setUserId(userId);
      if (cancelled) return;
      try {
        await refreshTransactions();
      } catch {
        /* hydrate may still have seeded the store */
      }
      if (cancelled) return;
      applyResolvedView();
    })();
    return () => {
      cancelled = true;
    };
  }, [initialTransactionId, open, refreshTransactions, setUserId, userId]);

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
    setSelectedId(null);
    setDetailsEscape(null);
  }, []);

  const handleDetailsEscapeSnapshot = useCallback((snapshot: TransactionsDetailsEscapeSnapshot) => {
    setDetailsEscape((prev) => {
      if (
        prev &&
        prev.addTaskSheetOpen === snapshot.addTaskSheetOpen &&
        prev.reportOpen === snapshot.reportOpen &&
        prev.completeOpen === snapshot.completeOpen &&
        prev.saveTemplateOpen === snapshot.saveTemplateOpen &&
        prev.templatesOpen === snapshot.templatesOpen &&
        prev.shareProcedureOpen === snapshot.shareProcedureOpen &&
        prev.taskEditOpen === snapshot.taskEditOpen &&
        prev.taskDeleteOpen === snapshot.taskDeleteOpen
      ) {
        return prev;
      }
      return snapshot;
    });
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

  /** بلا fade عند الفتح — التأخير البصري كان يُقرأ كانتظار تحميل */
  return (
    <div
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
          onTransactionCreated={onTransactionCreated}
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
    </div>
  );
});
export default TransactionsThreadingSystem;
