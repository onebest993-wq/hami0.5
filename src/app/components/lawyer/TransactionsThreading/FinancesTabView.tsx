import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { FinanceRecordType, useTransactionsThreadingStore } from '@/app/modules/transactionsThreading';
import type { FinanceRecord, Transaction } from '@/app/modules/transactionsThreading';
import { FinancialRecordCard } from './FinancialRecordCard';
import { AddFinanceBottomSheet } from './AddFinanceBottomSheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';

const EMPTY_FINANCE: FinanceRecord[] = [];

function formatIqd(amount: number) {
  try {
    return new Intl.NumberFormat('ar-IQ').format(amount) + ' د.ع';
  } catch {
    return `${amount} د.ع`;
  }
}

export function FinancesTabView({ transaction, readOnly }: { transaction: Transaction; readOnly?: boolean }) {
  const refreshTransactionData = useTransactionsThreadingStore((s) => s.refreshTransactionData);
  const finance = useTransactionsThreadingStore((s) => s.financeByTransactionId[transaction.id] ?? EMPTY_FINANCE);
  const setTransactionAgreedFees = useTransactionsThreadingStore((s) => s.setTransactionAgreedFees);
  const deleteFinanceRecord = useTransactionsThreadingStore((s) => s.deleteFinanceRecord);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FinanceRecord | null>(null);
  const [feesEditing, setFeesEditing] = useState(false);
  const [feesInput, setFeesInput] = useState('');

  useEffect(() => {
    refreshTransactionData(transaction.id);
  }, [refreshTransactionData, transaction.id]);

  const totals = useMemo(() => {
    let received = 0;
    let expenses = 0;
    for (const r of finance) {
      if (r.type === FinanceRecordType.AdvancePayment) received += r.amount;
      if (r.type === FinanceRecordType.Expense) expenses += r.amount;
    }
    const remainingDue = transaction.agreedFees - received;
    const netProfit = received - expenses;
    return { received, expenses, remainingDue, netProfit };
  }, [finance, transaction.agreedFees]);

  const parsedFees = useMemo(() => Number(feesInput), [feesInput]);
  const canSaveFees = useMemo(() => Number.isFinite(parsedFees) && parsedFees > 0, [parsedFees]);

  const saveFees = async () => {
    if (!canSaveFees || readOnly) return;
    await setTransactionAgreedFees(transaction.id, parsedFees);
    setFeesEditing(false);
    setFeesInput('');
  };

  const requestEdit = (record: FinanceRecord) => {
    if (readOnly) return;
    setEditingRecord(record);
    setSheetOpen(true);
  };

  const requestDelete = (record: FinanceRecord) => {
    if (readOnly) return;
    setDeleteTarget(record);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteFinanceRecord(deleteTarget.id);
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  return (
    <div dir="rtl" className="px-5 py-5 pb-28 max-w-[640px] mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-white/7 to-white/3 border border-[#D4AF37]/18 p-4 shadow-[0_25px_70px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-white font-extrabold text-sm">ملخص مالي</div>
          <div className="text-gray-400 text-xs">{transaction.targetDepartment}</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/25 border border-white/10 p-3">
            <div className="text-gray-400 text-xs">الأتعاب الكلية</div>
            {transaction.agreedFees > 0 || !feesEditing ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="text-white font-extrabold text-sm">{formatIqd(transaction.agreedFees)}</div>
                {transaction.agreedFees === 0 && !readOnly && (
                  <button
                    type="button"
                    onClick={() => setFeesEditing(true)}
                    className="h-8 px-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 text-xs font-bold hover:bg-white/10"
                  >
                    تعديل
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={feesInput}
                  onChange={(e) => setFeesInput(e.target.value)}
                  inputMode="numeric"
                  type="number"
                  placeholder="0"
                  disabled={!!readOnly}
                  className="w-full h-10 rounded-xl bg-[#0D0D1A] border border-[#D4AF37]/20 text-white px-3 outline-none focus:border-[#D4AF37]/50 disabled:opacity-60"
                />
                <button
                  type="button"
                  disabled={!canSaveFees || !!readOnly}
                  onClick={saveFees}
                  className="h-10 px-4 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/25 text-[#F4C430] text-xs font-extrabold disabled:opacity-50"
                >
                  حفظ
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-black/25 border border-emerald-500/15 p-3">
            <div className="text-gray-400 text-xs">المقبوضات</div>
            <div className="text-emerald-200 font-extrabold text-sm mt-2">{formatIqd(totals.received)}</div>
          </div>

          <div className="rounded-2xl bg-black/25 border border-amber-500/15 p-3">
            <div className="text-gray-400 text-xs">المتبقي بذمة الموكل</div>
            <div className="text-amber-200 font-extrabold text-sm mt-2">{formatIqd(totals.remainingDue)}</div>
          </div>

          <div className="rounded-2xl bg-black/25 border border-rose-500/15 p-3">
            <div className="text-gray-400 text-xs">المصاريف</div>
            <div className="text-rose-200 font-extrabold text-sm mt-2">{formatIqd(totals.expenses)}</div>
          </div>

          <div className="col-span-2 rounded-2xl bg-black/30 border border-emerald-500/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-gray-400 text-xs">الربح الصافي</div>
              <div className="text-emerald-300 font-extrabold text-base">{formatIqd(totals.netProfit)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {finance.length === 0 ? (
          <div className="pt-12 text-center">
            <div className="text-gray-400 text-sm">لا توجد حركات مالية بعد.</div>
          </div>
        ) : (
          finance
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((r) => (
              <FinancialRecordCard
                key={r.id}
                record={r}
                onEdit={requestEdit}
                onDelete={requestDelete}
                readOnly={readOnly}
              />
            ))
        )}
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={() => {
            setEditingRecord(null);
            setSheetOpen(true);
          }}
          className="fixed bottom-6 left-6 h-14 px-5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#0D0D1A] shadow-2xl shadow-[#D4AF37]/30 flex items-center justify-center gap-2 font-bold"
        >
          <Plus className="w-5 h-5" />
          إضافة حركة مالية
        </button>
      )}

      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent className="bg-[#071022] border border-rose-500/20 rounded-3xl p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-white text-base">حذف حركة مالية</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">سيتم حذف الحركة من سجل هذه المعاملة</DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right">
            <div className="rounded-2xl bg-black/20 border border-white/10 p-4 text-gray-100 text-sm leading-7">
              هل أنت متأكد من الحذف؟
              <div className="mt-2 text-gray-300 font-bold truncate">{deleteTarget?.description}</div>
            </div>
          </div>
          <DialogFooter className="sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="h-11 px-5 rounded-2xl bg-white/5 border border-white/10 text-gray-200 font-bold"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="h-11 px-5 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-200 font-extrabold"
            >
              حذف
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddFinanceBottomSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setEditingRecord(null);
        }}
        transactionId={transaction.id}
        record={editingRecord}
        readOnly={readOnly}
      />
    </div>
  );
}
