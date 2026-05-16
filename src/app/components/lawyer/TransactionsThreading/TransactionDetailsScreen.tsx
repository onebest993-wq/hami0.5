import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, MoreVertical, Plus, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/app/components/ui/drawer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { TransactionStatus, listTaskTemplates, saveTaskTemplate, deleteTaskTemplate, useTransactionsThreadingStore } from '@/app/modules/transactionsThreading';
import type { Transaction, TransactionTask } from '@/app/modules/transactionsThreading';
import { TaskThreadView } from './TaskThreadView';
import { AddTaskBottomSheet } from './AddTaskBottomSheet';
import { DocumentsTabView } from './DocumentsTabView';
import { FinancesTabView } from './FinancesTabView';
import { generateClientReport } from './generateClientReport';

const EMPTY_TASKS: TransactionTask[] = [];

function txStatusLabelAr(status: TransactionStatus) {
  if (status === TransactionStatus.Active) return 'نشطة';
  if (status === TransactionStatus.Paused) return 'في الانتظار';
  return 'مكتملة';
}

function txStatusBadgeClass(status: TransactionStatus) {
  if (status === TransactionStatus.Active) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20';
  if (status === TransactionStatus.Paused) return 'bg-amber-500/15 text-amber-300 border-amber-500/20';
  return 'bg-slate-500/15 text-slate-300 border-slate-500/20';
}

export function TransactionDetailsScreen({
  transactionId,
  onBack,
}: {
  transactionId: string;
  onBack?: () => void;
}) {
  const tx = useTransactionsThreadingStore((s) => s.transactions.find((t) => t.id === transactionId));
  const refreshTransactionData = useTransactionsThreadingStore((s) => s.refreshTransactionData);
  const tasks = useTransactionsThreadingStore((s) => s.tasksByTransactionId[transactionId] ?? EMPTY_TASKS);
  const setTransactionStatus = useTransactionsThreadingStore((s) => s.setTransactionStatus);
  const addTask = useTransactionsThreadingStore((s) => s.addTask);
  const userId = useTransactionsThreadingStore((s) => s.userId);

  const [tab, setTab] = useState<'path' | 'docs' | 'fin'>('path');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [parent, setParent] = useState<TransactionTask | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templatesVersion, setTemplatesVersion] = useState(0);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const parentHint = useMemo(() => {
    if (!parent) return null;
    return { id: parent.id, title: parent.title };
  }, [parent]);

  useEffect(() => {
    refreshTransactionData(transactionId);
  }, [refreshTransactionData, transactionId]);

  if (!tx) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#001830] text-right flex items-center justify-center px-6">
        <div className="text-gray-300 text-sm">تعذر العثور على المعاملة</div>
      </div>
    );
  }

  const isReadOnly = tx.status === TransactionStatus.Completed;
  const templates = useMemo(() => (userId ? listTaskTemplates(userId) : []), [templatesVersion, templatesOpen, userId]);

  const requestAddTask = (p: TransactionTask | null) => {
    if (isReadOnly) return;
    setParent(p);
    setSheetOpen(true);
  };

  const reportText = useMemo(() => generateClientReport(tx as Transaction, tasks), [tx, tasks]);

  const copyReport = async () => {
    try {
      if (typeof window !== 'undefined' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(reportText);
      } else if (typeof document !== 'undefined') {
        const el = document.createElement('textarea');
        el.value = reportText;
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const completeTransaction = async () => {
    await setTransactionStatus(transactionId, TransactionStatus.Completed);
    setCompleteOpen(false);
  };

  const reopenTransaction = async () => {
    await setTransactionStatus(transactionId, TransactionStatus.Active);
  };

  const canSaveTemplate = !isReadOnly && tasks.length > 0 && !!userId;

  const doSaveTemplate = () => {
    if (!canSaveTemplate) return;
    const name = templateName.trim() || tx.title;
    if (!userId) return;
    saveTaskTemplate(userId, {
      name,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        parentTaskId: t.parentTaskId,
        deadline: t.deadline,
      })),
    });
    setSaveTemplateOpen(false);
    setTemplateName('');
    setTemplatesVersion((v) => v + 1);
  };

  const importTemplate = async (templateId: string) => {
    if (isReadOnly) return;
    if (tasks.length > 0) return;
    if (!userId) return;
    const template = listTaskTemplates(userId).find((t) => t.id === templateId);
    if (!template) return;

    const mapOldToNew = new Map<string, string>();
    const remaining = template.tasks.slice();
    let guard = 0;
    while (remaining.length && guard < 200) {
      guard += 1;
      let progressed = false;
      for (let i = 0; i < remaining.length; i += 1) {
        const t = remaining[i];
        const canCreate = !t.parentTaskId || mapOldToNew.has(t.parentTaskId);
        if (!canCreate) continue;
        const parentTaskId = t.parentTaskId ? mapOldToNew.get(t.parentTaskId)! : null;
        const created = await addTask({ transactionId, title: t.title, parentTaskId, deadline: t.deadline ?? null });
        mapOldToNew.set(t.id, created.id);
        remaining.splice(i, 1);
        i -= 1;
        progressed = true;
      }
      if (!progressed) {
        for (const t of remaining) {
          const created = await addTask({ transactionId, title: t.title, parentTaskId: null, deadline: t.deadline ?? null });
          mapOldToNew.set(t.id, created.id);
        }
        remaining.length = 0;
      }
    }

    await refreshTransactionData(transactionId);
    setTemplatesOpen(false);
  };

  return (
    <div dir="rtl" className="h-full min-h-screen bg-[#001830] text-right">
      <div className="sticky top-0 z-40 bg-[#001830]/95 backdrop-blur-xl border-b border-[#D4AF37]/20">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-gray-200 flex items-center justify-center hover:bg-white/10"
              aria-label="رجوع"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="text-white font-bold text-base truncate">{tx.title}</div>
              <div className="text-gray-400 text-sm mt-1 truncate">{tx.clientName}</div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {isReadOnly ? (
                <button
                  type="button"
                  onClick={reopenTransaction}
                  className="h-10 px-4 rounded-2xl bg-white/5 border border-white/10 text-gray-200 font-extrabold text-xs hover:bg-white/10"
                >
                  إعادة فتح
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCompleteOpen(true)}
                  className="h-10 px-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#0D0D1A] shadow-lg shadow-[#D4AF37]/25 font-extrabold text-xs"
                >
                  إنهاء المعاملة
                </button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-gray-200 flex items-center justify-center hover:bg-white/10"
                    aria-label="قائمة المعاملة"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="z-[1200] bg-[#071022] border border-[#D4AF37]/20 text-gray-200 rounded-xl p-1">
                  <DropdownMenuItem
                    disabled={!canSaveTemplate}
                    onSelect={() => {
                      setTemplateName(tx.title);
                      setSaveTemplateOpen(true);
                    }}
                    className="cursor-default"
                  >
                    حفظ المسار كقالب
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-gray-200 flex items-center justify-center hover:bg-white/10"
                aria-label="مشاركة تحديث الموكل"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <div className={`px-3 py-1 rounded-full border text-xs font-bold ${txStatusBadgeClass(tx.status)}`}>
                {txStatusLabelAr(tx.status)}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
              <TabsList className="w-full bg-white/5 border border-white/10 rounded-2xl p-1">
                <TabsTrigger value="path" className="rounded-xl data-[state=active]:bg-[#0D0D1A]">
                  المسار
                </TabsTrigger>
                <TabsTrigger value="docs" className="rounded-xl data-[state=active]:bg-[#0D0D1A]">
                  المستمسكات
                </TabsTrigger>
                <TabsTrigger value="fin" className="rounded-xl data-[state=active]:bg-[#0D0D1A]">
                  المصاريف
                </TabsTrigger>
              </TabsList>

              {isReadOnly && (
                <div className="mt-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 shadow-[0_14px_40px_rgba(0,0,0,0.25)]">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-200 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-emerald-200 font-extrabold text-sm">تمت أرشفة المعاملة</div>
                      <div className="text-gray-300 text-xs mt-1">وضع للقراءة فقط — تم قفل جميع إجراءات التعديل</div>
                    </div>
                  </div>
                </div>
              )}

              <TabsContent value="path" className="mt-2">
                <TaskThreadView
                  transactionId={transactionId}
                  onRequestAddTask={requestAddTask}
                  onImportFromMyTemplates={() => setTemplatesOpen(true)}
                  readOnly={isReadOnly}
                />
              </TabsContent>
              <TabsContent value="docs" className="mt-2">
                <DocumentsTabView transaction={tx as Transaction} readOnly={isReadOnly} />
              </TabsContent>
              <TabsContent value="fin" className="mt-2">
                <FinancesTabView transaction={tx as Transaction} readOnly={isReadOnly} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {tab === 'path' && !isReadOnly && (
        <button
          type="button"
          onClick={() => requestAddTask(null)}
          className="fixed bottom-6 left-6 h-14 px-5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#0D0D1A] shadow-2xl shadow-[#D4AF37]/30 flex items-center justify-center gap-2 font-bold"
        >
          <Plus className="w-5 h-5" />
          إضافة مهمة
        </button>
      )}

      <AddTaskBottomSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setParent(null);
        }}
        transactionId={transactionId}
        parentTask={parentHint}
        readOnly={isReadOnly}
      />

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="bg-[#071022] border border-[#D4AF37]/20 rounded-3xl p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-white text-base">إنهاء المعاملة</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">سيتم تحويل المعاملة إلى وضع القراءة فقط</DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right">
            <div className="rounded-2xl bg-black/20 border border-white/10 p-4 text-gray-100 text-sm leading-7">
              بعد الأرشفة لن تتمكن من إضافة مهام/مستمسكات/حركات مالية أو تعديل الحالات.
            </div>
          </div>
          <DialogFooter className="sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => setCompleteOpen(false)}
              className="h-11 px-5 rounded-2xl bg-white/5 border border-white/10 text-gray-200 font-bold"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={completeTransaction}
              className="h-11 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#0D0D1A] font-bold shadow-lg shadow-[#D4AF37]/25"
            >
              تأكيد الإنهاء
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="bg-[#071022] border border-[#D4AF37]/20 rounded-3xl p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-white text-base">حفظ المسار كقالب</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">سيظهر القالب ضمن “قوالبي” للاستيراد لاحقاً</DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right">
            <div className="text-gray-300 text-sm mb-2">اسم القالب</div>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full h-12 rounded-2xl bg-[#0D0D1A] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37]/50"
              placeholder="مثال: مسار قسام شرعي"
            />
          </div>
          <DialogFooter className="sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => setSaveTemplateOpen(false)}
              className="h-11 px-5 rounded-2xl bg-white/5 border border-white/10 text-gray-200 font-bold"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={doSaveTemplate}
              className="h-11 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#0D0D1A] font-bold shadow-lg shadow-[#D4AF37]/25"
            >
              حفظ
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DrawerContent className="bg-[#071022] border-t border-[#D4AF37]/20 rounded-t-3xl px-5 pb-6 pt-2">
          <div dir="rtl" className="text-right">
            <div className="py-3">
              <DrawerTitle className="text-white font-bold text-base">استيراد من قوالبي</DrawerTitle>
              <DrawerDescription className="text-gray-400 text-sm mt-1">اختر قالباً محفوظاً لاستيراده إلى هذه المعاملة</DrawerDescription>
            </div>

            <div className="space-y-2 mt-2">
              {templates.length === 0 ? (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-gray-300 text-sm">
                  لا توجد قوالب محفوظة بعد.
                </div>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white font-extrabold text-sm truncate">{t.name}</div>
                      <div className="text-gray-400 text-xs mt-1">{t.tasks.length} خطوة</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isReadOnly || tasks.length > 0}
                        onClick={() => importTemplate(t.id)}
                        className="h-9 px-4 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/25 text-[#F4C430] text-xs font-extrabold disabled:opacity-50"
                      >
                        استيراد
                      </button>
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          if (!userId) return;
                          deleteTaskTemplate(userId, t.id);
                          setTemplatesVersion((v) => v + 1);
                        }}
                        className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 text-xs font-bold disabled:opacity-50"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="bg-[#071022] border border-[#D4AF37]/20 rounded-3xl p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-white text-base">تحديث الموكل</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">نص جاهز للإرسال عبر واتساب</DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right">
            <div className="rounded-2xl bg-black/20 border border-white/10 p-4 text-gray-100 text-sm whitespace-pre-wrap leading-7">
              {reportText}
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <button
              type="button"
              onClick={copyReport}
              className="h-11 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#0D0D1A] font-bold shadow-lg shadow-[#D4AF37]/25"
            >
              {copied ? 'تم النسخ' : 'نسخ النص'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
