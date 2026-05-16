import { useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/app/components/ui/drawer';
import { Input } from '@/app/components/ui/input';
import { FinanceRecordType, useTransactionsThreadingStore } from '@/app/modules/transactionsThreading';
import type { FinanceRecord } from '@/app/modules/transactionsThreading';

export function AddFinanceBottomSheet({
  open,
  onOpenChange,
  transactionId,
  record,
  readOnly,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  record?: FinanceRecord | null;
  readOnly?: boolean;
}) {
  const addFinanceRecord = useTransactionsThreadingStore((s) => s.addFinanceRecord);
  const updateFinanceRecord = useTransactionsThreadingStore((s) => s.updateFinanceRecord);

  const [type, setType] = useState<FinanceRecordType>(FinanceRecordType.Expense);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');

  const parsedAmount = useMemo(() => Number(amount), [amount]);
  const canSubmit = useMemo(
    () => Number.isFinite(parsedAmount) && parsedAmount > 0 && description.trim().length > 0,
    [parsedAmount, description],
  );

  useEffect(() => {
    if (!open) return;
    if (!record) {
      setType(FinanceRecordType.Expense);
      setAmount('');
      setDescription('');
      return;
    }
    setType(record.type);
    setAmount(String(record.amount));
    setDescription(record.description);
  }, [open, record]);

  const submit = async () => {
    if (!canSubmit || readOnly) return;
    if (record) {
      await updateFinanceRecord(record.id, { type, amount: parsedAmount, description: description.trim() });
    } else {
      await addFinanceRecord({
        transactionId,
        type,
        amount: parsedAmount,
        description: description.trim(),
      });
    }
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#071022] border-t border-[#D4AF37]/20 rounded-t-3xl px-5 pb-6 pt-2">
        <div dir="rtl" className="text-right">
          <div className="py-3">
            <DrawerTitle className="text-white font-bold text-base">{record ? 'تعديل حركة مالية' : 'إضافة حركة مالية'}</DrawerTitle>
            <DrawerDescription className="text-gray-400 text-sm mt-1">مقبوضات من الموكل أو مصروف</DrawerDescription>
          </div>

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              disabled={!!readOnly}
              onClick={() => setType(FinanceRecordType.AdvancePayment)}
              className={`flex-1 h-11 rounded-2xl border text-sm font-bold transition ${
                type === FinanceRecordType.AdvancePayment
                  ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/25'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              } disabled:opacity-50 disabled:hover:bg-white/5`}
            >
              مقبوضات
            </button>
            <button
              type="button"
              disabled={!!readOnly}
              onClick={() => setType(FinanceRecordType.Expense)}
              className={`flex-1 h-11 rounded-2xl border text-sm font-bold transition ${
                type === FinanceRecordType.Expense
                  ? 'bg-rose-500/15 text-rose-200 border-rose-500/25'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              } disabled:opacity-50 disabled:hover:bg-white/5`}
            >
              مصروف
            </button>
          </div>

          <div className="space-y-3 mt-4">
            <div className="space-y-2">
              <div className="text-gray-300 text-sm">المبلغ</div>
              <Input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                disabled={!!readOnly}
                className="h-12 bg-[#0D0D1A] border-[#D4AF37]/20 text-white placeholder:text-gray-500 rounded-2xl focus-visible:ring-0 focus-visible:border-[#D4AF37]/50 disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <div className="text-gray-300 text-sm">الوصف</div>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مثال: رسوم طابع"
                disabled={!!readOnly}
                className="h-12 bg-[#0D0D1A] border-[#D4AF37]/20 text-white placeholder:text-gray-500 rounded-2xl focus-visible:ring-0 focus-visible:border-[#D4AF37]/50 disabled:opacity-60"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={!canSubmit || !!readOnly}
            onClick={submit}
            className="mt-5 w-full h-12 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#0D0D1A] shadow-lg shadow-[#D4AF37]/25 disabled:opacity-50 disabled:shadow-none"
          >
            حفظ الحركة
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
