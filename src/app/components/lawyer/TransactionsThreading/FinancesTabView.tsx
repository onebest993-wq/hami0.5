import { useEffect, useMemo, useState } from 'react';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { FinanceRecordType } from '@/app/modules/transactionsThreading/types';
import type { FinanceRecord, Transaction } from '@/app/modules/transactionsThreading/types';
import { FinancialRecordCard } from './FinancialRecordCard';
import { AddFinanceBottomSheet } from './AddFinanceBottomSheet';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { TransactionsThreadDialogContent } from './TransactionsThreadDialogContent';
import {
    GLASS_FIELD,
    TX_ACCENT_SURFACE,
    TX_DIALOG_BTN_CANCEL,
    TX_DIALOG_BTN_DANGER,
    TX_DIALOG_DESC,
    TX_DIALOG_SHELL,
    TX_DIALOG_TITLE,
    TX_GOLD_BTN,
    TX_INNER_SURFACE,
    TX_TEXT_MUTED,
    TX_TEXT_OCHRE,
    TX_TEXT_PRIMARY,
    TX_TEXT_SECONDARY,
    TxGlassFab,
    TxGlassPanel,
} from './transactionsGlassTheme';

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
  const reduceMotion = useReduceMotion();

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
    <div dir="rtl" className="py-4 pb-28 max-w-[640px] mx-auto">
      <TxGlassPanel className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className={`${TX_TEXT_PRIMARY} font-extrabold text-sm`}>ملخص مالي</div>
          <div className={`${TX_TEXT_MUTED} text-xs font-medium`}>{transaction.targetDepartment}</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className={`${TX_INNER_SURFACE} p-3`}>
            <div className={`${TX_TEXT_MUTED} text-xs font-medium`}>الأتعاب الكلية</div>
            {transaction.agreedFees > 0 || !feesEditing ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className={`${TX_TEXT_PRIMARY} font-extrabold text-sm`}>{formatIqd(transaction.agreedFees)}</div>
                {transaction.agreedFees === 0 && !readOnly && (
                  <button
                    type="button"
                    onClick={() => setFeesEditing(true)}
                    className={`${TX_GOLD_BTN} !px-3 !text-xs`}
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
                  className={`${GLASS_FIELD} !h-10 !py-2`}
                />
                <button
                  type="button"
                  disabled={!canSaveFees || !!readOnly}
                  onClick={saveFees}
                  className={TX_GOLD_BTN + ' disabled:opacity-50'}
                >
                  حفظ
                </button>
              </div>
            )}
          </div>

          <div className={`${TX_INNER_SURFACE} border-[#C4782F]/30 p-3`}>
            <div className={`${TX_TEXT_MUTED} text-xs font-medium`}>المقبوضات</div>
            <div className={`${TX_TEXT_OCHRE} font-extrabold text-sm mt-2`}>{formatIqd(totals.received)}</div>
          </div>

          <div className={`${TX_INNER_SURFACE} p-3`}>
            <div className={`${TX_TEXT_MUTED} text-xs font-medium`}>المتبقي بذمة الموكل</div>
            <div className={`${TX_TEXT_PRIMARY} font-extrabold text-sm mt-2`}>{formatIqd(totals.remainingDue)}</div>
          </div>

          <div className={`${TX_INNER_SURFACE} p-3`}>
            <div className={`${TX_TEXT_MUTED} text-xs font-medium`}>المصاريف</div>
            <div className={`${TX_TEXT_SECONDARY} font-extrabold text-sm mt-2`}>{formatIqd(totals.expenses)}</div>
          </div>

          <div className={`col-span-2 ${TX_ACCENT_SURFACE} p-4`}>
            <div className="flex items-center justify-between gap-3">
              <div className={`${TX_TEXT_MUTED} text-xs font-medium`}>الربح الصافي</div>
              <div className={`${TX_TEXT_OCHRE} font-extrabold text-base`}>{formatIqd(totals.netProfit)}</div>
            </div>
          </div>
        </div>
      </TxGlassPanel>

      <div className="mt-5 space-y-3">
        {finance.length === 0 ? (
          <div className="pt-12 text-center">
            <div className={`${TX_TEXT_MUTED} text-sm font-medium`}>لا توجد حركات مالية بعد.</div>
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
        <TxGlassFab
          label="إضافة حركة مالية"
          extended
          onClick={() => {
            setEditingRecord(null);
            setSheetOpen(true);
          }}
        />
      )}

      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setDeleteTarget(null);
        }}
      >
        <TransactionsThreadDialogContent instant={reduceMotion} hideCloseButton className={TX_DIALOG_SHELL}>
          <DialogHeader className="text-right">
            <DialogTitle className={TX_DIALOG_TITLE}>حذف حركة مالية</DialogTitle>
            <DialogDescription className={TX_DIALOG_DESC}>سيتم حذف الحركة من سجل هذه المعاملة</DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right">
            <div className={`${TX_INNER_SURFACE} p-4 ${TX_TEXT_SECONDARY} text-sm leading-7`}>
              هل أنت متأكد من الحذف؟
              <div className={`mt-2 ${TX_TEXT_PRIMARY} font-extrabold truncate`}>{deleteTarget?.description}</div>
            </div>
          </div>
          <DialogFooter className="sm:justify-start gap-2">
            <button type="button" onClick={() => setDeleteOpen(false)} className={TX_DIALOG_BTN_CANCEL}>
              إلغاء
            </button>
            <button type="button" onClick={confirmDelete} className={TX_DIALOG_BTN_DANGER}>
              حذف
            </button>
          </DialogFooter>
        </TransactionsThreadDialogContent>
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
