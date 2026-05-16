import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, TrendingUp, FileText, DollarSign,
  Phone, MessageCircle, CalendarDays, Printer
} from 'lucide-react';
import type { Transaction, TransactionStep, Expense, DepartmentType } from '../types';
import { DEPARTMENTS } from '../constants';
import { ProgressTab } from '../tabs/ProgressTab';
import { DocumentsTab } from '../tabs/DocumentsTab';
import { ExpensesTab } from '../tabs/ExpensesTab';
import { InvoicePreviewModal } from '../modals/InvoicePreviewModal';

interface TransactionDetailsViewProps {
  transaction: Transaction;
  onBack: () => void;
  onUpdate: (tx: Transaction) => void;
  onComplete: () => void;
  onScheduleStep: (step: TransactionStep) => void;
}

export const TransactionDetailsView = ({
  transaction: initialTx, onBack, onUpdate, onComplete, onScheduleStep
}: TransactionDetailsViewProps) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'documents' | 'expenses'>('progress');
  const [localTransaction, setLocalTransaction] = useState(initialTx);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);

  React.useEffect(() => {
    setLocalTransaction(initialTx);
  }, [initialTx]);

  const toggleStep = (stepId: string) => {
    const updatedSteps = localTransaction.steps.map((step: TransactionStep) =>
      step.id === stepId ? { ...step, completed: !step.completed, date: !step.completed ? new Date() : undefined } : step
    );
    const updated = { ...localTransaction, steps: updatedSteps };
    setLocalTransaction(updated);
    onUpdate(updated);
  };

  const addExpense = (description: string, amount: number, category: Expense['category']) => {
    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      description,
      amount,
      date: new Date(),
      category
    };
    const updated = { ...localTransaction, expenses: [...localTransaction.expenses, newExpense] };
    setLocalTransaction(updated);
    onUpdate(updated);
  };

  const deptInfo = DEPARTMENTS.find(d => d.id === localTransaction.departmentType) || DEPARTMENTS[0];
  const DeptIcon = deptInfo.icon;

  const totalExpenses = localTransaction.expenses.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
  const completedSteps = localTransaction.steps.filter((s: TransactionStep) => s.completed).length;
  const progressPercent = (completedSteps / localTransaction.steps.length) * 100;
  const allStepsCompleted = completedSteps === localTransaction.steps.length;

  return (
    <div className="h-full pb-24">
      <div className="sticky top-0 z-50 bg-[#001830]/95 backdrop-blur-xl border-b border-[#D4AF37]/20">
        <div className="p-5 flex items-center justify-between">
          <button type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37]/10 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-white truncate flex-1 mx-3">{localTransaction.transactionType}</h1>
          <div className="w-10" />
        </div>

        <div className="px-6 pb-5">
          <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border border-[#D4AF37]/30 rounded-2xl p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-xl ${deptInfo.color} flex items-center justify-center shrink-0`}>
                <DeptIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-xl mb-1">{localTransaction.clientName}</h2>
                <p className="text-[#D4AF37] text-sm">{localTransaction.transactionType}</p>
                <p className="text-gray-400 text-xs mt-1">
                  {deptInfo.label} {localTransaction.receiptNumber && `• وصل ${localTransaction.receiptNumber}`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {localTransaction.clientPhone && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="h-10 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl text-[#D4AF37] text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  اتصال
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="h-10 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-medium flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                واتساب
              </motion.button>
            </div>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="flex gap-2 bg-[#0D0D1A] rounded-2xl p-1 border border-white/10">
            {[
              { id: 'progress', label: 'المسار', icon: TrendingUp },
              { id: 'documents', label: 'الوثائق', icon: FileText },
              { id: 'expenses', label: 'المصاريف', icon: DollarSign }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'progress' | 'documents' | 'expenses')}
                  className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#D4AF37] text-[#0D0D1A] shadow-lg'
                      : 'text-gray-400 hover:bg-white/5'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'progress' && (
            <ProgressTab
              key="progress"
              transaction={localTransaction}
              onToggleStep={toggleStep}
              progressPercent={progressPercent}
              allStepsCompleted={allStepsCompleted}
              onComplete={onComplete}
              onScheduleStep={onScheduleStep}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab
              key="documents"
              transaction={localTransaction}
            />
          )}
          {activeTab === 'expenses' && (
            <ExpensesTab
              key="expenses"
              transaction={localTransaction}
              onAddExpense={addExpense}
              totalExpenses={totalExpenses}
              onGenerateInvoice={() => setShowInvoicePreview(true)}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showInvoicePreview && (
          <InvoicePreviewModal
            transaction={localTransaction}
            totalExpenses={totalExpenses}
            onClose={() => setShowInvoicePreview(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
