import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { TransactionsListScreen } from './TransactionsListScreen';
import { TransactionDetailsScreen } from './TransactionDetailsScreen';
import { TX_OVERLAY } from './transactionsGlassTheme';

export function TransactionsThreadingSystem({
  onBack,
  userId,
  initialTransactionId,
}: {
  onBack: () => void;
  userId: string;
  initialTransactionId?: string;
}) {
  const refreshTransactions = useTransactionsThreadingStore((s) => s.refreshTransactions);
  const setUserId = useTransactionsThreadingStore((s) => s.setUserId);
  const [view, setView] = useState<'list' | 'details'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    (async () => {
      await setUserId(userId);
      await refreshTransactions();
    })();
  }, [setUserId, userId, refreshTransactions]);

  useEffect(() => {
    if (!initialTransactionId) return;
    setSelectedId(initialTransactionId);
    setView('details');
  }, [initialTransactionId]);

  const openDetails = (tx: Transaction) => {
    setSelectedId(tx.id);
    setView('details');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={TX_OVERLAY}
    >
      {view === 'list' ? (
        <TransactionsListScreen onBack={onBack} onOpenDetails={openDetails} />
      ) : selectedId ? (
        <TransactionDetailsScreen
          transactionId={selectedId}
          onBack={() => {
            setView('list');
            setSelectedId(null);
          }}
        />
      ) : null}
    </motion.div>
  );
}
