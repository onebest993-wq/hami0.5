import { memo } from 'react';
import { AddTransactionBottomSheet } from './AddTransactionBottomSheet';
import { TransactionCard } from './TransactionCard';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import type { TransactionsListStatusFilter } from '@/app/services/transactions/filterTransactionsList';
import { inertProps } from '@/app/utils/inertProps';
import { TxGlassEmpty, TxGlassFab, TxGlassHeader, TxGlassPage, TxHeaderRow, TX_PAGE_SCROLL } from './transactionsGlassTheme';
import { TransactionsListQueryBar } from './TransactionsListQueryBar';
import { useTransactionsListScreen } from './hooks/useTransactionsListScreen';
import { useTransactionListWindow } from './hooks/useTransactionListWindow';

const TransactionsListResults = memo(function TransactionsListResults({
    items,
    listFilter,
    onPressTransaction,
}: {
    items: Transaction[];
    listFilter: TransactionsListStatusFilter;
    onPressTransaction: (tx: Transaction) => void;
}) {
    const { visible, hiddenCount, sentinelRef } = useTransactionListWindow(items);

    if (items.length === 0) {
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
                        className={`${TX_PAGE_SCROLL} px-4 py-2 space-y-2 pb-24 max-w-[520px] w-full mx-auto [contain:content]${vm.cardsInteractive ? '' : ' pointer-events-none'}`}
                        {...inertProps(!vm.cardsInteractive)}
                    >
                        <TransactionsListResults
                            items={vm.filtered}
                            listFilter={vm.filter}
                            onPressTransaction={vm.onPressTransaction}
                        />
                    </div>
                ) : null}

                {hubOpen ? (
                    <TxGlassFab
                        label="إضافة معاملة"
                        testId="transactions-add-fab"
                        onPointerDown={vm.primeAddSheet}
                        onClick={() => vm.setSheetOpen(true)}
                    />
                ) : null}

                {hubOpen && (vm.sheetOpen || vm.sheetPrimed) ? (
                    <AddTransactionBottomSheet
                        open={vm.sheetOpen}
                        onOpenChange={vm.setSheetOpen}
                        keepMounted={vm.sheetPrimed}
                        hubUserId={hubUserId}
                        onCreated={onTransactionCreated}
                    />
                ) : null}
            </TxGlassPage>
        </div>
    );
});
