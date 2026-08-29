import { useState } from 'react';
import type { TransactionDocumentOwnerTag } from '@/app/modules/transactionsThreading/types';
import { clampTransactionText, TX_DOC_TITLE_MAX } from '@/app/services/transactions/transactionsInputSecurity';
import { TransactionsHubSheet } from './TransactionsHubSheet';
import {
    GLASS_BTN,
    GLASS_CHIP,
    GLASS_CHIP_ACTIVE,
    GLASS_FIELD,
    TX_TEXT_OCHRE,
    TxFieldLabel,
    TxGlassDrawerFrame,
} from './transactionsGlassTheme';

const OWNER_TAGS = ['للموكل', 'للدائرة', 'أخرى'] as const;

export function DocumentsAddSheet({
    open,
    onOpenChange,
    readOnly,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    readOnly?: boolean;
    onSubmit: (input: { title: string; ownerTag: TransactionDocumentOwnerTag }) => Promise<boolean>;
}) {
    const [title, setTitle] = useState('');
    const [ownerTag, setOwnerTag] = useState<TransactionDocumentOwnerTag>('للموكل');
    const canSubmit = title.trim().length > 0;

    const submit = async () => {
        if (!canSubmit || readOnly) return;
        const ok = await onSubmit({ title: title.trim(), ownerTag });
        if (!ok) return;
        setTitle('');
        setOwnerTag('للموكل');
        onOpenChange(false);
    };

    return (
        <TransactionsHubSheet
            open={open}
            onOpenChange={onOpenChange}
            testId="transactions-add-document-sheet"
            ariaLabel="إضافة مرفق"
        >
            <TxGlassDrawerFrame
                title="إضافة مرفق"
                subtitle="وصف المستمسك وعائديته"
                footer={
                    <button
                        type="button"
                        disabled={!canSubmit || !!readOnly}
                        onClick={() => void submit()}
                        className={GLASS_BTN}
                    >
                        إضافة
                    </button>
                }
            >
                <div>
                    <TxFieldLabel htmlFor="transactions-doc-title">
                        اسم/وصف المستمسك <span className={TX_TEXT_OCHRE}>*</span>
                    </TxFieldLabel>
                    <input
                        id="transactions-doc-title"
                        value={title}
                        onChange={(e) => setTitle(clampTransactionText(e.target.value, TX_DOC_TITLE_MAX))}
                        placeholder="مثال: هوية الكفيل / كتاب صحة صدور"
                        className={GLASS_FIELD}
                        autoComplete="off"
                        enterKeyHint="done"
                        autoCapitalize="sentences"
                    />
                </div>
                <div>
                    <TxFieldLabel>عائدية المستمسك</TxFieldLabel>
                    <div className="flex gap-2" role="group" aria-label="عائدية المستمسك">
                        {OWNER_TAGS.map((t) => {
                            const active = ownerTag === t;
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setOwnerTag(t)}
                                    className={
                                        active
                                            ? GLASS_CHIP_ACTIVE + ' flex-1 !rounded-xl'
                                            : GLASS_CHIP + ' flex-1 !rounded-xl'
                                    }
                                >
                                    {t}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </TxGlassDrawerFrame>
        </TransactionsHubSheet>
    );
}
