import { lazy, memo, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { inertProps } from '@/app/utils/inertProps';
import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';
import { removeTransactionsInstantChrome } from '@/app/runtime/transactionsInstantPaint';
import { TransactionsListScreen } from './TransactionsListScreen';
import { TX_OVERLAY } from './transactionsGlassTheme';
import { useTransactionsHubNavigation } from './hooks/useTransactionsHubNavigation';
import { clearTransactionsListQuerySession } from './utils/transactionsListQuerySession';
import { TxLazyIsland } from './TransactionsChunkGuard';
import { isTransactionsChunkLoadError } from './transactionsChunkLoadError';
import { prefetchTransactionsDetailsScreen, scheduleTransactionsIdle } from './transactionsFeatureLoader';

const TransactionDetailsScreenLazy = lazy(() =>
    import('./TransactionDetailsScreen').then((mod) => ({ default: mod.TransactionDetailsScreen })),
);

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

    useEffect(() => {
        if (!open || nav.view !== 'list') return;
        return scheduleTransactionsIdle(() => {
            void prefetchTransactionsDetailsScreen();
        });
    }, [open, nav.view]);

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
                <TxLazyIsland
                    key={nav.selectedId}
                    onFailed={(error) => {
                        SmartToast.error(
                            isTransactionsChunkLoadError(error)
                                ? 'تعذر فتح التفاصيل — حاول مرة أخرى'
                                : 'حدث خطأ في التفاصيل — عُدت للقائمة',
                        );
                        nav.handleHubBack();
                    }}
                >
                    <TransactionDetailsScreenLazy
                        transactionId={nav.selectedId}
                        onBack={nav.handleHubBack}
                        onEscapeSnapshotChange={nav.handleDetailsEscapeSnapshot}
                        registerEscapeCloser={nav.registerDetailsEscapeCloser}
                        hubOpen={open}
                        detailsActive
                    />
                </TxLazyIsland>
            ) : null}
        </div>
    );

    if (typeof document === 'undefined') return overlay;
    return createPortal(overlay, getOverlayPortalRoot());
});
