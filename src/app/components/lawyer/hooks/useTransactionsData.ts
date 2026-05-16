import { useState, useEffect, useCallback } from 'react';
import { TransactionDB, uuidv4 } from '@/app/services/lawyer-cloud';
import type { Transaction } from '@/app/components/lawyer/TransactionsSystemComplete/types';

export function useTransactionsData(userId: string) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await TransactionDB.getTransactions(userId);
            setTransactions(data as Transaction[]);
        } catch {
            setError('فشل تحميل المعاملات');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const addTransaction = useCallback(async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
        const now = new Date();
        const newTx: Transaction = {
            ...tx as any,
            id: uuidv4(),
            createdAt: now,
        };
        try {
            await TransactionDB.saveTransaction({ ...newTx, userId, updatedAt: now.toISOString() });
            setTransactions((prev) => [newTx, ...prev]);
            return newTx;
        } catch {
            setError('فشل إضافة المعاملة');
            return null;
        }
    }, [userId]);

    const updateTransactionState = useCallback(async (tx: Transaction) => {
        const updated = { ...tx, updatedAt: new Date().toISOString() };
        try {
            await TransactionDB.updateTransaction({ ...updated, userId });
            setTransactions((prev) => prev.map((t) => (t.id === tx.id ? (updated as Transaction) : t)));
            return updated as Transaction;
        } catch {
            setError('فشل تحديث المعاملة');
            return null;
        }
    }, [userId]);

    const deleteTransaction = useCallback(async (txId: string) => {
        try {
            await TransactionDB.deleteTransaction(txId, userId);
            setTransactions((prev) => prev.filter((t) => t.id !== txId));
        } catch {
            setError('فشل حذف المعاملة');
        }
    }, [userId]);

    return {
        transactions,
        loading,
        error,
        addTransaction,
        updateTransaction: updateTransactionState,
        deleteTransaction,
        refresh: fetchTransactions,
    };
}
