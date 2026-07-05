import { useEffect, useMemo, useState } from 'react';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { FinanceRecordType } from '@/app/modules/transactionsThreading/types';
import type { FinanceRecord } from '@/app/modules/transactionsThreading/types';
import {
    GLASS_BTN,
    GLASS_CHIP,
    GLASS_CHIP_ACTIVE,
    GLASS_FIELD,
    TX_TEXT_MUTED,
    TxFieldLabel,
    TxGlassDrawerFrame,
    TX_TEXT_OCHRE,
} from './transactionsGlassTheme';
import { TransactionsHubSheet } from './TransactionsHubSheet';
import { TxDateInput } from './TxDateInput';

function todayDateInput(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

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
    const [financeDate, setFinanceDate] = useState('');

    const parsedAmount = useMemo(() => Number(amount), [amount]);
    const canSubmit = useMemo(
        () => Number.isFinite(parsedAmount) && parsedAmount > 0 && description.trim().length > 0 && financeDate.trim().length > 0,
        [parsedAmount, description, financeDate],
    );

    const dateIso = useMemo(() => {
        const v = financeDate.trim();
        if (!v) return null;
        const d = new Date(`${v}T00:00:00`);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString();
    }, [financeDate]);

    useEffect(() => {
        if (!open) return;
        if (!record) {
            setType(FinanceRecordType.Expense);
            setAmount('');
            setDescription('');
            setFinanceDate(todayDateInput());
            return;
        }
        setType(record.type);
        setAmount(String(record.amount));
        setDescription(record.description);
        setFinanceDate(record.date ? record.date.slice(0, 10) : todayDateInput());
    }, [open, record]);

    const submit = async () => {
        if (!canSubmit || readOnly || !dateIso) return;
        if (record) {
            await updateFinanceRecord(record.id, {
                type,
                amount: parsedAmount,
                description: description.trim(),
                date: dateIso,
            });
        } else {
            await addFinanceRecord({
                transactionId,
                type,
                amount: parsedAmount,
                description: description.trim(),
                date: dateIso,
            });
        }
        onOpenChange(false);
    };

    return (
        <TransactionsHubSheet open={open} onOpenChange={onOpenChange}>
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
                        <TxFieldLabel>تاريخ الحركة</TxFieldLabel>
                        <TxDateInput
                            value={financeDate}
                            onChange={(e) => setFinanceDate(e.target.value)}
                            disabled={!!readOnly}
                        />
                        <p className={`${TX_TEXT_MUTED} text-[10px] mt-1.5 leading-5 font-medium`}>
                            يُزامَن تلقائياً مع التقويم (معاملات إدارية).
                        </p>
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
        </TransactionsHubSheet>
    );
}
