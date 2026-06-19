import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MoreVertical, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Drawer, DrawerContent } from '@/app/components/ui/drawer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { listTaskTemplates, saveTaskTemplate, deleteTaskTemplate } from '@/app/modules/transactionsThreading/taskTemplates';
import { TransactionStatus } from '@/app/modules/transactionsThreading/types';
import type { Transaction, TransactionTask } from '@/app/modules/transactionsThreading/types';
import { TaskThreadView } from './TaskThreadView';
import { AddTaskBottomSheet } from './AddTaskBottomSheet';
import { DocumentsTabView } from './DocumentsTabView';
import { FinancesTabView } from './FinancesTabView';
import { generateClientReport } from './generateClientReport';
import {
    GLASS_BTN,
    GLASS_FIELD,
    TX_ACCENT_SURFACE,
    TX_DIALOG_BTN_CANCEL,
    TX_DIALOG_DESC,
    TX_DIALOG_SHELL,
    TX_DIALOG_TITLE,
    TX_DRAWER_SHELL,
    TX_DROPDOWN_CONTENT,
    TX_DROPDOWN_FOCUS,
    TX_GOLD_BTN,
    TX_ICON_BTN,
    TX_INNER_SURFACE,
    TX_OCHRE_BTN,
    TX_STATUS_ACTIVE,
    TX_STATUS_COMPLETED,
    TX_STATUS_PAUSED,
    TX_TAB_TRIGGER,
    TX_TEXT_MUTED,
    TX_TEXT_OCHRE,
    TX_TEXT_PRIMARY,
    TX_TEXT_SECONDARY,
    TxGlassDrawerFrame,
    TxGlassFab,
    TxGlassHeader,
    TxGlassPage,
    TxGlassPanel,
    TxGlassTabsList,
    TxHeaderRow,
} from './transactionsGlassTheme';

const EMPTY_TASKS: TransactionTask[] = [];

function txStatusLabelAr(status: TransactionStatus) {
  if (status === TransactionStatus.Active) return 'نشطة';
  if (status === TransactionStatus.Paused) return 'في الانتظار';
  return 'مكتملة';
}

function txStatusBadgeClass(status: TransactionStatus) {
  if (status === TransactionStatus.Active) return TX_STATUS_ACTIVE;
  if (status === TransactionStatus.Paused) return TX_STATUS_PAUSED;
  return TX_STATUS_COMPLETED;
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
      <TxGlassPage>
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <TxGlassPanel className="px-6 py-8 text-center">
            <p className={`${TX_TEXT_MUTED} text-sm font-medium`}>تعذر العثور على المعاملة</p>
          </TxGlassPanel>
        </div>
      </TxGlassPage>
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
    <TxGlassPage>
      <TxGlassHeader>
        <TxHeaderRow
          title={tx.title}
          subtitle={tx.clientName}
          onBack={onBack}
          trailing={
            <div className={`px-2.5 py-0.5 rounded-[3px] border text-[10px] font-bold shrink-0 ${txStatusBadgeClass(tx.status)}`}>
              {txStatusLabelAr(tx.status)}
            </div>
          }
        />

        <div className="mt-3 flex items-center gap-2 flex-wrap justify-end">
          {isReadOnly ? (
            <button type="button" onClick={reopenTransaction} className={TX_GOLD_BTN}>
              إعادة فتح
            </button>
          ) : (
            <button type="button" onClick={() => setCompleteOpen(true)} className={TX_OCHRE_BTN}>
              إنهاء المعاملة
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={TX_ICON_BTN} aria-label="قائمة المعاملة">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className={TX_DROPDOWN_CONTENT}>
              <DropdownMenuItem
                disabled={!canSaveTemplate}
                onSelect={() => {
                  setTemplateName(tx.title);
                  setSaveTemplateOpen(true);
                }}
                className={TX_DROPDOWN_FOCUS}
              >
                حفظ المسار كقالب
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button type="button" onClick={() => setReportOpen(true)} className={TX_ICON_BTN} aria-label="مشاركة تحديث الموكل">
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'path' | 'docs' | 'fin')} className="w-full">
            <TxGlassTabsList>
              <TabsList className="w-full h-auto p-0 bg-transparent border-0 flex gap-1">
                <TabsTrigger value="path" className={TX_TAB_TRIGGER}>
                  المسار
                </TabsTrigger>
                <TabsTrigger value="docs" className={TX_TAB_TRIGGER}>
                  المستمسكات
                </TabsTrigger>
                <TabsTrigger value="fin" className={TX_TAB_TRIGGER}>
                  المصاريف
                </TabsTrigger>
              </TabsList>
            </TxGlassTabsList>

            {isReadOnly && (
              <TxGlassPanel className="mt-3 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-[3px] ${TX_ACCENT_SURFACE} flex items-center justify-center ${TX_TEXT_OCHRE} shrink-0`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className={`${TX_TEXT_OCHRE} font-extrabold text-sm`}>تمت أرشفة المعاملة</div>
                    <div className={`${TX_TEXT_MUTED} text-xs mt-1 font-medium`}>وضع للقراءة فقط — تم قفل جميع إجراءات التعديل</div>
                  </div>
                </div>
              </TxGlassPanel>
            )}

            <div className="mt-3 max-w-[520px] mx-auto px-0">
              <TabsContent value="path" className="mt-0">
                <TaskThreadView
                  transactionId={transactionId}
                  onRequestAddTask={requestAddTask}
                  onImportFromMyTemplates={() => setTemplatesOpen(true)}
                  readOnly={isReadOnly}
                />
              </TabsContent>
              <TabsContent value="docs" className="mt-0">
                <DocumentsTabView transaction={tx as Transaction} readOnly={isReadOnly} />
              </TabsContent>
              <TabsContent value="fin" className="mt-0">
                <FinancesTabView transaction={tx as Transaction} readOnly={isReadOnly} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </TxGlassHeader>

      {tab === 'path' && !isReadOnly && (
        <TxGlassFab label="إضافة مهمة" extended onClick={() => requestAddTask(null)} />
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
        <DialogContent className={TX_DIALOG_SHELL}>
          <DialogHeader className="text-right">
            <DialogTitle className={TX_DIALOG_TITLE}>إنهاء المعاملة</DialogTitle>
            <DialogDescription className={TX_DIALOG_DESC}>سيتم تحويل المعاملة إلى وضع القراءة فقط</DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right">
            <div className={`${TX_INNER_SURFACE} p-4 ${TX_TEXT_SECONDARY} text-sm leading-7 font-medium`}>
              بعد الأرشفة لن تتمكن من إضافة مهام/مستمسكات/حركات مالية أو تعديل الحالات.
            </div>
          </div>
          <DialogFooter className="sm:justify-start gap-2">
            <button type="button" onClick={() => setCompleteOpen(false)} className={TX_DIALOG_BTN_CANCEL}>
              إلغاء
            </button>
            <button type="button" onClick={completeTransaction} className={GLASS_BTN + ' !w-auto px-5 h-11'}>
              تأكيد الإنهاء
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className={TX_DIALOG_SHELL}>
          <DialogHeader className="text-right">
            <DialogTitle className={TX_DIALOG_TITLE}>حفظ المسار كقالب</DialogTitle>
            <DialogDescription className={TX_DIALOG_DESC}>سيظهر القالب ضمن “قوالبي” للاستيراد لاحقاً</DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right">
            <label className={`${TX_TEXT_MUTED} text-[11px] font-bold mb-1.5 block`}>اسم القالب</label>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className={GLASS_FIELD}
              placeholder="مثال: مسار قسام شرعي"
            />
          </div>
          <DialogFooter className="sm:justify-start gap-2">
            <button type="button" onClick={() => setSaveTemplateOpen(false)} className={TX_DIALOG_BTN_CANCEL}>
              إلغاء
            </button>
            <button type="button" onClick={doSaveTemplate} className={GLASS_BTN + ' !w-auto px-5 h-11'}>
              حفظ
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DrawerContent className={TX_DRAWER_SHELL}>
          <TxGlassDrawerFrame title="استيراد من قوالبي" subtitle="اختر قالباً محفوظاً لاستيراده إلى هذه المعاملة">
            <div className="space-y-2">
              {templates.length === 0 ? (
                <TxGlassPanel className={`p-4 ${TX_TEXT_MUTED} text-sm font-medium`}>لا توجد قوالب محفوظة بعد.</TxGlassPanel>
              ) : (
                templates.map((t) => (
                  <TxGlassPanel key={t.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`${TX_TEXT_PRIMARY} font-extrabold text-sm truncate`}>{t.name}</div>
                      <div className={`${TX_TEXT_MUTED} text-xs mt-1 font-medium`}>{t.tasks.length} خطوة</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isReadOnly || tasks.length > 0}
                        onClick={() => importTemplate(t.id)}
                        className={TX_GOLD_BTN + ' disabled:opacity-50'}
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
                        className={TX_DIALOG_BTN_CANCEL + ' !h-9 !px-3 text-xs disabled:opacity-50'}
                      >
                        حذف
                      </button>
                    </div>
                  </TxGlassPanel>
                ))
              )}
            </div>
          </TxGlassDrawerFrame>
        </DrawerContent>
      </Drawer>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className={TX_DIALOG_SHELL}>
          <DialogHeader className="text-right">
            <DialogTitle className={TX_DIALOG_TITLE}>تحديث الموكل</DialogTitle>
            <DialogDescription className={TX_DIALOG_DESC}>نص جاهز للإرسال عبر واتساب</DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right">
            <div className={`${TX_INNER_SURFACE} p-4 ${TX_TEXT_SECONDARY} text-sm whitespace-pre-wrap leading-7 max-h-[50vh] overflow-y-auto font-medium`}>
              {reportText}
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <button type="button" onClick={copyReport} className={GLASS_BTN + ' !w-auto px-5 h-11'}>
              {copied ? 'تم النسخ' : 'نسخ النص'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TxGlassPage>
  );
}
