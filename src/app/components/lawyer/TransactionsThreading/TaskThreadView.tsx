import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { buildTaskTree } from '@/app/modules/transactionsThreading/service';
import { TransactionTaskStatus, type TransactionTask, type TransactionTaskNode } from '@/app/modules/transactionsThreading/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { TaskNodeCard } from './TaskNodeCard';
import {
    GLASS_BTN,
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
    TxGlassPanel,
} from './transactionsGlassTheme';

const EMPTY_TASKS: TransactionTask[] = [];

function emptyPathDismissKey(transactionId: string) {
  return `hami:tx:path-empty-dismiss:${transactionId}`;
}

function PathEmptyHint({
  transactionId,
  onImportFromMyTemplates,
  readOnly,
}: {
  transactionId: string;
  onImportFromMyTemplates?: () => void;
  readOnly?: boolean;
}) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(emptyPathDismissKey(transactionId)) === '1';
  });

  if (dismissed) return null;

  return (
    <TxGlassPanel className="p-4 relative">
      {!readOnly ? (
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(emptyPathDismissKey(transactionId), '1');
            setDismissed(true);
          }}
          className="absolute top-2.5 left-2.5 w-8 h-8 rounded-[3px] border border-[#2A4550] bg-[#1A3340] text-[#8A8680] hover:text-[#D8D4CE] flex items-center justify-center transition-colors"
          aria-label="إخفاء التلميح"
        >
          <X className="w-4 h-4" />
        </button>
      ) : null}
      <div className={`${TX_TEXT_PRIMARY} font-extrabold text-sm pr-1`}>لا يوجد مسار بعد</div>
      <div className={`${TX_TEXT_MUTED} text-xs mt-1.5 leading-6 font-medium`}>
        أضف مهمة من الزر السفلي أو استورد قالباً جاهزاً.
      </div>
      {!readOnly && onImportFromMyTemplates ? (
        <button type="button" onClick={onImportFromMyTemplates} className={`${GLASS_BTN} mt-3 !h-10 !text-xs`}>
          استيراد من قوالبي
        </button>
      ) : null}
    </TxGlassPanel>
  );
}

const STATUS_CYCLE: TransactionTaskStatus[] = [
  TransactionTaskStatus.Pending,
  TransactionTaskStatus.InProgress,
  TransactionTaskStatus.Blocked,
  TransactionTaskStatus.Done,
];

function nextStatus(current: TransactionTaskStatus) {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

const CHILD_NEST_CLASS = 'mt-3 space-y-3 w-full border-r-2 border-[#2A4550]/50 pr-3';

function NodeRenderer({
  node,
  depth,
  index,
  siblingsCount,
  taskNumber,
  onToggleStatus,
  onMarkDone,
  onAddSubTask,
  onEdit,
  onDelete,
  readOnly,
}: {
  node: TransactionTaskNode;
  depth: number;
  index: number;
  siblingsCount: number;
  taskNumber: string;
  onToggleStatus: (task: TransactionTask) => void;
  onMarkDone: (task: TransactionTask) => void;
  onAddSubTask: (task: TransactionTask) => void;
  onEdit: (task: TransactionTask) => void;
  onDelete: (task: TransactionTask) => void;
  readOnly?: boolean;
}) {
  void index;
  void siblingsCount;

  return (
    <div className="w-full min-w-0">
      <TaskNodeCard
        task={node}
        taskNumber={taskNumber}
        depth={depth}
        onToggleStatus={onToggleStatus}
        onMarkDone={onMarkDone}
        onAddSubTask={onAddSubTask}
        onEdit={onEdit}
        onDelete={onDelete}
        readOnly={readOnly}
      />

      {node.children.length > 0 ? (
        <div className={CHILD_NEST_CLASS}>
          {node.children.map((child, i) => (
            <NodeRenderer
              key={child.id}
              node={child}
              depth={depth + 1}
              index={i}
              siblingsCount={node.children.length}
              taskNumber={`${taskNumber}.${i + 1}`}
              onToggleStatus={onToggleStatus}
              onMarkDone={onMarkDone}
              onAddSubTask={onAddSubTask}
              onEdit={onEdit}
              onDelete={onDelete}
              readOnly={readOnly}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TaskThreadView({
  transactionId,
  onRequestAddTask,
  onImportFromMyTemplates,
  readOnly,
}: {
  transactionId: string;
  onRequestAddTask: (parent: TransactionTask | null) => void;
  onImportFromMyTemplates?: () => void;
  readOnly?: boolean;
}) {
  const refreshTransactionData = useTransactionsThreadingStore((s) => s.refreshTransactionData);
  const updateTaskStatus = useTransactionsThreadingStore((s) => s.updateTaskStatus);
  const completeTask = useTransactionsThreadingStore((s) => s.completeTask);
  const updateTask = useTransactionsThreadingStore((s) => s.updateTask);
  const deleteTaskCascade = useTransactionsThreadingStore((s) => s.deleteTaskCascade);
  const tasks = useTransactionsThreadingStore((s) => s.tasksByTransactionId[transactionId] ?? EMPTY_TASKS);

  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<TransactionTask | null>(null);
  const [officialRef, setOfficialRef] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TransactionTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDeadlineDate, setEditDeadlineDate] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TransactionTask | null>(null);
  const [deleteCount, setDeleteCount] = useState(1);

  useEffect(() => {
    refreshTransactionData(transactionId);
  }, [refreshTransactionData, transactionId]);

  const tree = useMemo(() => buildTaskTree(tasks), [tasks]);

  useEffect(() => {
    if (tree.length === 0) return;
    if (typeof window === 'undefined') return;
    localStorage.removeItem(emptyPathDismissKey(transactionId));
  }, [tree.length, transactionId]);

  const onToggleStatus = async (task: TransactionTask) => {
    if (readOnly) return;
    const status = nextStatus(task.status);
    await updateTaskStatus(task.id, status);
  };

  const onMarkDone = async (task: TransactionTask) => {
    if (readOnly) return;
    if (task.status === TransactionTaskStatus.Done) return;
    setCompleteTarget(task);
    setOfficialRef('');
    setCompleteOpen(true);
  };

  const confirmComplete = async () => {
    if (!completeTarget) return;
    await completeTask(completeTarget.id, officialRef);
    setCompleteOpen(false);
    setCompleteTarget(null);
    setOfficialRef('');
  };

  const openEdit = (task: TransactionTask) => {
    setEditTarget(task);
    setEditTitle(task.title);
    setEditDeadlineDate(task.deadline ? task.deadline.slice(0, 10) : '');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const title = editTitle.trim();
    if (!title) return;
    const deadlineIso = editDeadlineDate
      ? new Date(`${editDeadlineDate}T00:00:00`).toISOString()
      : null;
    await updateTask(editTarget.id, { title, deadline: deadlineIso });
    setEditOpen(false);
    setEditTarget(null);
    setEditTitle('');
    setEditDeadlineDate('');
  };

  const countCascade = (rootId: string) => {
    const childrenByParent = new Map<string, string[]>();
    for (const t of tasks) {
      if (!t.parentTaskId) continue;
      const arr = childrenByParent.get(t.parentTaskId) ?? [];
      arr.push(t.id);
      childrenByParent.set(t.parentTaskId, arr);
    }
    const visited = new Set<string>();
    const stack = [rootId];
    while (stack.length) {
      const id = stack.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      for (const c of childrenByParent.get(id) ?? []) stack.push(c);
    }
    return visited.size;
  };

  const openDelete = (task: TransactionTask) => {
    setDeleteTarget(task);
    setDeleteCount(countCascade(task.id));
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteTaskCascade(deleteTarget.id);
    setDeleteOpen(false);
    setDeleteTarget(null);
    setDeleteCount(1);
  };

  const progress = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === TransactionTaskStatus.Done).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, percent };
  }, [tasks]);

  return (
    <div dir="rtl" className="py-4 space-y-4 pb-4 w-full max-w-full">
      <TxGlassPanel className="p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div
            className="relative shrink-0 w-[4.25rem] h-[4.25rem] rounded-full border-2 border-[#2A4550] flex items-center justify-center bg-[#0A171D]"
            aria-hidden
          >
            <div
              className="absolute inset-1 rounded-full"
              style={{
                background: `conic-gradient(#C4782F ${progress.percent * 3.6}deg, #1A3340 0deg)`,
              }}
            />
            <div className="absolute inset-[5px] rounded-full bg-[#152A32] flex items-center justify-center">
              <span className={`${TX_TEXT_OCHRE} font-extrabold text-lg tabular-nums leading-none`}>
                {progress.percent}%
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className={`${TX_TEXT_PRIMARY} font-extrabold text-sm`}>نسبة الإنجاز</div>
              <div className={`${TX_TEXT_MUTED} text-xs font-medium tabular-nums`}>
                {progress.done}/{progress.total}
              </div>
            </div>
            <div className="mt-3 h-2.5 rounded-[3px] bg-[#0A171D] border border-[#2A4550]/80 overflow-hidden">
              <div
                className="h-full rounded-[2px] bg-gradient-to-r from-[#9A6024] via-[#C4782F] to-[#D49248] transition-[width] duration-500"
                style={{ width: `${Math.max(progress.percent, progress.total > 0 ? 4 : 0)}%` }}
              />
            </div>
            <div className={`mt-2.5 ${TX_TEXT_MUTED} text-xs font-medium`}>
              {progress.done} من {progress.total} مهمة منجزة
            </div>
          </div>
        </div>
      </TxGlassPanel>

      {tree.length === 0 ? (
        <PathEmptyHint
          transactionId={transactionId}
          onImportFromMyTemplates={onImportFromMyTemplates}
          readOnly={readOnly}
        />
      ) : (
        <div className="space-y-3 w-full">
          {tree.map((node, i) => (
            <NodeRenderer
              key={node.id}
              node={node}
              depth={0}
              index={i}
              siblingsCount={tree.length}
              taskNumber={String(i + 1)}
              onToggleStatus={onToggleStatus}
              onMarkDone={onMarkDone}
              onAddSubTask={(t) => onRequestAddTask(t)}
              onEdit={openEdit}
              onDelete={openDelete}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditTarget(null);
            setEditTitle('');
            setEditDeadlineDate('');
          }
        }}
      >
        <DialogContent className={TX_DIALOG_SHELL}>
          <DialogHeader className="text-right">
            <DialogTitle className={TX_DIALOG_TITLE}>تعديل المهمة</DialogTitle>
            <DialogDescription className={TX_DIALOG_DESC}>تعديل العنوان والمهلة (اختياري)</DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right space-y-3">
            <div>
              <div className={`${TX_TEXT_MUTED} text-sm mb-2 font-medium`}>عنوان المهمة</div>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={GLASS_FIELD}
              />
            </div>
            <div>
              <div className={`${TX_TEXT_MUTED} text-sm mb-2 font-medium`}>تاريخ نفاذ الصلاحية / المهلة</div>
              <input
                value={editDeadlineDate}
                onChange={(e) => setEditDeadlineDate(e.target.value)}
                type="date"
                className={`${GLASS_FIELD} [color-scheme:dark]`}
              />
              <p className={`${TX_TEXT_MUTED} text-[10px] mt-1.5 leading-5 font-medium`}>
                يُربط تلقائياً بالتقويم للمهام غير المنجزة.
              </p>
            </div>
          </div>
          <DialogFooter className="sm:justify-start gap-2">
            <button type="button" onClick={() => setEditOpen(false)} className={TX_DIALOG_BTN_CANCEL}>
              إلغاء
            </button>
            <button type="button" onClick={saveEdit} className={TX_GOLD_BTN + ' !h-11 !px-5 !text-sm'}>
              حفظ
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeleteTarget(null);
            setDeleteCount(1);
          }
        }}
      >
        <DialogContent className={TX_DIALOG_SHELL}>
          <DialogHeader className="text-right">
            <DialogTitle className={TX_DIALOG_TITLE}>حذف مهمة</DialogTitle>
            <DialogDescription className={TX_DIALOG_DESC}>سيتم حذف المهمة من المسار</DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right">
            <div className={`${TX_INNER_SURFACE} p-4 ${TX_TEXT_SECONDARY} text-sm leading-7`}>
              {deleteCount > 1 ? (
                <div>
                  هذه المهمة تحتوي على مهام متفرعة. سيتم حذف {deleteCount} مهام (حذف تسلسلي).
                </div>
              ) : (
                <div>هل أنت متأكد من حذف هذه المهمة؟</div>
              )}
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
        </DialogContent>
      </Dialog>

      <Dialog
        open={completeOpen}
        onOpenChange={(open) => {
          setCompleteOpen(open);
          if (!open) {
            setCompleteTarget(null);
            setOfficialRef('');
          }
        }}
      >
        <DialogContent className={TX_DIALOG_SHELL}>
          <DialogHeader className="text-right">
            <DialogTitle className={TX_DIALOG_TITLE}>إكمال المهمة</DialogTitle>
            <DialogDescription className={TX_DIALOG_DESC}>
              إضافة رقم الصادر/الوارد أو الوصل؟ (اختياري)
            </DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right">
            <div className={`${TX_TEXT_PRIMARY} text-sm font-extrabold truncate`}>{completeTarget?.title}</div>
            <input
              value={officialRef}
              onChange={(e) => setOfficialRef(e.target.value)}
              placeholder="مثال: 1234"
              className={`${GLASS_FIELD} mt-3`}
            />
          </div>
          <DialogFooter className="sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => {
                setCompleteOpen(false);
                setCompleteTarget(null);
                setOfficialRef('');
              }}
              className={TX_DIALOG_BTN_CANCEL}
            >
              إلغاء
            </button>
            <button type="button" onClick={confirmComplete} className={GLASS_BTN + ' !w-auto !h-11 !px-5'}>
              إكمال
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
