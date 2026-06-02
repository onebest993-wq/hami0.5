import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Transaction } from '@/app/modules/transactionsThreading';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading';
import { TransactionsListScreen } from './TransactionsListScreen';
import { TransactionDetailsScreen } from './TransactionDetailsScreen';

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
      className="fixed inset-0 z-[200] bg-[#0D0D1A] overflow-y-auto pointer-events-auto"
    >
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TransactionsListScreen onBack={onBack} onOpenDetails={openDetails} />
          </motion.div>
        )}
        {view === 'details' && selectedId && (
          <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TransactionDetailsScreen
              transactionId={selectedId}
              onBack={() => {
                setView('list');
                setSelectedId(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
