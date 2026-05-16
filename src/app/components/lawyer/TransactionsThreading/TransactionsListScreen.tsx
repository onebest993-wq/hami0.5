import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Plus, Search } from 'lucide-react';
import { AddTransactionBottomSheet } from './AddTransactionBottomSheet';
import { TransactionCard } from './TransactionCard';
import { TransactionStatus, useTransactionsThreadingStore, type Transaction } from '@/app/modules/transactionsThreading';

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
    <div dir="rtl" className="h-full min-h-screen bg-[#001830] text-right">
      <div className="sticky top-0 z-40 bg-[#001830]/95 backdrop-blur-xl border-b border-[#D4AF37]/20">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-gray-200 flex items-center justify-center hover:bg-white/10"
              aria-label="رجوع"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="text-white font-bold text-lg">إدارة المعاملات</div>
            <div className="w-10 h-10" />
          </div>

          <div className="mt-4 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بعنوان المعاملة أو اسم الموكل..."
              className="w-full h-12 bg-[#0D0D1A] border border-[#D4AF37]/20 rounded-2xl pr-12 pl-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]/50 transition"
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={String(f.id)}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition border ${
                    active
                      ? 'bg-[#D4AF37]/15 text-[#F4C430] border-[#D4AF37]/25'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/7'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-3 pb-28 max-w-[520px] mx-auto">
        {filtered.length === 0 ? (
          <div className="pt-16 text-center">
            <div className="text-gray-400 text-sm">لا توجد معاملات مطابقة</div>
          </div>
        ) : (
          filtered.map((tx) => <TransactionCard key={tx.id} transaction={tx} onPress={onPressTransaction} />)
        )}
      </div>

      <button
        type="button"
        aria-label="إضافة معاملة"
        onPointerDown={() => setSheetOpen(true)}
        onTouchStart={() => setSheetOpen(true)}
        onMouseDown={() => setSheetOpen(true)}
        onClick={() => setSheetOpen(true)}
        style={{ touchAction: 'manipulation' }}
        className="fixed bottom-6 left-6 z-[80] pointer-events-auto cursor-pointer select-none w-14 h-14 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#0D0D1A] shadow-2xl shadow-[#D4AF37]/30 flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </button>

      <AddTransactionBottomSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
