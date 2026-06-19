import { useMemo, useState } from 'react';
import { Drawer, DrawerContent } from '@/app/components/ui/drawer';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import {
    GLASS_BTN,
    GLASS_FIELD,
    TX_DRAWER_SHELL,
    TxFieldLabel,
    TxGlassDrawerFrame,
} from './transactionsGlassTheme';

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

    const subtitle = parentTask
        ? `تتفرع من: ${parentTask.title}`
        : 'ستُضاف كمهمة رئيسية ضمن المعاملة';

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className={TX_DRAWER_SHELL}>
                <TxGlassDrawerFrame
                    title="إضافة مهمة"
                    subtitle={subtitle}
                    footer={
                        <button
                            type="button"
                            disabled={!canSubmit || !!readOnly}
                            onClick={submit}
                            className={GLASS_BTN}
                        >
                            حفظ المهمة
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
                        <input
                            value={deadlineDate}
                            onChange={(e) => setDeadlineDate(e.target.value)}
                            type="date"
                            disabled={!!readOnly}
                            className={`${GLASS_FIELD} disabled:opacity-50 [color-scheme:dark]`}
                        />
                    </div>
                </TxGlassDrawerFrame>
            </DrawerContent>
        </Drawer>
    );
}
