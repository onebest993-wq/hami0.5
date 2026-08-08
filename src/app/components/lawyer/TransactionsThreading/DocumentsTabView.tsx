import { useEffect, useMemo, useState } from 'react';
import { Plus } from '@/app/components/ui/lucideIcons';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import type { Transaction, TransactionDocument, TransactionDocumentOwnerTag } from '@/app/modules/transactionsThreading/types';
import { DocumentCard } from './DocumentCard';
import { TransactionsHubSheet } from './TransactionsHubSheet';
import { TransactionsThreadDialogContent } from './TransactionsThreadDialogContent';
import {
    GLASS_BTN,
    GLASS_CHIP,
    GLASS_CHIP_ACTIVE,
    GLASS_FIELD,
    TX_DIALOG_BTN_CANCEL,
    TX_DIALOG_BTN_DANGER,
    TX_DIALOG_DESC,
    TX_DIALOG_SHELL,
    TX_DIALOG_TITLE,
    TX_GOLD_BTN,
    TX_INNER_SURFACE,
    TX_TEXT_MUTED,
    TX_TEXT_OCHRE,
    TX_TEXT_PRIMARY,
    TX_TEXT_SECONDARY,
    TxFieldLabel,
    TxGlassDrawerFrame,
} from './transactionsGlassTheme';

const OWNER_TAGS = ['للموكل', 'للدائرة', 'أخرى'] as const;
const EMPTY_DOCS: TransactionDocument[] = [];

export function DocumentsTabView({ transaction, readOnly }: { transaction: Transaction; readOnly?: boolean }) {
  const refreshTransactionData = useTransactionsThreadingStore((s) => s.refreshTransactionData);
  const documents = useTransactionsThreadingStore((s) => s.documentsByTransactionId[transaction.id] ?? EMPTY_DOCS);
  const addDocument = useTransactionsThreadingStore((s) => s.addDocument);
  const deleteDocument = useTransactionsThreadingStore((s) => s.deleteDocument);
  const reduceMotion = useReduceMotion();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [ownerTag, setOwnerTag] = useState<TransactionDocumentOwnerTag>('للموكل');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TransactionDocument | null>(null);

  useEffect(() => {
    refreshTransactionData(transaction.id);
  }, [refreshTransactionData, transaction.id]);

  const canSubmit = title.trim().length > 0;

  const submit = async () => {
    if (!canSubmit || readOnly) return;
    await addDocument({ transactionId: transaction.id, title: title.trim(), ownerTag });
    setTitle('');
    setOwnerTag('للموكل');
    setOpen(false);
  };

  const sorted = useMemo(() => documents.slice().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)), [documents]);

  const requestDelete = (doc: TransactionDocument) => {
    if (readOnly) return;
    setDeleteTarget(doc);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteDocument(deleteTarget.id);
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  return (
    <div dir="rtl" className="px-5 py-5 pb-10 max-w-[640px] mx-auto">
      <div className="flex items-center justify-between">
        <div className={`${TX_TEXT_PRIMARY} font-extrabold text-base`}>المستمسكات</div>
        <button
          type="button"
          disabled={!!readOnly}
          onClick={() => setOpen(true)}
          className={`${TX_GOLD_BTN} !px-4 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            إضافة مرفق
          </span>
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="pt-14 text-center">
          <div className={`${TX_TEXT_MUTED} text-sm font-medium`}>لا توجد مرفقات بعد.</div>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {sorted.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onDelete={requestDelete} readOnly={readOnly} />
          ))}
        </div>
      )}

      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setDeleteTarget(null);
        }}
      >
        <TransactionsThreadDialogContent instant={reduceMotion} hideCloseButton className={TX_DIALOG_SHELL}>
          <DialogHeader className="text-right">
            <DialogTitle className={TX_DIALOG_TITLE}>حذف مستمسك</DialogTitle>
            <DialogDescription className={TX_DIALOG_DESC}>سيتم حذف المستمسك من هذه المعاملة</DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right">
            <div className={`${TX_INNER_SURFACE} p-4 ${TX_TEXT_SECONDARY} text-sm leading-7`}>
              هل أنت متأكد من حذف المستمسك؟
              <div className={`mt-2 ${TX_TEXT_PRIMARY} font-extrabold truncate`}>{deleteTarget?.title}</div>
            </div>
          </div>
          <DialogFooter className="sm:justify-start gap-2">
            <button type="button" onClick={() => setDeleteOpen(false)} className={TX_DIALOG_BTN_CANCEL}>
              إلغاء
            </button>
            <button type="button" onClick={confirmDelete} className={TX_DIALOG_BTN_DANGER}>
              حذف
            </button>
          </DialogFooter>
        </TransactionsThreadDialogContent>
      </Dialog>

      <TransactionsHubSheet open={open} onOpenChange={setOpen} testId="transactions-add-document-sheet">
        <TxGlassDrawerFrame
          title="إضافة مرفق"
          subtitle="أدخل وصف المستمسك وحدد عائدية المستمسك"
          footer={
            <button type="button" disabled={!canSubmit || !!readOnly} onClick={() => void submit()} className={GLASS_BTN}>
              إضافة
            </button>
          }
        >
          <div>
            <TxFieldLabel>
              اسم/وصف المستمسك <span className={TX_TEXT_OCHRE}>*</span>
            </TxFieldLabel>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: هوية الكفيل / كتاب صحة صدور"
              className={GLASS_FIELD}
            />
          </div>
          <div>
            <TxFieldLabel>عائدية المستمسك</TxFieldLabel>
            <div className="flex gap-2">
              {OWNER_TAGS.map((t) => {
                const active = ownerTag === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setOwnerTag(t)}
                    className={active ? GLASS_CHIP_ACTIVE + ' flex-1 !rounded-[3px] !py-2.5' : GLASS_CHIP + ' flex-1 !rounded-[3px] !py-2.5'}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </TxGlassDrawerFrame>
      </TransactionsHubSheet>
    </div>
  );
}
