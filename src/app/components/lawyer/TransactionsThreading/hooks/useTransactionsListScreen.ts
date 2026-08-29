import { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import {
    filterTransactionsList,
    type TransactionsListStatusFilter,
} from '@/app/services/transactions/filterTransactionsList';
import {
    readTransactionsListQuerySession,
    writeTransactionsListQuerySession,
} from '@/app/components/lawyer/TransactionsThreading/utils/transactionsListQuerySession';

const EMPTY_TRANSACTIONS: Transaction[] = [];

type TransactionsListScreenParams = {
    onOpenDetails?: (tx: Transaction) => void;
    addSheetOpen?: boolean;
    onAddSheetOpenChange?: (open: boolean) => void;
    hubOpen?: boolean;
    cardsInteractive?: boolean;
};

export function useTransactionsListScreen({
    onOpenDetails,
    addSheetOpen,
    onAddSheetOpenChange,
    hubOpen = true,
    cardsInteractive = true,
}: TransactionsListScreenParams) {
    const transactions = useTransactionsThreadingStore((s) =>
        hubOpen ? s.transactions : EMPTY_TRANSACTIONS,
    );

    const [query, setQuery] = useState(() => readTransactionsListQuerySession().query);
    const [filter, setFilter] = useState<TransactionsListStatusFilter>(
        () => readTransactionsListQuerySession().filter,
    );
    const [localSheetOpen, setLocalSheetOpen] = useState(false);
    const [sheetPrimed, setSheetPrimed] = useState(false);
    const setSheetOpen = useCallback(
        (open: boolean) => {
            if (onAddSheetOpenChange) onAddSheetOpenChange(open);
            else setLocalSheetOpen(open);
            if (!open) setSheetPrimed(false);
        },
        [onAddSheetOpenChange],
    );
    const sheetOpen = addSheetOpen ?? localSheetOpen;

    useEffect(() => {
        writeTransactionsListQuerySession({ query, filter });
    }, [query, filter]);

    useEffect(() => {
        if (!hubOpen) setSheetPrimed(false);
    }, [hubOpen]);

    useEffect(() => {
        if (addSheetOpen === false) setSheetPrimed(false);
    }, [addSheetOpen]);

    const primeAddSheet = useCallback(() => {
        setSheetPrimed(true);
    }, []);

    const onQueryChange = useCallback((value: string) => {
        startTransition(() => setQuery(value));
    }, []);

    const onFilterChange = useCallback((next: TransactionsListStatusFilter) => {
        startTransition(() => setFilter(next));
    }, []);

    const filtered = useMemo(
        () => (hubOpen ? filterTransactionsList(transactions, query, filter) : EMPTY_TRANSACTIONS),
        [hubOpen, transactions, query, filter],
    );
    const resultsSummaryId = 'transactions-results-summary';
    const resultsSummary = filtered.length === 0 ? 'لا نتائج' : `${filtered.length} نتيجة`;

    const onPressTransaction = useCallback(
        (tx: Transaction) => {
            if (!cardsInteractive) return;
            onOpenDetails?.(tx);
        },
        [cardsInteractive, onOpenDetails],
    );

    return {
        query,
        onQueryChange,
        filter,
        onFilterChange,
        filtered,
        resultsSummary,
        resultsSummaryId,
        onPressTransaction,
        sheetOpen,
        setSheetOpen,
        sheetPrimed,
        primeAddSheet,
        cardsInteractive,
    };
}
