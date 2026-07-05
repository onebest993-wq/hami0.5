import { memo, useEffect, useMemo, useState, type FormEvent } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useTransactionsThreadingStore, ensureTransactionsUserBound } from '@/app/modules/transactionsThreading/store';
import { TransactionStatus } from '@/app/modules/transactionsThreading/types';
import { prefetchTransactionsCloudModule } from '@/app/services/transactions/transactionsCloudLoader';
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
    TxFieldLabel,
    TxGlassDrawerFrame,
} from './transactionsGlassTheme';
import { TransactionsHubSheet } from './TransactionsHubSheet';

function prefetchTransactionsPersistModule(): void {
    prefetchTransactionsCloudModule();
}

export const AddTransactionBottomSheet = memo(function AddTransactionBottomSheet({
    open,
    onOpenChange,
    keepMounted = false,
    hubUserId,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    keepMounted?: boolean;
    hubUserId?: string;
}) {
    const createTransaction = useTransactionsThreadingStore((s) => s.createTransaction);
    const storeUserId = useTransactionsThreadingStore((s) => s.userId);
    const effectiveUserId = storeUserId ?? hubUserId;

    const [title, setTitle] = useState('');
    const [clientName, setClientName] = useState('');
    const [targetDepartment, setTargetDepartment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const canSubmit = useMemo(
        () => title.trim().length > 0 && clientName.trim().length > 0 && targetDepartment.trim().length > 0,
        [title, clientName, targetDepartment],
    );

    useEffect(() => {
        if (keepMounted || open) prefetchTransactionsPersistModule();
    }, [keepMounted, open]);

    const submit = async () => {
        if (!canSubmit || isSubmitting) return;
        const sanitized = sanitizeTransactionCreateFields({
            title,
            clientName,
            targetDepartment,
        });
        if (!sanitized.title || !sanitized.clientName || !sanitized.targetDepartment) return;

        setIsSubmitting(true);
        try {
            if (!effectiveUserId) {
                SmartToast.error('جاري تجهيز المعاملات — حاول بعد لحظة');
                return;
            }
            ensureTransactionsUserBound(effectiveUserId);

            await createTransaction({
                ...sanitized,
                status: TransactionStatus.Active,
                agreedFees: 0,
            });

            setTitle('');
            setClientName('');
            setTargetDepartment('');
            onOpenChange(false);
            SmartToast.success('تمت إضافة المعاملة');
        } catch {
            SmartToast.error('تعذر إضافة المعاملة — حاول مرة أخرى');
        } finally {
            setIsSubmitting(false);
        }
    };

    const onFormSubmit = (e: FormEvent) => {
        e.preventDefault();
        void submit();
    };

    return (
        <TransactionsHubSheet
            open={open}
            onOpenChange={onOpenChange}
            keepMounted={keepMounted}
            testId="transactions-add-sheet"
        >
            <form onSubmit={onFormSubmit}>
                <TxGlassDrawerFrame
                    title="إضافة معاملة"
                    subtitle="معلومات المعاملة الأساسية"
                    footer={
                        <button
                            type="submit"
                            disabled={!canSubmit || isSubmitting}
                            className={GLASS_BTN + ' disabled:opacity-50'}
                            data-testid="transactions-add-submit"
                        >
                            {isSubmitting ? 'جاري الحفظ...' : 'إضافة معاملة'}
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
                            disabled={isSubmitting}
                            autoComplete="off"
                        />
                    </div>
                    <div>
                        <TxFieldLabel>اسم الموكل</TxFieldLabel>
                        <input
                            value={clientName}
                            onChange={(e) => setClientName(clampTransactionText(e.target.value, TX_CLIENT_NAME_MAX))}
                            placeholder="اسم الموكل الكامل"
                            className={GLASS_FIELD}
                            disabled={isSubmitting}
                            autoComplete="name"
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
                                if (e.key === 'Enter' && canSubmit && !isSubmitting) {
                                    e.preventDefault();
                                    void submit();
                                }
                            }}
                            placeholder="مثال: دائرة الضريبة"
                            className={GLASS_FIELD}
                            disabled={isSubmitting}
                            autoComplete="off"
                        />
                    </div>
                </TxGlassDrawerFrame>
            </form>
        </TransactionsHubSheet>
    );
});
