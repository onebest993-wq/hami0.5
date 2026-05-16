import React, { useState, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import type { Transaction, TransactionStep, TransactionStatus } from './TransactionsSystemComplete/types';
import { AnalyticsView } from './TransactionsSystemComplete/components/AnalyticsView';
import { ArchiveView } from './TransactionsSystemComplete/components/ArchiveView';
import { TransactionsMainView } from './TransactionsSystemComplete/views/TransactionsMainView';
import { NewTransactionForm } from './TransactionsSystemComplete/views/NewTransactionForm';
import { TransactionDetailsView } from './TransactionsSystemComplete/views/TransactionDetailsView';
import { HandoverReceiptModal } from './TransactionsSystemComplete/modals/HandoverReceiptModal';
import { ScheduleAppointmentModal } from './TransactionsSystemComplete/modals/ScheduleAppointmentModal';
import { useTransactionsData } from '@/app/components/lawyer/hooks/useTransactionsData';

interface TransactionsSystemProps {
  onBack: () => void;
  userId: string;
}

export const TransactionsSystem = ({ onBack, userId }: TransactionsSystemProps) => {
  const [view, setView] = useState<'main' | 'new' | 'details' | 'analytics' | 'archive'>('main');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedStepForSchedule, setSelectedStepForSchedule] = useState<TransactionStep | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactionsData(userId);

  const handleOpenDetails = useCallback((tx: Transaction) => {
    setSelectedTransaction(tx);
    setView('details');
  }, []);

  const handleSaveTransaction = useCallback(async (newTx: Transaction) => {
    const result = await addTransaction(newTx);
    if (result) {
      setView('main');
    }
  }, [addTransaction]);

  const handleUpdateTransaction = useCallback((updated: Transaction) => {
    updateTransaction(updated);
    setSelectedTransaction(updated);
  }, [updateTransaction]);

  const handleCompleteTransaction = useCallback((tx: Transaction) => {
    setSelectedTransaction(tx);
    setShowHandoverModal(true);
  }, []);

  const handleArchiveTransaction = useCallback(async (signature: { signedAt: Date; method: 'digital' | 'whatsapp'; signatureData?: string }) => {
    if (!selectedTransaction) return;

    const updated: Transaction = {
      ...selectedTransaction,
      status: 'archived' as TransactionStatus,
      completedAt: new Date(),
      handoverSignature: signature,
    };

    await updateTransaction(updated);
    setShowHandoverModal(false);
    setView('main');
  }, [selectedTransaction, updateTransaction]);

  const handleReopenTransaction = useCallback(async (tx: Transaction) => {
    const updated: Transaction = { ...tx, status: 'in-progress' as TransactionStatus };
    await updateTransaction(updated);
    setView('main');
  }, [updateTransaction]);

  const handleScheduleStep = useCallback((step: TransactionStep) => {
    setSelectedStepForSchedule(step);
    setShowScheduleModal(true);
  }, []);

  const handleSaveAppointment = useCallback(async (date: Date, time: string) => {
    if (!selectedTransaction || !selectedStepForSchedule) return;

    const updatedSteps = selectedTransaction.steps.map((s) =>
      s.id === selectedStepForSchedule.id
        ? { ...s, appointmentDate: date, appointmentTime: time }
        : s
    );

    const updated: Transaction = { ...selectedTransaction, steps: updatedSteps };
    await updateTransaction(updated);
    setSelectedTransaction(updated);
    setShowScheduleModal(false);
  }, [selectedTransaction, selectedStepForSchedule, updateTransaction]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0D0D1A] z-[60] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
          <p className="text-gray-400 text-sm">جاري تحميل المعاملات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0D0D1A] overflow-y-auto z-[60]">
      <AnimatePresence mode="wait">
        {view === 'main' && (
          <TransactionsMainView
            key="main"
            transactions={transactions.filter((t) => t.status !== 'archived')}
            onBack={onBack}
            onOpenDetails={handleOpenDetails}
            onAddNew={() => {
              setShowTemplateSelector(true);
              setView('new');
            }}
            onOpenAnalytics={() => setView('analytics')}
            onOpenArchive={() => setView('archive')}
          />
        )}

        {view === 'new' && (
          <NewTransactionForm
            key="new"
            onBack={() => setView('main')}
            onSave={handleSaveTransaction}
            showTemplates={showTemplateSelector}
          />
        )}

        {view === 'details' && selectedTransaction && (
          <TransactionDetailsView
            key="details"
            transaction={selectedTransaction}
            onBack={() => setView('main')}
            onUpdate={handleUpdateTransaction}
            onComplete={() => handleCompleteTransaction(selectedTransaction)}
            onScheduleStep={handleScheduleStep}
          />
        )}

        {view === 'analytics' && (
          <AnalyticsView
            key="analytics"
            transactions={transactions}
            onBack={() => setView('main')}
          />
        )}

        {view === 'archive' && (
          <ArchiveView
            key="archive"
            transactions={transactions.filter((t) => t.status === 'archived')}
            onBack={() => setView('main')}
            onReopen={handleReopenTransaction}
            onOpenDetails={handleOpenDetails}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHandoverModal && selectedTransaction && (
          <HandoverReceiptModal
            transaction={selectedTransaction}
            onClose={() => setShowHandoverModal(false)}
            onConfirm={handleArchiveTransaction}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScheduleModal && selectedStepForSchedule && (
          <ScheduleAppointmentModal
            step={selectedStepForSchedule}
            onClose={() => setShowScheduleModal(false)}
            onSave={handleSaveAppointment}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
