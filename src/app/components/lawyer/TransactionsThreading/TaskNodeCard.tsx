import { Check, GitBranch, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { TransactionTask, TransactionTaskStatus } from '@/app/modules/transactionsThreading';
import { TransactionTaskStatus as TaskStatus } from '@/app/modules/transactionsThreading';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { taskHierarchyVisuals } from './taskHierarchyVisuals';

function deadlineBadge(deadlineIso: string | null) {
  if (!deadlineIso) return null;
  const deadline = new Date(deadlineIso);
  if (Number.isNaN(deadline.getTime())) return null;
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / dayMs);
  if (daysLeft < 0) {
    return { label: '🔴 نافذ الصلاحية', className: 'bg-rose-500/15 text-rose-200 border-rose-500/25' };
  }
  if (daysLeft <= 3) {
    return { label: '⚠️ ينتهي قريباً!', className: 'bg-amber-500/15 text-amber-200 border-amber-500/25' };
  }
  return { label: `⏳ متبقي ${daysLeft} أيام`, className: 'bg-white/5 text-gray-200 border-white/10' };
}

function statusLabelAr(status: TransactionTaskStatus) {
  if (status === TaskStatus.Pending) return 'بانتظار';
  if (status === TaskStatus.InProgress) return 'قيد التنفيذ';
  if (status === TaskStatus.Blocked) return 'معطّل';
  return 'منجز';
}

export function TaskNodeCard({
  task,
  taskNumber,
  depth,
  onToggleStatus,
  onMarkDone,
  onAddSubTask,
  onEdit,
  onDelete,
  readOnly,
}: {
  task: TransactionTask;
  taskNumber: string;
  depth: number;
  onToggleStatus: (task: TransactionTask) => void;
  onMarkDone: (task: TransactionTask) => void;
  onAddSubTask: (task: TransactionTask) => void;
  onEdit: (task: TransactionTask) => void;
  onDelete: (task: TransactionTask) => void;
  readOnly?: boolean;
}) {
  const isDone = task.status === TaskStatus.Done;
  const dBadge = deadlineBadge(task.deadline);
  const hierarchy = taskHierarchyVisuals(depth);

  return (
    <div
      dir="rtl"
      role="button"
      tabIndex={readOnly ? -1 : 0}
      onClick={() => {
        if (!readOnly) onToggleStatus(task);
      }}
      onKeyDown={(e) => {
        if (!readOnly && (e.key === 'Enter' || e.key === ' ')) onToggleStatus(task);
      }}
      className={`w-full text-right rounded-2xl border transition px-4 py-3 ${
        hierarchy.cardClass
      } ${readOnly ? 'opacity-85' : 'cursor-pointer'}`}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`shrink-0 min-w-9 h-9 px-2 rounded-xl border flex items-center justify-center font-extrabold text-sm tabular-nums ${hierarchy.numberBadgeClass}`}
            aria-label={`رقم ${hierarchy.levelLabel} ${taskNumber}`}
          >
            {taskNumber}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center h-6 px-2.5 rounded-full border text-[10px] font-bold ${hierarchy.levelBadgeClass}`}
              >
                {hierarchy.levelLabel}
              </span>
            </div>
            <div
              className={`text-white font-bold text-sm leading-6 break-words ${isDone ? 'line-through opacity-80' : ''}`}
              title={task.title}
            >
              {task.title}
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <div className="text-gray-400 text-xs">{statusLabelAr(task.status)}</div>
              {dBadge && (
                <div className={`inline-flex items-center h-7 px-3 rounded-full border text-xs font-bold ${dBadge.className}`}>
                  {dBadge.label}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 flex-wrap">
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-gray-200 flex items-center justify-center hover:bg-white/10"
                  aria-label="خيارات المهمة"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="z-[1200] bg-[#071022] border border-[#D4AF37]/20 text-gray-200 rounded-xl p-1">
                <DropdownMenuItem
                  onSelect={() => onEdit(task)}
                  className="cursor-default"
                >
                  <span className="inline-flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    تعديل
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onDelete(task)}
                  className="cursor-default text-rose-200 focus:text-rose-200"
                >
                  <span className="inline-flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <button
            type="button"
            disabled={!!readOnly || isDone}
            onClick={(e) => {
              e.stopPropagation();
              onMarkDone(task);
            }}
            className="w-9 h-9 rounded-xl bg-emerald-500/12 border border-emerald-500/18 text-emerald-200 flex items-center justify-center hover:bg-emerald-500/18 disabled:opacity-40"
            aria-label="وضع علامة منجز"
          >
            <Check className="w-5 h-5" />
          </button>

          <button
            type="button"
            disabled={!!readOnly}
            onClick={(e) => {
              e.stopPropagation();
              onAddSubTask(task);
            }}
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 text-xs font-bold hover:bg-white/10 disabled:opacity-40 inline-flex items-center gap-1.5"
            aria-label="إضافة إجراء متفرع"
            title="إضافة إجراء متفرع"
          >
            <GitBranch className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">إضافة إجراء متفرع</span>
            <span className="sm:hidden">متفرع</span>
          </button>
        </div>
      </div>

      {isDone && task.officialReference && (
        <div className="mt-3">
          <div className="inline-flex items-center h-8 px-3 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#F4C430] text-xs font-extrabold">
            🏷️ الصادر/الوارد: {task.officialReference}
          </div>
        </div>
      )}
    </div>
  );
}
