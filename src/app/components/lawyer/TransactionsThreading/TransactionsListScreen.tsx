import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
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
    GLASS_FIELD,
    TX_LIST_FILTER_CHIP,
    TX_LIST_FILTER_CHIP_ACTIVE,
    TxGlassEmpty,
    TxGlassFab,
    TxGlassHeader,
    TxGlassPage,
    TxHeaderRow,
} from './transactionsGlassTheme';

type StatusFilter = TransactionsListStatusFilter;

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
    { id: 'all', label: 'الكل' },
    { id: TransactionStatus.Active, label: 'نشطة' },
    { id: TransactionStatus.Paused, label: 'في الانتظار' },
    { id: TransactionStatus.Completed, label: 'مكتملة' },
];

const TransactionsListSearch = memo(function TransactionsListSearch({
    query,
    onQueryChange,
}: {
    query: string;
    onQueryChange: (value: string) => void;
}) {
    return (
        <div className="mt-4 relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8680]/60 pointer-events-none" />
            <input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="ابحث بعنوان المعاملة أو اسم الموكل..."
                aria-label="بحث المعاملات"
                autoComplete="off"
                enterKeyHint="search"
                className={`${GLASS_FIELD} h-11 pr-10 pl-3`}
                data-testid="transactions-search"
            />
        </div>
    );
});

const TransactionsListStatusFilters = memo(function TransactionsListStatusFilters({
    filter,
    onFilterChange,
}: {
    filter: StatusFilter;
    onFilterChange: (next: StatusFilter) => void;
}) {
    return (
        <div className="mt-3 flex gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x pb-0.5 scrollbar-hide">
            {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                    <button
                        key={String(f.id)}
                        type="button"
                        data-testid={`transactions-filter-${String(f.id)}`}
                        aria-pressed={active}
                        onClick={() => onFilterChange(f.id)}
                        className={active ? TX_LIST_FILTER_CHIP_ACTIVE : TX_LIST_FILTER_CHIP}
                    >
                        {f.label}
                    </button>
                );
            })}
        </div>
    );
});

const TransactionsListResults = memo(function TransactionsListResults({
    items,
    onPressTransaction,
}: {
    items: Transaction[];
    onPressTransaction: (tx: Transaction) => void;
}) {
    if (items.length === 0) {
        return <TxGlassEmpty message="لا توجد معاملات مطابقة" testId="transactions-list-empty" />;
    }

    return (
        <>
            {items.map((tx) => (
                <TransactionCard key={tx.id} transaction={tx} onPress={onPressTransaction} />
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
}: {
    onBack?: () => void;
    onOpenDetails?: (tx: Transaction) => void;
    addSheetOpen?: boolean;
    onAddSheetOpenChange?: (open: boolean) => void;
    hubOpen?: boolean;
    hubUserId?: string;
}) {
    const transactions = useTransactionsThreadingStore(useShallow((s) => s.transactions));

    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<StatusFilter>('all');
    const deferredQuery = useDeferredValue(query);
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
        setQuery(value);
    }, []);

    const onFilterChange = useCallback((next: StatusFilter) => {
        setFilter(next);
    }, []);

    const filtered = useMemo(
        () => filterTransactionsList(transactions, deferredQuery, filter),
        [transactions, deferredQuery, filter],
    );

    const onPressTransaction = useCallback(
        (tx: Transaction) => {
            onOpenDetails?.(tx);
        },
        [onOpenDetails],
    );

    return (
        <div data-testid="transactions-list-screen">
            <TxGlassPage>
                <TxGlassHeader>
                    <TxHeaderRow title="إدارة المعاملات" onBack={onBack} backTestId="transactions-back" />

                    <TransactionsListSearch query={query} onQueryChange={onQueryChange} />
                    <TransactionsListStatusFilters filter={filter} onFilterChange={onFilterChange} />
                </TxGlassHeader>

                <div className="px-5 py-5 space-y-3 pb-28 max-w-[520px] mx-auto">
                    <TransactionsListResults items={filtered} onPressTransaction={onPressTransaction} />
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
                />
            </TxGlassPage>
        </div>
    );
});
