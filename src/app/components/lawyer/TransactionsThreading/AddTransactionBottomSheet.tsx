import { useMemo, useState } from 'react';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/app/components/ui/drawer';
import { Input } from '@/app/components/ui/input';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading';
import { TransactionStatus } from '@/app/modules/transactionsThreading';

export function AddTransactionBottomSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createTransaction = useTransactionsThreadingStore((s) => s.createTransaction);

  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [targetDepartment, setTargetDepartment] = useState('');
  const canSubmit = useMemo(
    () => title.trim().length > 0 && clientName.trim().length > 0 && targetDepartment.trim().length > 0,
    [title, clientName, targetDepartment],
  );

  const submit = async () => {
    if (!canSubmit) return;
    await createTransaction({
      title: title.trim(),
      clientName: clientName.trim(),
      targetDepartment: targetDepartment.trim(),
      status: TransactionStatus.Active,
      agreedFees: 0,
    });
    setTitle('');
    setClientName('');
    setTargetDepartment('');
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#071022] border-t border-[#D4AF37]/20 rounded-t-3xl px-5 pb-6 pt-2">
        <div dir="rtl" className="text-right">
          <div className="py-3">
            <DrawerTitle className="text-white font-bold text-base">إضافة معاملة</DrawerTitle>
            <DrawerDescription className="text-gray-400 text-sm mt-1">أدخل معلومات المعاملة الأساسية</DrawerDescription>
          </div>

          <div className="space-y-3 mt-2">
            <div className="space-y-2">
              <div className="text-gray-300 text-sm">عنوان المعاملة</div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: نقل ملكية"
                className="h-12 bg-[#0D0D1A] border-[#D4AF37]/20 text-white placeholder:text-gray-500 rounded-2xl focus-visible:ring-0 focus-visible:border-[#D4AF37]/50"
              />
            </div>

            <div className="space-y-2">
              <div className="text-gray-300 text-sm">اسم الموكل</div>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="اسم الموكل الكامل"
                className="h-12 bg-[#0D0D1A] border-[#D4AF37]/20 text-white placeholder:text-gray-500 rounded-2xl focus-visible:ring-0 focus-visible:border-[#D4AF37]/50"
              />
            </div>

            <div className="space-y-2">
              <div className="text-gray-300 text-sm">الدائرة المختصة</div>
              <Input
                value={targetDepartment}
                onChange={(e) => setTargetDepartment(e.target.value)}
                placeholder="مثال: دائرة الضريبة"
                className="h-12 bg-[#0D0D1A] border-[#D4AF37]/20 text-white placeholder:text-gray-500 rounded-2xl focus-visible:ring-0 focus-visible:border-[#D4AF37]/50"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="mt-5 w-full h-12 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#0D0D1A] shadow-lg shadow-[#D4AF37]/25 disabled:opacity-50 disabled:shadow-none"
          >
            إضافة معاملة
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
