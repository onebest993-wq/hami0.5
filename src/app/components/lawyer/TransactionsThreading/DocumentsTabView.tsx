import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/app/components/ui/drawer';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading';
import type { Transaction, TransactionDocument, TransactionDocumentOwnerTag } from '@/app/modules/transactionsThreading';
import { DocumentCard } from './DocumentCard';

const OWNER_TAGS = ['للموكل', 'للدائرة', 'أخرى'] as const;
const EMPTY_DOCS: TransactionDocument[] = [];

export function DocumentsTabView({ transaction, readOnly }: { transaction: Transaction; readOnly?: boolean }) {
  const refreshTransactionData = useTransactionsThreadingStore((s) => s.refreshTransactionData);
  const documents = useTransactionsThreadingStore((s) => s.documentsByTransactionId[transaction.id] ?? EMPTY_DOCS);
  const addDocument = useTransactionsThreadingStore((s) => s.addDocument);
  const deleteDocument = useTransactionsThreadingStore((s) => s.deleteDocument);

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
        <div className="text-white font-bold text-base">المستمسكات</div>
        <button
          type="button"
          disabled={!!readOnly}
          onClick={() => setOpen(true)}
          className="h-10 px-4 rounded-2xl bg-white/5 border border-white/10 text-gray-200 text-sm font-bold hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5 disabled:cursor-not-allowed"
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            إضافة مرفق
          </span>
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="pt-14 text-center">
          <div className="text-gray-400 text-sm">لا توجد مرفقات بعد.</div>
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
        <DialogContent className="bg-[#071022] border border-rose-500/20 rounded-3xl p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-white text-base">حذف مستمسك</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">سيتم حذف المستمسك من هذه المعاملة</DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right">
            <div className="rounded-2xl bg-black/20 border border-white/10 p-4 text-gray-100 text-sm leading-7">
              هل أنت متأكد من حذف المستمسك؟
              <div className="mt-2 text-gray-300 font-bold truncate">{deleteTarget?.title}</div>
            </div>
          </div>
          <DialogFooter className="sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="h-11 px-5 rounded-2xl bg-white/5 border border-white/10 text-gray-200 font-bold"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="h-11 px-5 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-200 font-extrabold"
            >
              حذف
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-[#071022] border-t border-[#D4AF37]/20 rounded-t-3xl px-5 pb-6 pt-2">
          <div dir="rtl" className="text-right">
            <div className="py-3">
              <DrawerTitle className="text-white font-bold text-base">إضافة مرفق</DrawerTitle>
              <DrawerDescription className="text-gray-400 text-sm mt-1">
                أدخل وصف المستمسك وحدد عائدية المستمسك
              </DrawerDescription>
            </div>

            <div className="space-y-3 mt-3">
              <div className="space-y-2">
                <div className="text-gray-300 text-sm">
                  اسم/وصف المستمسك <span className="text-rose-300">*</span>
                </div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: هوية الكفيل / كتاب صحة صدور"
                  className="h-12 bg-[#0D0D1A] border-[#D4AF37]/20 text-white placeholder:text-gray-500 rounded-2xl focus-visible:ring-0 focus-visible:border-[#D4AF37]/50"
                />
              </div>

              <div className="space-y-2">
                <div className="text-gray-300 text-sm">عائدية المستمسك</div>
                <div className="flex gap-2">
                  {OWNER_TAGS.map((t) => {
                    const active = ownerTag === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setOwnerTag(t)}
                        className={`flex-1 h-11 rounded-2xl border text-sm font-bold transition ${
                          active
                            ? 'bg-[#D4AF37]/15 text-[#F4C430] border-[#D4AF37]/25'
                            : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!canSubmit || !!readOnly}
              onClick={submit}
              className="mt-5 w-full h-12 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#0D0D1A] shadow-lg shadow-[#D4AF37]/25 disabled:opacity-50 disabled:shadow-none"
            >
              إضافة
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
