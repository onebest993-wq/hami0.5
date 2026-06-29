import { memo, useCallback, useMemo, useState } from 'react';
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
    GLASS_CHIP,
    GLASS_CHIP_ACTIVE,
    GLASS_FIELD,
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

export const TransactionsListScreen = memo(function TransactionsListScreen({
    onBack,
    onOpenDetails,
    addSheetOpen,
    onAddSheetOpenChange,
}: {
    onBack?: () => void;
    onOpenDetails?: (tx: Transaction) => void;
    addSheetOpen?: boolean;
    onAddSheetOpenChange?: (open: boolean) => void;
}) {
    const transactions = useTransactionsThreadingStore(useShallow((s) => s.transactions));

    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<StatusFilter>('all');
    const [localSheetOpen, setLocalSheetOpen] = useState(false);
    const sheetOpen = addSheetOpen ?? localSheetOpen;
    const setSheetOpen = onAddSheetOpenChange ?? setLocalSheetOpen;

    const filtered = useMemo(
        () => filterTransactionsList(transactions, query, filter),
        [transactions, query, filter],
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

                    <div className="mt-4 relative">
                        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8680]/60 pointer-events-none" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="ابحث بعنوان المعاملة أو اسم الموكل..."
                            className={`${GLASS_FIELD} h-11 pr-10 pl-3`}
                            data-testid="transactions-search"
                        />
                    </div>

                    <div className="mt-3 flex gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x pb-0.5 scrollbar-hide">
                        {FILTERS.map((f) => {
                            const active = filter === f.id;
                            return (
                                <button
                                    key={String(f.id)}
                                    type="button"
                                    onClick={() => setFilter(f.id)}
                                    className={active ? GLASS_CHIP_ACTIVE : GLASS_CHIP}
                                >
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>
                </TxGlassHeader>

                <div className="px-5 py-5 space-y-3 pb-28 max-w-[520px] mx-auto">
                    {filtered.length === 0 ? (
                        <TxGlassEmpty message="لا توجد معاملات مطابقة" testId="transactions-list-empty" />
                    ) : (
                        filtered.map((tx) => (
                            <TransactionCard key={tx.id} transaction={tx} onPress={onPressTransaction} />
                        ))
                    )}
                </div>

                <TxGlassFab
                    label="إضافة معاملة"
                    testId="transactions-add-fab"
                    onClick={() => setSheetOpen(true)}
                />

                <AddTransactionBottomSheet open={sheetOpen} onOpenChange={setSheetOpen} />
            </TxGlassPage>
        </div>
    );
});
