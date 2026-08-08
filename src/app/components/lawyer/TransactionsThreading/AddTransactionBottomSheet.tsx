import { memo, useEffect, useMemo, useState, type FormEvent } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useTransactionsThreadingStore, ensureTransactionsUserBound } from '@/app/modules/transactionsThreading/store';
import { TransactionStatus, type Transaction } from '@/app/modules/transactionsThreading/types';
import { applyProcedureGuideToTransaction } from '@/app/services/transactions/applyProcedureGuideToTransaction';
import { consumePendingProcedureGuide } from '@/app/services/transactions/procedureGuideNavigation';
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
    onCreated,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    keepMounted?: boolean;
    hubUserId?: string;
    onCreated?: (tx: Transaction) => void;
}) {
    const createTransaction = useTransactionsThreadingStore((s) => s.createTransaction);
    const addTask = useTransactionsThreadingStore((s) => s.addTask);
    const addDocument = useTransactionsThreadingStore((s) => s.addDocument);
    const refreshTransactionData = useTransactionsThreadingStore((s) => s.refreshTransactionData);
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

            const tx = await createTransaction({
                ...sanitized,
                status: TransactionStatus.Active,
                agreedFees: 0,
            });

            const guide = consumePendingProcedureGuide();

            setTitle('');
            setClientName('');
            setTargetDepartment('');
            onOpenChange(false);
            onCreated?.(tx);

            if (guide && (guide.steps.length > 0 || guide.documents.length > 0)) {
                try {
                    await applyProcedureGuideToTransaction(tx.id, guide, {
                        addTask,
                        addDocument,
                        refreshTransactionData,
                    });
                    SmartToast.success('تمت إضافة المعاملة وتطبيق الدليل الإجرائي');
                } catch {
                    SmartToast.warning('أُنشئت المعاملة لكن تعذر تطبيق بعض خطوات الدليل');
                }
            } else {
                SmartToast.success('تمت إضافة المعاملة');
            }
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

    const titleInputId = 'transactions-add-title';
    const clientInputId = 'transactions-add-client';
    const departmentInputId = 'transactions-add-department';

    return (
        <TransactionsHubSheet
            open={open}
            onOpenChange={onOpenChange}
            keepMounted={keepMounted}
            testId="transactions-add-sheet"
            ariaLabel="إضافة معاملة"
        >
            <form onSubmit={onFormSubmit} aria-busy={isSubmitting}>
                <TxGlassDrawerFrame
                    title="إضافة معاملة"
                    footer={
                        <button
                            type="submit"
                            disabled={!canSubmit || isSubmitting}
                            className={GLASS_BTN}
                            data-testid="transactions-add-submit"
                        >
                            {isSubmitting ? 'جاري الحفظ...' : 'إضافة معاملة'}
                        </button>
                    }
                >
                    <div>
                        <TxFieldLabel htmlFor={titleInputId}>عنوان المعاملة</TxFieldLabel>
                        <input
                            id={titleInputId}
                            name="title"
                            value={title}
                            onChange={(e) => setTitle(clampTransactionText(e.target.value, TX_TITLE_MAX))}
                            className={GLASS_FIELD}
                            disabled={isSubmitting}
                            autoComplete="off"
                            enterKeyHint="next"
                        />
                    </div>
                    <div>
                        <TxFieldLabel htmlFor={clientInputId}>اسم الموكل</TxFieldLabel>
                        <input
                            id={clientInputId}
                            name="clientName"
                            value={clientName}
                            onChange={(e) => setClientName(clampTransactionText(e.target.value, TX_CLIENT_NAME_MAX))}
                            className={GLASS_FIELD}
                            disabled={isSubmitting}
                            autoComplete="name"
                            enterKeyHint="next"
                        />
                    </div>
                    <div>
                        <TxFieldLabel htmlFor={departmentInputId}>الجهة المختصة</TxFieldLabel>
                        <input
                            id={departmentInputId}
                            name="targetDepartment"
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
                            className={GLASS_FIELD}
                            disabled={isSubmitting}
                            autoComplete="off"
                            enterKeyHint="done"
                        />
                    </div>
                </TxGlassDrawerFrame>
            </form>
        </TransactionsHubSheet>
    );
});
