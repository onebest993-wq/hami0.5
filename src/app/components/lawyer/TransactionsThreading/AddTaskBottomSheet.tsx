import { useMemo, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import {
    GLASS_BTN,
    GLASS_FIELD,
    TX_TEXT_MUTED,
    TxFieldLabel,
    TxGlassDrawerFrame,
} from './transactionsGlassTheme';
import { TxDateInput } from './TxDateInput';
import { TransactionsHubSheet } from './TransactionsHubSheet';

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const canSubmit = useMemo(() => title.trim().length > 0, [title]);

    const deadlineIso = useMemo(() => {
        const v = deadlineDate.trim();
        if (!v) return null;
        const d = new Date(`${v}T00:00:00`);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString();
    }, [deadlineDate]);

    const submit = async () => {
        if (!canSubmit || readOnly || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await addTask({
                transactionId,
                title: title.trim(),
                parentTaskId: parentTask?.id ?? null,
                deadline: deadlineIso,
            });
            setTitle('');
            setDeadlineDate('');
            onOpenChange(false);
        } catch {
            SmartToast.error('تعذر حفظ المهمة — حاول مرة أخرى');
        } finally {
            setIsSubmitting(false);
        }
    };

    const subtitle = parentTask
        ? `تتفرع من: ${parentTask.title}`
        : 'ستُضاف كمهمة رئيسية ضمن المعاملة';

    return (
        <TransactionsHubSheet open={open} onOpenChange={onOpenChange}>
            <TxGlassDrawerFrame
                    title="إضافة مهمة"
                    subtitle={subtitle}
                    footer={
                        <button
                            type="button"
                            disabled={!canSubmit || !!readOnly || isSubmitting}
                            onClick={() => void submit()}
                            className={GLASS_BTN + ' disabled:opacity-50'}
                        >
                            {isSubmitting ? 'جاري الحفظ...' : 'حفظ المهمة'}
                        </button>
                    }
            >
                    <div>
                        <TxFieldLabel>عنوان المهمة</TxFieldLabel>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="مثال: تقديم العريضة"
                            disabled={!!readOnly}
                            className={`${GLASS_FIELD} disabled:opacity-50`}
                        />
                    </div>
                    <div>
                        <TxFieldLabel>تاريخ نفاذ الصلاحية / المهلة (اختياري)</TxFieldLabel>
                        <TxDateInput
                            value={deadlineDate}
                            onChange={(e) => setDeadlineDate(e.target.value)}
                            disabled={!!readOnly}
                        />
                        <p className={`${TX_TEXT_MUTED} text-[10px] mt-1.5 leading-5 font-medium`}>
                            {deadlineDate
                                ? 'سيظهر في التقويم كموعد مهلة لهذه المهمة.'
                                : 'مهلة المهام وتواريخ المصاريف تُزامَن مع التقويم.'}
                        </p>
                    </div>
            </TxGlassDrawerFrame>
        </TransactionsHubSheet>
    );
}
