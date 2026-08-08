import { memo, useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import { Search } from '@/app/components/ui/lucideIcons';
import { useShallow } from 'zustand/react/shallow';
import { AddTransactionBottomSheet } from './AddTransactionBottomSheet';
import { TransactionCard } from './TransactionCard';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { TransactionStatus, type Transaction } from '@/app/modules/transactionsThreading/types';
import {
    filterTransactionsList,
    type TransactionsListStatusFilter,
} from '@/app/services/transactions/filterTransactionsList';
import {
    TX_LIST_FILTER_CHIP_ACTIVE,
    TxGlassEmpty,
    TxGlassFab,
    TxGlassHeader,
    TxGlassPage,
    TxHeaderRow,
} from './transactionsGlassTheme';
import { SparkThreadingListInsight } from '@/app/spark/ui/SparkThreadingListInsight';

type StatusFilter = TransactionsListStatusFilter;

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
    { id: 'all', label: 'الكل' },
    { id: TransactionStatus.Active, label: 'نشطة' },
    { id: TransactionStatus.Paused, label: 'في الانتظار' },
    { id: TransactionStatus.Completed, label: 'مكتملة' },
    { id: 'archived', label: 'أرشيف' },
    { id: 'deleted', label: 'محذوفة' },
];

const TX_QUERY_CHIP_BASE =
    'shrink-0 min-h-[44px] px-2.5 rounded-[3px] text-[10px] font-bold border touch-manipulation transition-colors snap-start';

const TransactionsListQueryBar = memo(function TransactionsListQueryBar({
    query,
    onQueryChange,
    filter,
    onFilterChange,
    resultsSummary,
    resultsSummaryId,
}: {
    query: string;
    onQueryChange: (value: string) => void;
    filter: StatusFilter;
    onFilterChange: (next: StatusFilter) => void;
    resultsSummary: string;
    resultsSummaryId: string;
}) {
    const trimmedQuery = query.trim();
    const hasActiveSearch = trimmedQuery.length > 0;

    return (
        <div
            className="mt-4 rounded-sm border-2 border-[#3A5A68] bg-[#152A32] overflow-hidden focus-within:border-[#D4A56A] focus-within:ring-1 focus-within:ring-[#D4A56A]/25 transition-colors"
            data-testid="transactions-query-bar"
        >
            <div className="flex items-center gap-2 px-3 h-11 min-h-[44px]">
                <Search className="w-4 h-4 text-[#8A8680] shrink-0 pointer-events-none" aria-hidden />
                <input
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder="ابحث بعنوان المعاملة أو اسم الموكل..."
                    aria-label="بحث المعاملات"
                    aria-describedby={hasActiveSearch ? resultsSummaryId : undefined}
                    autoComplete="off"
                    enterKeyHint="search"
                    className="flex-1 min-w-0 h-full bg-transparent border-0 p-0 text-[#D8D4CE] placeholder:text-[#8A8680] outline-none text-sm"
                    data-testid="transactions-search"
                />
                {hasActiveSearch ? (
                    <p
                        id={resultsSummaryId}
                        data-testid="transactions-results-summary"
                        className="shrink-0 max-w-[7.5rem] truncate rounded-[3px] border border-[#2A4550]/70 bg-[#0E1F26]/90 px-2 py-1 text-[10px] font-bold text-[#D4A56A] tabular-nums"
                        role="status"
                        aria-live="polite"
                    >
                        {resultsSummary}
                    </p>
                ) : null}
            </div>

            <div
                className="relative border-t border-[#2A4550]/45 px-2 py-1.5"
                data-testid="transactions-filter-strip"
            >
                <div
                    className="pointer-events-none absolute inset-y-1.5 right-0 w-3 bg-gradient-to-l from-[#152A32] to-transparent z-[1]"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute inset-y-1.5 left-0 w-3 bg-gradient-to-r from-[#152A32] to-transparent z-[1]"
                    aria-hidden
                />
                <div
                    className="flex gap-1 overflow-x-auto overscroll-x-contain touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
                    role="group"
                    aria-label="تصفية المعاملات حسب الحالة"
                >
                    {FILTERS.map((f) => {
                        const active = filter === f.id;
                        return (
                            <button
                                key={String(f.id)}
                                type="button"
                                data-testid={`transactions-filter-${String(f.id)}`}
                                aria-pressed={active}
                                onClick={() => onFilterChange(f.id)}
                                className={
                                    active
                                        ? `${TX_QUERY_CHIP_BASE} ${TX_LIST_FILTER_CHIP_ACTIVE}`
                                        : `${TX_QUERY_CHIP_BASE} border-[#3A5A68]/75 bg-[#0E1F26]/90 text-[#D8D4CE] hover:bg-[#1A3340] hover:border-[#8A8680]/80`
                                }
                            >
                                {f.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

const TransactionsListResults = memo(function TransactionsListResults({
    items,
    listFilter,
    onPressTransaction,
    cardsInteractive,
}: {
    items: Transaction[];
    listFilter: StatusFilter;
    onPressTransaction: (tx: Transaction) => void;
    cardsInteractive: boolean;
}) {
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
            {items.map((tx) => (
                <TransactionCard
                    key={tx.id}
                    transaction={tx}
                    listFilter={listFilter}
                    onPress={onPressTransaction}
                    pressDisabled={!cardsInteractive}
                />
            ))}
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
    const transactions = useTransactionsThreadingStore(useShallow((s) => s.transactions));
    const threadingTasks = useTransactionsThreadingStore(
        useShallow((s) => Object.values(s.tasksByTransactionId).flat()),
    );

    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<StatusFilter>('all');
    const [localSheetOpen, setLocalSheetOpen] = useState(false);
    const sheetOpen = addSheetOpen ?? localSheetOpen;
    const setSheetOpen = onAddSheetOpenChange ?? setLocalSheetOpen;

    const [sheetPrimed, setSheetPrimed] = useState(false);

    useEffect(() => {
        if (!hubOpen) setSheetPrimed(false);
    }, [hubOpen]);

    const primeAddSheet = useCallback(() => {
        setSheetPrimed(true);
    }, []);

    const onQueryChange = useCallback((value: string) => {
        startTransition(() => setQuery(value));
    }, []);

    const onFilterChange = useCallback((next: StatusFilter) => {
        startTransition(() => setFilter(next));
    }, []);

    const filtered = useMemo(
        () => filterTransactionsList(transactions, query, filter),
        [transactions, query, filter],
    );
    const resultsSummaryId = 'transactions-results-summary';
    const resultsSummary =
        filtered.length === 0 ? 'لا نتائج' : `${filtered.length} نتيجة`;

    const onPressTransaction = useCallback(
        (tx: Transaction) => {
            if (!cardsInteractive) return;
            onOpenDetails?.(tx);
        },
        [cardsInteractive, onOpenDetails],
    );

    return (
        <div data-testid="transactions-list-screen">
            <TxGlassPage>
                <TxGlassHeader>
                    <TxHeaderRow title="إدارة المعاملات" onBack={onBack} backTestId="transactions-back" />

                    <TransactionsListQueryBar
                        query={query}
                        onQueryChange={onQueryChange}
                        filter={filter}
                        onFilterChange={onFilterChange}
                        resultsSummary={resultsSummary}
                        resultsSummaryId={resultsSummaryId}
                    />
                </TxGlassHeader>

                <div className="px-5 py-5 space-y-3 pb-28 max-w-[520px] mx-auto">
                    <SparkThreadingListInsight
                        transactions={transactions}
                        tasks={threadingTasks}
                        className="px-0 pb-1"
                    />
                    <TransactionsListResults
                        items={filtered}
                        listFilter={filter}
                        onPressTransaction={onPressTransaction}
                        cardsInteractive={cardsInteractive}
                    />
                </div>

                <TxGlassFab
                    label="إضافة معاملة"
                    testId="transactions-add-fab"
                    onPointerDown={primeAddSheet}
                    onClick={() => setSheetOpen(true)}
                />

                <AddTransactionBottomSheet
                    open={sheetOpen && hubOpen}
                    onOpenChange={setSheetOpen}
                    keepMounted={hubOpen || sheetPrimed}
                    hubUserId={hubUserId}
                    onCreated={onTransactionCreated}
                />
            </TxGlassPage>
        </div>
    );
});
