import { lazy, memo } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { TransactionCard } from './TransactionCard';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import type { TransactionsListStatusFilter } from '@/app/services/transactions/filterTransactionsList';
import { inertProps } from '@/app/utils/inertProps';
import { TxGlassEmpty, TxGlassFab, TxGlassHeader, TxGlassPage, TxHeaderRow, TX_PAGE_SCROLL } from './transactionsGlassTheme';
import { TransactionsListQueryBar } from './TransactionsListQueryBar';
import { useTransactionsListScreen } from './hooks/useTransactionsListScreen';
import { useTransactionListWindow } from './hooks/useTransactionListWindow';
import { TxLazyIsland } from './TransactionsChunkGuard';
import {
    prefetchAddTransactionBottomSheet,
    prefetchTransactionsDetailsScreen,
} from './transactionsFeatureLoader';

const AddTransactionBottomSheetLazy = lazy(() =>
    import('./AddTransactionBottomSheet').then((mod) => ({ default: mod.AddTransactionBottomSheet })),
);

const TransactionsListResults = memo(function TransactionsListResults({
    items,
    listFilter,
    onPressTransaction,
    diskSettled,
}: {
    items: Transaction[];
    listFilter: TransactionsListStatusFilter;
    onPressTransaction: (tx: Transaction) => void;
    diskSettled: boolean;
}) {
    const { visible, hiddenCount, sentinelRef } = useTransactionListWindow(items);

    if (items.length === 0) {
        if (!diskSettled) {
            return <div data-testid="transactions-list-disk-pending" className="h-px w-full" aria-hidden />;
        }
        const emptyMessage =
            listFilter === 'deleted'
                ? 'لا توجد معاملات محذوفة'
                : listFilter === 'archived'
                  ? 'لا توجد معاملات مؤرشفة'
                  : 'لا توجد معاملات مطابقة';
        return <TxGlassEmpty message={emptyMessage} testId="transactions-list-empty" />;
    }

    return (
        <>
            {visible.map((tx) => (
                <TransactionCard
                    key={tx.id}
                    transaction={tx}
                    listFilter={listFilter}
                    onPress={onPressTransaction}
                    onPrimeDetails={prefetchTransactionsDetailsScreen}
                />
            ))}
            {hiddenCount > 0 ? (
                <div
                    ref={sentinelRef}
                    aria-hidden
                    data-testid="transactions-list-window-sentinel"
                    className="h-px w-full"
                />
            ) : null}
        </>
    );
});

export const TransactionsListScreen = memo(function TransactionsListScreen({
    onBack,
    onOpenDetails,
    addSheetOpen,
    onAddSheetOpenChange,
    hubOpen = true,
    hubUserId,
    onTransactionCreated,
    cardsInteractive = true,
}: {
    onBack?: () => void;
    onOpenDetails?: (tx: Transaction) => void;
    addSheetOpen?: boolean;
    onAddSheetOpenChange?: (open: boolean) => void;
    hubOpen?: boolean;
    hubUserId?: string;
    onTransactionCreated?: (tx: Transaction) => void;
    /** يمنع فتح بطاقة مباشرة بعد flushSync (نقرة شبح) */
    cardsInteractive?: boolean;
}) {
    const vm = useTransactionsListScreen({
        onOpenDetails,
        addSheetOpen,
        onAddSheetOpenChange,
        hubOpen,
        hubUserId,
        cardsInteractive,
    });

    return (
        <div data-testid="transactions-list-screen" className="h-full min-h-0">
            <TxGlassPage>
                <TxGlassHeader>
                    <TxHeaderRow title="إدارة المعاملات" onBack={onBack} backTestId="transactions-back" />

                    {hubOpen ? (
                        <TransactionsListQueryBar
                            query={vm.query}
                            onQueryChange={vm.onQueryChange}
                            filter={vm.filter}
                            onFilterChange={vm.onFilterChange}
                            resultsSummary={vm.resultsSummary}
                            resultsSummaryId={vm.resultsSummaryId}
                        />
                    ) : null}
                </TxGlassHeader>

                {hubOpen ? (
                    <div
                        data-testid="transactions-list-scroll"
                        className={`${TX_PAGE_SCROLL} px-4 py-1 pb-24 max-w-[520px] w-full mx-auto [contain:content]${vm.cardsInteractive ? '' : ' pointer-events-none'}`}
                        {...inertProps(!vm.cardsInteractive)}
                    >
                        <TransactionsListResults
                            items={vm.filtered}
                            listFilter={vm.filter}
                            onPressTransaction={vm.onPressTransaction}
                            diskSettled={vm.diskSettled}
                        />
                    </div>
                ) : null}

                {hubOpen ? (
                    <TxGlassFab
                        label="إضافة معاملة"
                        testId="transactions-add-fab"
                        onPointerDown={() => {
                            prefetchAddTransactionBottomSheet();
                            vm.primeAddSheet();
                        }}
                        onClick={() => vm.setSheetOpen(true)}
                    />
                ) : null}

                {hubOpen && (vm.sheetOpen || vm.sheetPrimed) ? (
                    <TxLazyIsland
                        onFailed={() => {
                            vm.setSheetOpen(false);
                            SmartToast.error('تعذر فتح الإضافة — حاول مرة أخرى');
                        }}
                    >
                        <AddTransactionBottomSheetLazy
                            open={vm.sheetOpen}
                            onOpenChange={vm.setSheetOpen}
                            keepMounted={vm.sheetPrimed}
                            hubUserId={hubUserId}
                            onCreated={onTransactionCreated}
                        />
                    </TxLazyIsland>
                ) : null}
            </TxGlassPage>
        </div>
    );
});
