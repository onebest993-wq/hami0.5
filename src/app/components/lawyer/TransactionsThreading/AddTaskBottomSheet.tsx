import { useMemo, useState } from 'react';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/app/components/ui/drawer';
import { Input } from '@/app/components/ui/input';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading';

export function AddTaskBottomSheet({
  open,
  onOpenChange,
  transactionId,
  parentTask,
  readOnly,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  parentTask: { id: string; title: string } | null;
  readOnly?: boolean;
}) {
  const addTask = useTransactionsThreadingStore((s) => s.addTask);

  const [title, setTitle] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const canSubmit = useMemo(() => title.trim().length > 0, [title]);

  const deadlineIso = useMemo(() => {
    const v = deadlineDate.trim();
    if (!v) return null;
    const d = new Date(`${v}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }, [deadlineDate]);

  const submit = async () => {
    if (!canSubmit || readOnly) return;
    await addTask({
      transactionId,
      title: title.trim(),
      parentTaskId: parentTask?.id ?? null,
      deadline: deadlineIso,
    });
    setTitle('');
    setDeadlineDate('');
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#071022] border-t border-[#D4AF37]/20 rounded-t-3xl px-5 pb-6 pt-2">
        <div dir="rtl" className="text-right">
          <div className="py-3">
            <DrawerTitle className="text-white font-bold text-base">إضافة مهمة</DrawerTitle>
            {parentTask ? (
              <DrawerDescription className="text-gray-300 text-sm mt-2">
                تتفرع من:
                <span className="text-white font-bold mr-2">{parentTask.title}</span>
              </DrawerDescription>
            ) : (
              <DrawerDescription className="text-gray-400 text-sm mt-1">ستُضاف كمهمة رئيسية ضمن المعاملة</DrawerDescription>
            )}
          </div>

          <div className="space-y-2 mt-2">
            <div className="text-gray-300 text-sm">عنوان المهمة</div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تقديم العريضة"
              disabled={!!readOnly}
              className="h-12 bg-[#0D0D1A] border-[#D4AF37]/20 text-white placeholder:text-gray-500 rounded-2xl focus-visible:ring-0 focus-visible:border-[#D4AF37]/50 disabled:opacity-60"
            />
          </div>

          <div className="space-y-2 mt-4">
            <div className="text-gray-300 text-sm">تاريخ نفاذ الصلاحية / المهلة</div>
            <input
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              type="date"
              disabled={!!readOnly}
              className="w-full h-12 rounded-2xl bg-[#0D0D1A] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37]/50 disabled:opacity-60"
            />
            <div className="text-gray-500 text-xs">اختياري — يُستخدم لتنبيه قرب انتهاء المهلة</div>
          </div>

          <button
            type="button"
            disabled={!canSubmit || !!readOnly}
            onClick={submit}
            className="mt-5 w-full h-12 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#0D0D1A] shadow-lg shadow-[#D4AF37]/25 disabled:opacity-50 disabled:shadow-none"
          >
            حفظ المهمة
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
