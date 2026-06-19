import { useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerContent } from '@/app/components/ui/drawer';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { FinanceRecordType } from '@/app/modules/transactionsThreading/types';
import type { FinanceRecord } from '@/app/modules/transactionsThreading/types';
import {
    GLASS_BTN,
    GLASS_CHIP,
    GLASS_CHIP_ACTIVE,
    GLASS_FIELD,
    TX_DRAWER_SHELL,
    TxFieldLabel,
    TxGlassDrawerFrame,
    TX_TEXT_OCHRE,
} from './transactionsGlassTheme';

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
            <DrawerContent className={TX_DRAWER_SHELL}>
                <TxGlassDrawerFrame
                    title={record ? 'تعديل حركة مالية' : 'إضافة حركة مالية'}
                    subtitle="مقبوضات من الموكل أو مصروف"
                    footer={
                        <button type="button" disabled={!canSubmit || !!readOnly} onClick={submit} className={GLASS_BTN}>
                            حفظ الحركة
                        </button>
                    }
                >
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={!!readOnly}
                            onClick={() => setType(FinanceRecordType.AdvancePayment)}
                            className={
                                type === FinanceRecordType.AdvancePayment
                                    ? `${GLASS_CHIP_ACTIVE} flex-1 !rounded-[3px] !py-2.5 ${TX_TEXT_OCHRE}`
                                    : `${GLASS_CHIP} flex-1 !rounded-[3px] !py-2.5`
                            }
                        >
                            مقبوضات
                        </button>
                        <button
                            type="button"
                            disabled={!!readOnly}
                            onClick={() => setType(FinanceRecordType.Expense)}
                            className={
                                type === FinanceRecordType.Expense
                                    ? `${GLASS_CHIP_ACTIVE} flex-1 !rounded-[3px] !py-2.5`
                                    : `${GLASS_CHIP} flex-1 !rounded-[3px] !py-2.5`
                            }
                        >
                            مصروف
                        </button>
                    </div>
                    <div>
                        <TxFieldLabel>المبلغ</TxFieldLabel>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            disabled={!!readOnly}
                            className={`${GLASS_FIELD} disabled:opacity-50`}
                        />
                    </div>
                    <div>
                        <TxFieldLabel>الوصف</TxFieldLabel>
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="مثال: رسوم طابع"
                            disabled={!!readOnly}
                            className={`${GLASS_FIELD} disabled:opacity-50`}
                        />
                    </div>
                </TxGlassDrawerFrame>
            </DrawerContent>
        </Drawer>
    );
}
