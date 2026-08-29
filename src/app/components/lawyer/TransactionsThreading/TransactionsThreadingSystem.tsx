import { memo, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { inertProps } from '@/app/utils/inertProps';
import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';
import { removeTransactionsInstantChrome } from '@/app/runtime/transactionsInstantPaint';
import { TransactionsListScreen } from './TransactionsListScreen';
import { TransactionDetailsScreen } from './TransactionDetailsScreen';
import { TX_OVERLAY } from './transactionsGlassTheme';
import { useTransactionsHubNavigation } from './hooks/useTransactionsHubNavigation';
import { clearTransactionsListQuerySession } from './utils/transactionsListQuerySession';

function getOverlayPortalRoot(): HTMLElement {
  return getHamiOverlayPortalRoot({ id: 'hami-overlay-portal', zIndex: 229 });
}

export const TransactionsThreadingSystem = memo(function TransactionsThreadingSystem({
  onBack,
  userId,
  initialTransactionId,
  onInitialFocusConsumed,
  open = true,
}: {
  onBack: () => void;
  userId: string;
  initialTransactionId?: string;
  /** يُستدعى بعد استهلاك focus مرة واحدة لكل دورة فتح — يمنع إعادة فتح التفاصيل من focus عالق */
  onInitialFocusConsumed?: () => void;
  open?: boolean;
}) {
  const nav = useTransactionsHubNavigation({
    onBack,
    userId,
    initialTransactionId,
    onInitialFocusConsumed,
    open,
  });

  useBodyScrollLock(open);

  useLayoutEffect(() => {
    if (open) removeTransactionsInstantChrome();
  }, [open]);

  useEffect(() => () => clearTransactionsListQuerySession(), []);

  /** بوابة خارج اللوحة — content-visibility على لوحة المحامي كان يخفي الطبقة معها */
  const overlay = (
    <div
      className={`${TX_OVERLAY}${open ? '' : ' hidden pointer-events-none'}`}
      aria-hidden={!open}
      data-testid="transactions-hub"
      data-hami-overlay-safe={open ? '1' : undefined}
      style={open ? { touchAction: 'manipulation' } : undefined}
      {...inertProps(!open)}
    >
      {open && nav.view === 'list' ? (
        <TransactionsListScreen
          onBack={nav.handleHubBack}
          onOpenDetails={nav.openDetails}
          addSheetOpen={nav.listAddSheetOpen}
          onAddSheetOpenChange={nav.setListAddSheetOpen}
          hubOpen={open}
          hubUserId={userId}
          onTransactionCreated={nav.onTransactionCreated}
          cardsInteractive={nav.cardsInteractive}
        />
      ) : null}
      {open && nav.view === 'details' && nav.selectedId ? (
        <TransactionDetailsScreen
          key={nav.selectedId}
          transactionId={nav.selectedId}
          onBack={nav.handleHubBack}
          onEscapeSnapshotChange={nav.handleDetailsEscapeSnapshot}
          registerEscapeCloser={nav.registerDetailsEscapeCloser}
          hubOpen={open}
          detailsActive
        />
      ) : null}
    </div>
  );

  if (typeof document === 'undefined') return overlay;
  return createPortal(overlay, getOverlayPortalRoot());
});
