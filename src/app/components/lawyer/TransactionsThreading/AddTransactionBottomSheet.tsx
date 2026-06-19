import { useMemo, useState } from 'react';
import { Drawer, DrawerContent } from '@/app/components/ui/drawer';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { TransactionStatus } from '@/app/modules/transactionsThreading/types';
import {
    GLASS_BTN,
    GLASS_FIELD,
    TX_DRAWER_SHELL,
    TxFieldLabel,
    TxGlassDrawerFrame,
} from './transactionsGlassTheme';

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
            <DrawerContent className={TX_DRAWER_SHELL}>
                <TxGlassDrawerFrame
                    title="إضافة معاملة"
                    subtitle="معلومات المعاملة الأساسية"
                    footer={
                        <button type="button" disabled={!canSubmit} onClick={submit} className={GLASS_BTN}>
                            إضافة معاملة
                        </button>
                    }
                >
                    <div>
                        <TxFieldLabel>عنوان المعاملة</TxFieldLabel>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="مثال: نقل ملكية"
                            className={GLASS_FIELD}
                        />
                    </div>
                    <div>
                        <TxFieldLabel>اسم الموكل</TxFieldLabel>
                        <input
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="اسم الموكل الكامل"
                            className={GLASS_FIELD}
                        />
                    </div>
                    <div>
                        <TxFieldLabel>الدائرة المختصة</TxFieldLabel>
                        <input
                            value={targetDepartment}
                            onChange={(e) => setTargetDepartment(e.target.value)}
                            placeholder="مثال: دائرة الضريبة"
                            className={GLASS_FIELD}
                        />
                    </div>
                </TxGlassDrawerFrame>
            </DrawerContent>
        </Drawer>
    );
}
