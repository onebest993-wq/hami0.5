import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, MoreVertical, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
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
    canImportTaskTemplate,
    importTaskTemplateToTransaction,
} from '@/app/services/transactions/importTaskTemplateToTransaction';
import { sanitizeTransactionTemplateName } from '@/app/services/transactions/transactionsInputSecurity';
import {
    TX_ACCENT_SURFACE,
    TX_DROPDOWN_CONTENT,
    TX_DROPDOWN_FOCUS,
    TX_GOLD_BTN,
    TX_ICON_BTN,
    TX_OCHRE_BTN,
    TX_TAB_TRIGGER,
    TX_TEXT_MUTED,
    TX_TEXT_OCHRE,
    TxGlassFab,
    TxGlassHeader,
    TxGlassPage,
    TxGlassPanel,
    TxGlassTabsList,
    TxHeaderRow,
} from './transactionsGlassTheme';
import type { TransactionsDetailsEscapeSnapshot } from './transactionsEscapeStack';
import { txStatusBadgeClass, txStatusLabelAr } from './transactionDetails/transactionDetailsUtils';
import { TransactionDetailsDialogs } from './transactionDetails/TransactionDetailsDialogs';

const EMPTY_TASKS: TransactionTask[] = [];

export function TransactionDetailsScreen({
  transactionId,
  onBack,
  onEscapeSnapshotChange,
  registerEscapeCloser,
}: {
  transactionId: string;
  onBack?: () => void;
  onEscapeSnapshotChange?: (snapshot: TransactionsDetailsEscapeSnapshot) => void;
  registerEscapeCloser?: (
    closer: ((patch: Partial<TransactionsDetailsEscapeSnapshot>) => void) | null,
  ) => void;
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
  const [taskEscape, setTaskEscape] = useState({
    taskCompleteOpen: false,
    taskEditOpen: false,
    taskDeleteOpen: false,
  });
  const closeTaskOverlayRef = useRef<(patch: Partial<TransactionsDetailsEscapeSnapshot>) => void>(
    () => undefined,
  );

  const closeOverlay = useCallback((patch: Partial<TransactionsDetailsEscapeSnapshot>) => {
    if (patch.reportOpen === false) setReportOpen(false);
    if (patch.completeOpen === false) setCompleteOpen(false);
    if (patch.saveTemplateOpen === false) setSaveTemplateOpen(false);
    if (patch.templatesOpen === false) setTemplatesOpen(false);
    if (patch.addTaskSheetOpen === false) {
      setSheetOpen(false);
      setParent(null);
    }
    const taskPatch: Partial<TransactionsDetailsEscapeSnapshot> = {};
    if (patch.taskCompleteOpen === false) taskPatch.taskCompleteOpen = false;
    if (patch.taskEditOpen === false) taskPatch.taskEditOpen = false;
    if (patch.taskDeleteOpen === false) taskPatch.taskDeleteOpen = false;
    if (Object.keys(taskPatch).length > 0) {
      closeTaskOverlayRef.current(taskPatch);
    }
  }, []);

  useEffect(() => {
    registerEscapeCloser?.(closeOverlay);
    return () => registerEscapeCloser?.(null);
  }, [closeOverlay, registerEscapeCloser]);

  useEffect(() => {
    onEscapeSnapshotChange?.({
      addTaskSheetOpen: sheetOpen,
      reportOpen,
      completeOpen,
      saveTemplateOpen,
      templatesOpen,
      ...taskEscape,
    });
  }, [
    sheetOpen,
    reportOpen,
    completeOpen,
    saveTemplateOpen,
    templatesOpen,
    taskEscape,
    onEscapeSnapshotChange,
  ]);

  const parentHint = useMemo(() => {
    if (!parent) return null;
    return { id: parent.id, title: parent.title };
  }, [parent]);

  useEffect(() => {
    refreshTransactionData(transactionId);
  }, [refreshTransactionData, transactionId]);

  const isReadOnly = tx?.status === TransactionStatus.Completed;
  const templates = useMemo(
    () => (tx && userId ? listTaskTemplates(userId) : []),
    [templatesVersion, templatesOpen, userId, tx?.id],
  );
  const reportText = useMemo(
    () => (tx ? generateClientReport(tx as Transaction, tasks) : ''),
    [tx, tasks],
  );

  if (!tx) {
    return (
      <div data-testid="transactions-details-screen">
        <TxGlassPage>
          <div className="flex items-center justify-center min-h-[60vh] px-6">
            <TxGlassPanel className="px-6 py-8 text-center">
              <p className={`${TX_TEXT_MUTED} text-sm font-medium`}>تعذر العثور على المعاملة</p>
            </TxGlassPanel>
          </div>
        </TxGlassPage>
      </div>
    );
  }

  const canSaveTemplate = !isReadOnly && tasks.length > 0 && !!userId;

  const requestAddTask = (p: TransactionTask | null) => {
    if (isReadOnly) return;
    setParent(p);
    setSheetOpen(true);
  };

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

  const doSaveTemplate = () => {
    if (!canSaveTemplate) return;
    const name = sanitizeTransactionTemplateName(templateName, tx.title);
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
    if (!canImportTaskTemplate({ isReadOnly, existingTaskCount: tasks.length })) return;
    if (!userId) return;
    const template = listTaskTemplates(userId).find((t) => t.id === templateId);
    if (!template) return;

    await importTaskTemplateToTransaction(transactionId, template, {
      addTask,
      refreshTransactionData,
    });
    setTemplatesOpen(false);
  };

  return (
    <div data-testid="transactions-details-screen">
    <TxGlassPage>
      <Tabs dir="rtl" value={tab} onValueChange={(v) => setTab(v as 'path' | 'docs' | 'fin')} className="w-full">
        <TxGlassHeader>
          <TxHeaderRow
            title={tx.title}
            subtitle={tx.clientName}
            onBack={onBack}
            backTestId="transactions-back"
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
            <TxGlassTabsList>
              <TabsList className="w-full h-auto p-0 bg-transparent border-0 grid grid-cols-3 gap-1">
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

            {isReadOnly ? (
              <TxGlassPanel className="mt-3 px-3.5 py-2.5">
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-[3px] ${TX_ACCENT_SURFACE} flex items-center justify-center ${TX_TEXT_OCHRE} shrink-0`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={`${TX_TEXT_OCHRE} font-bold text-xs`}>تمت أرشفة المعاملة</div>
                    <div className={`${TX_TEXT_MUTED} text-[10px] mt-0.5 font-medium`}>وضع للقراءة فقط</div>
                  </div>
                </div>
              </TxGlassPanel>
            ) : null}
          </div>
        </TxGlassHeader>

        <div className="max-w-[520px] mx-auto px-4 sm:px-5 pb-28 w-full">
          <TabsContent value="path" className="mt-0 focus-visible:outline-none w-full">
            <TaskThreadView
              transactionId={transactionId}
              onRequestAddTask={requestAddTask}
              onImportFromMyTemplates={() => setTemplatesOpen(true)}
              readOnly={isReadOnly}
              onTaskEscapeSnapshotChange={setTaskEscape}
              registerTaskEscapeCloser={(closer) => {
                closeTaskOverlayRef.current = closer ?? (() => undefined);
              }}
            />
          </TabsContent>
          <TabsContent value="docs" className="mt-0 focus-visible:outline-none">
            <DocumentsTabView transaction={tx as Transaction} readOnly={isReadOnly} />
          </TabsContent>
          <TabsContent value="fin" className="mt-0 focus-visible:outline-none">
            <FinancesTabView transaction={tx as Transaction} readOnly={isReadOnly} />
          </TabsContent>
        </div>
      </Tabs>

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

      <TransactionDetailsDialogs
        completeOpen={completeOpen}
        onCompleteOpenChange={setCompleteOpen}
        onCompleteTransaction={completeTransaction}
        saveTemplateOpen={saveTemplateOpen}
        onSaveTemplateOpenChange={setSaveTemplateOpen}
        templateName={templateName}
        onTemplateNameChange={setTemplateName}
        onSaveTemplate={doSaveTemplate}
        templatesOpen={templatesOpen}
        onTemplatesOpenChange={setTemplatesOpen}
        templates={templates}
        isReadOnly={isReadOnly}
        existingTaskCount={tasks.length}
        userId={userId}
        onImportTemplate={importTemplate}
        onDeleteTemplate={(templateId) => {
          if (!userId) return;
          deleteTaskTemplate(userId, templateId);
          setTemplatesVersion((v) => v + 1);
        }}
        reportOpen={reportOpen}
        onReportOpenChange={setReportOpen}
        reportText={reportText}
        copied={copied}
        onCopyReport={copyReport}
      />
    </TxGlassPage>
    </div>
  );
}
