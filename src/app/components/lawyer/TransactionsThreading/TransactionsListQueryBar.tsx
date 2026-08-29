import { memo } from 'react';
import { Search } from '@/app/components/ui/icons/Search';
import { TransactionStatus } from '@/app/modules/transactionsThreading/types';
import type { TransactionsListStatusFilter } from '@/app/services/transactions/filterTransactionsList';
import { GLASS_CHIP_ACTIVE } from './transactionsGlassTheme';

type TransactionsListStatusFilterId = TransactionsListStatusFilter;

const FILTERS: Array<{ id: TransactionsListStatusFilterId; label: string }> = [
    { id: 'all', label: 'الكل' },
    { id: TransactionStatus.Active, label: 'نشطة' },
    { id: TransactionStatus.Paused, label: 'في الانتظار' },
    { id: TransactionStatus.Completed, label: 'مكتملة' },
    { id: 'archived', label: 'أرشيف' },
    { id: 'deleted', label: 'محذوفة' },
];

const TX_QUERY_CHIP_BASE =
    'shrink-0 min-h-[44px] px-2.5 rounded-full text-[10px] font-bold border touch-manipulation transition-colors snap-start';

export const TransactionsListQueryBar = memo(function TransactionsListQueryBar({
    query,
    onQueryChange,
    filter,
    onFilterChange,
    resultsSummary,
    resultsSummaryId,
}: {
    query: string;
    onQueryChange: (value: string) => void;
    filter: TransactionsListStatusFilterId;
    onFilterChange: (next: TransactionsListStatusFilterId) => void;
    resultsSummary: string;
    resultsSummaryId: string;
}) {
    const trimmedQuery = query.trim();
    const hasActiveSearch = trimmedQuery.length > 0;

    return (
        <div className="mt-2" data-testid="transactions-query-bar">
            <div className="flex items-center gap-2 h-11 min-h-[44px]">
                <Search className="w-4 h-4 text-white/35 shrink-0 pointer-events-none" aria-hidden />
                <input
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder="ابحث بعنوان المعاملة أو اسم الموكل..."
                    aria-label="بحث المعاملات"
                    aria-describedby={hasActiveSearch ? resultsSummaryId : undefined}
                    autoComplete="off"
                    enterKeyHint="search"
                    inputMode="search"
                    className="flex-1 min-w-0 h-full bg-transparent border-0 p-0 text-[#F4F4F5] placeholder:text-white/35 outline-none text-base"
                    data-testid="transactions-search"
                />
                {hasActiveSearch ? (
                    <p
                        id={resultsSummaryId}
                        data-testid="transactions-results-summary"
                        className="shrink-0 max-w-[7.5rem] truncate text-[10px] font-bold text-[#E6C673] tabular-nums"
                        role="status"
                        aria-live="polite"
                    >
                        {resultsSummary}
                    </p>
                ) : null}
            </div>

            <div className="pt-1" data-testid="transactions-filter-strip">
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
                                        ? `${TX_QUERY_CHIP_BASE} ${GLASS_CHIP_ACTIVE}`
                                        : `${TX_QUERY_CHIP_BASE} border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:border-white/18`
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
