import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AddTransactionBottomSheet } from './AddTransactionBottomSheet';
import { TransactionCard } from './TransactionCard';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { TransactionStatus, type Transaction } from '@/app/modules/transactionsThreading/types';
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

type StatusFilter = 'all' | TransactionStatus;

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
    { id: 'all', label: 'الكل' },
    { id: TransactionStatus.Active, label: 'نشطة' },
    { id: TransactionStatus.Paused, label: 'في الانتظار' },
    { id: TransactionStatus.Completed, label: 'مكتملة' },
];

export function TransactionsListScreen({
    onBack,
    onOpenDetails,
}: {
    onBack?: () => void;
    onOpenDetails?: (tx: Transaction) => void;
}) {
    const transactions = useTransactionsThreadingStore((s) => s.transactions);
    const refreshTransactions = useTransactionsThreadingStore((s) => s.refreshTransactions);

    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<StatusFilter>('all');
    const [sheetOpen, setSheetOpen] = useState(false);

    useEffect(() => {
        refreshTransactions();
    }, [refreshTransactions]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return transactions.filter((tx) => {
            const matchesStatus = filter === 'all' ? true : tx.status === filter;
            const matchesQuery =
                q.length === 0 ||
                tx.title.toLowerCase().includes(q) ||
                tx.clientName.toLowerCase().includes(q);
            return matchesStatus && matchesQuery;
        });
    }, [transactions, query, filter]);

    const onPressTransaction = (tx: Transaction) => {
        onOpenDetails?.(tx);
    };

    return (
        <TxGlassPage>
            <TxGlassHeader>
                <TxHeaderRow title="إدارة المعاملات" onBack={onBack} />

                <div className="mt-4 relative">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8680]/60 pointer-events-none" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ابحث بعنوان المعاملة أو اسم الموكل..."
                        className={`${GLASS_FIELD} h-11 pr-10 pl-3`}
                    />
                </div>

                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
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
                    <TxGlassEmpty message="لا توجد معاملات مطابقة" />
                ) : (
                    filtered.map((tx) => (
                        <TransactionCard key={tx.id} transaction={tx} onPress={onPressTransaction} />
                    ))
                )}
            </div>

            <TxGlassFab label="إضافة معاملة" onClick={() => setSheetOpen(true)} />

            <AddTransactionBottomSheet open={sheetOpen} onOpenChange={setSheetOpen} />
        </TxGlassPage>
    );
}
