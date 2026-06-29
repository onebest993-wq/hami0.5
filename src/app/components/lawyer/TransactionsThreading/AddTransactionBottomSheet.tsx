import { useMemo, useState, type FormEvent } from 'react';
import { Drawer, DrawerContent } from '@/app/components/ui/drawer';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { TransactionStatus } from '@/app/modules/transactionsThreading/types';
import {
    clampTransactionText,
    sanitizeTransactionCreateFields,
    TX_CLIENT_NAME_MAX,
    TX_DEPARTMENT_MAX,
    TX_TITLE_MAX,
} from '@/app/services/transactions/transactionsInputSecurity';
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
        const sanitized = sanitizeTransactionCreateFields({
            title,
            clientName,
            targetDepartment,
        });
        if (!sanitized.title || !sanitized.clientName || !sanitized.targetDepartment) return;
        await createTransaction({
            ...sanitized,
            status: TransactionStatus.Active,
            agreedFees: 0,
        });
        setTitle('');
        setClientName('');
        setTargetDepartment('');
        onOpenChange(false);
    };

    const onFormSubmit = (e: FormEvent) => {
        e.preventDefault();
        void submit();
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className={TX_DRAWER_SHELL} data-testid="transactions-add-sheet">
                <form onSubmit={onFormSubmit}>
                <TxGlassDrawerFrame
                    title="إضافة معاملة"
                    subtitle="معلومات المعاملة الأساسية"
                    footer={
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className={GLASS_BTN}
                            data-testid="transactions-add-submit"
                        >
                            إضافة معاملة
                        </button>
                    }
                >
                    <div>
                        <TxFieldLabel>عنوان المعاملة</TxFieldLabel>
                        <input
                            value={title}
                            onChange={(e) => setTitle(clampTransactionText(e.target.value, TX_TITLE_MAX))}
                            placeholder="مثال: نقل ملكية"
                            className={GLASS_FIELD}
                        />
                    </div>
                    <div>
                        <TxFieldLabel>اسم الموكل</TxFieldLabel>
                        <input
                            value={clientName}
                            onChange={(e) => setClientName(clampTransactionText(e.target.value, TX_CLIENT_NAME_MAX))}
                            placeholder="اسم الموكل الكامل"
                            className={GLASS_FIELD}
                        />
                    </div>
                    <div>
                        <TxFieldLabel>الدائرة المختصة</TxFieldLabel>
                        <input
                            value={targetDepartment}
                            onChange={(e) =>
                                setTargetDepartment(clampTransactionText(e.target.value, TX_DEPARTMENT_MAX))
                            }
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && canSubmit) {
                                    e.preventDefault();
                                    void submit();
                                }
                            }}
                            placeholder="مثال: دائرة الضريبة"
                            className={GLASS_FIELD}
                        />
                    </div>
                </TxGlassDrawerFrame>
                </form>
            </DrawerContent>
        </Drawer>
    );
}
