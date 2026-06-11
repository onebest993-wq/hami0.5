import { useEffect, useMemo, useState } from 'react';
import { useTransactionsThreadingStore, buildTaskTree, TransactionTaskStatus, type TransactionTask, type TransactionTaskNode } from '@/app/modules/transactionsThreading';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { TaskNodeCard } from './TaskNodeCard';

const EMPTY_TASKS: TransactionTask[] = [];

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

function nodeDotClass(status: TransactionTaskStatus) {
  if (status === TransactionTaskStatus.Done) return 'bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]';
  if (status === TransactionTaskStatus.InProgress) return 'bg-amber-300 shadow-[0_0_0_4px_rgba(251,191,36,0.14)]';
  if (status === TransactionTaskStatus.Blocked) return 'bg-rose-400 shadow-[0_0_0_4px_rgba(244,63,94,0.16)]';
  return 'bg-gray-400 shadow-[0_0_0_4px_rgba(156,163,175,0.12)]';
}

const TREE_INDENT = 20;
const TREE_GUTTER_BASE = 14;

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
  const laneRight = 8 + depth * TREE_INDENT;
  const gutterWidth = TREE_GUTTER_BASE + depth * TREE_INDENT;
  const showBottomLine = node.children.length > 0 || index < siblingsCount - 1;
  const branchLineClass = depth === 0 ? 'bg-[#D4AF37]/25' : 'bg-sky-400/25';

  return (
    <div className="relative w-full">
      {showBottomLine ? (
        <div
          className={`absolute w-px pointer-events-none ${branchLineClass}`}
          style={{ right: laneRight, top: 26, bottom: -12, opacity: 0.85 }}
        />
      ) : (
        <div
          className={`absolute w-px pointer-events-none ${branchLineClass}`}
          style={{ right: laneRight, top: 0, height: 26, opacity: 0.85 }}
        />
      )}
      {depth > 0 && (
        <div
          className={`absolute h-px pointer-events-none ${branchLineClass}`}
          style={{ right: 8 + (depth - 1) * TREE_INDENT, top: 26, width: TREE_INDENT, opacity: 0.85 }}
        />
      )}
      <div
        className={`absolute w-4 h-4 rounded-full pointer-events-none ${nodeDotClass(node.status)}`}
        style={{ right: laneRight - 7, top: 18 }}
      />

      <div className="flex w-full items-stretch gap-2">
        <div className="shrink-0" style={{ width: gutterWidth }} aria-hidden />
        <div className="flex-1 min-w-0">
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
        </div>
      </div>

      {node.children.length > 0 && (
        <div className="mt-3 space-y-3">
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
      )}
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
    <div dir="rtl" className="px-5 py-5 space-y-3 pb-28 w-full">
      <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-4 shadow-[0_16px_55px_rgba(0,0,0,0.30)]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-white font-extrabold text-sm">نسبة الإنجاز</div>
          <div className="text-gray-200 font-extrabold text-sm">{progress.percent}%</div>
        </div>
        <div className="mt-3 h-2.5 rounded-full bg-black/20 border border-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-[#D4AF37] to-amber-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="mt-2 text-gray-400 text-xs">
          {progress.done} من {progress.total} مهمة منجزة
        </div>
      </div>

      {tree.length === 0 ? (
        <div className="pt-10">
          <div className="rounded-3xl bg-gradient-to-br from-white/7 to-white/3 border border-[#D4AF37]/18 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.35)]">
            <div className="text-white font-extrabold text-base">لا يوجد مسار بعد</div>
            <div className="text-gray-400 text-sm mt-2 leading-7">
              يمكنك إضافة مهام يدوياً أو الاستيراد من قوالبك لتوفير الوقت.
            </div>
            {!readOnly && onImportFromMyTemplates && (
              <button
                type="button"
                onClick={onImportFromMyTemplates}
                className="mt-4 w-full h-12 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-[#D4AF37] to-[#F4C430] text-[#0D0D1A] shadow-lg shadow-[#D4AF37]/25"
              >
                استيراد من قوالبي
              </button>
            )}
          </div>
        </div>
      ) : (
        tree.map((node, i) => (
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
        ))
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
        <DialogContent className="bg-[#071022] border border-[#D4AF37]/20 rounded-3xl p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-white text-base">تعديل المهمة</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">تعديل العنوان والمهلة (اختياري)</DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right space-y-3">
            <div>
              <div className="text-gray-300 text-sm mb-2">عنوان المهمة</div>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full h-12 rounded-2xl bg-[#0D0D1A] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37]/50"
              />
            </div>
            <div>
              <div className="text-gray-300 text-sm mb-2">تاريخ نفاذ الصلاحية / المهلة</div>
              <input
                value={editDeadlineDate}
                onChange={(e) => setEditDeadlineDate(e.target.value)}
                type="date"
                className="w-full h-12 rounded-2xl bg-[#0D0D1A] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37]/50"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="h-11 px-5 rounded-2xl bg-white/5 border border-white/10 text-gray-200 font-bold"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={saveEdit}
              className="h-11 px-5 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/25 text-[#F4C430] font-extrabold"
            >
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
        <DialogContent className="bg-[#071022] border border-rose-500/20 rounded-3xl p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-white text-base">حذف مهمة</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">سيتم حذف المهمة من المسار</DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right">
            <div className="rounded-2xl bg-black/20 border border-white/10 p-4 text-gray-100 text-sm leading-7">
              {deleteCount > 1 ? (
                <div>
                  هذه المهمة تحتوي على مهام متفرعة. سيتم حذف {deleteCount} مهام (حذف تسلسلي).
                </div>
              ) : (
                <div>هل أنت متأكد من حذف هذه المهمة؟</div>
              )}
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
        <DialogContent className="bg-[#071022] border border-[#D4AF37]/20 rounded-3xl p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-white text-base">إكمال المهمة</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              إضافة رقم الصادر/الوارد أو الوصل؟ (اختياري)
            </DialogDescription>
          </DialogHeader>
          <div dir="rtl" className="text-right">
            <div className="text-gray-200 text-sm font-bold truncate">{completeTarget?.title}</div>
            <input
              value={officialRef}
              onChange={(e) => setOfficialRef(e.target.value)}
              placeholder="مثال: 1234"
              className="mt-3 w-full h-12 rounded-2xl bg-[#0D0D1A] border border-[#D4AF37]/20 text-white px-4 outline-none focus:border-[#D4AF37]/50"
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
              className="h-11 px-5 rounded-2xl bg-white/5 border border-white/10 text-gray-200 font-bold"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={confirmComplete}
              className="h-11 px-5 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-300 text-[#0D0D1A] font-extrabold shadow-lg shadow-emerald-500/20"
            >
              إكمال
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
