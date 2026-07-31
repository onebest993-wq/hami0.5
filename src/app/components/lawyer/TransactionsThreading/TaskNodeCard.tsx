import { GitBranch, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { TransactionTask, TransactionTaskStatus } from '@/app/modules/transactionsThreading/types';
import { TransactionTaskStatus as TaskStatus } from '@/app/modules/transactionsThreading/types';
import {
    TransactionsDropdownMenu,
    TransactionsDropdownMenuContent,
    TransactionsDropdownMenuItem,
    TransactionsDropdownMenuTrigger,
    runAfterTransactionsMenuClose,
} from './TransactionsDropdownMenu';
import {
    TX_ACCENT_SURFACE,
    TX_DROPDOWN_FOCUS,
    TX_GOLD_BTN,
    TX_ICON_BTN,
    TX_TEXT_OCHRE,
    TX_TEXT_PRIMARY,
} from './transactionsGlassTheme';
import { taskHierarchyVisuals } from './taskHierarchyVisuals';

function deadlineBadge(deadlineIso: string | null) {
  if (!deadlineIso) return null;
  const deadline = new Date(deadlineIso);
  if (Number.isNaN(deadline.getTime())) return null;
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / dayMs);
  if (daysLeft < 0) {
    return { label: 'نافذ الصلاحية', className: 'bg-[#C4782F]/12 text-[#D49248] border-[#C4782F]/40' };
  }
  if (daysLeft <= 3) {
    return { label: `ينتهي خلال ${daysLeft} ي`, className: TX_ACCENT_SURFACE + ' text-[#D49248]' };
  }
  return { label: `متبقي ${daysLeft} ي`, className: 'bg-[#1A3340] text-[#B4B0AA] border-[#2A4550]/80' };
}

function statusLabelAr(status: TransactionTaskStatus) {
  if (status === TaskStatus.Pending) return 'بانتظار';
  if (status === TaskStatus.InProgress) return 'قيد التنفيذ';
  if (status === TaskStatus.Blocked) return 'معطّل';
  return 'منجز';
}

function statusToneClass(status: TransactionTaskStatus) {
  if (status === TaskStatus.InProgress) return 'bg-[#C4782F]/14 text-[#D49248] border-[#C4782F]/35';
  if (status === TaskStatus.Blocked) return 'bg-[#1A3340] text-[#8A8680] border-[#2A4550]';
  if (status === TaskStatus.Done) return 'bg-emerald-950/40 text-emerald-300/90 border-emerald-500/30';
  return 'bg-[#152A32] text-[#B4B0AA] border-[#2A4550]/80';
}

export function TaskNodeCard({
  task,
  taskNumber,
  depth,
  onToggleStatus,
  onAddSubTask,
  onEdit,
  onDelete,
  readOnly,
}: {
  task: TransactionTask;
  taskNumber: string;
  depth: number;
  onToggleStatus: (task: TransactionTask) => void;
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
      className={`relative w-full min-w-0 overflow-hidden rounded-sm border transition ${hierarchy.cardClass} ${
        readOnly ? 'opacity-85' : ''
      }`}
    >
      <div
        className="absolute top-0 left-0 bottom-0 w-[3px] bg-[#C4782F]/55 pointer-events-none"
        aria-hidden
      />

      <div
        role="button"
        tabIndex={readOnly ? -1 : 0}
        onClick={() => {
          if (!readOnly) onToggleStatus(task);
        }}
        onKeyDown={(e) => {
          if (!readOnly && (e.key === 'Enter' || e.key === ' ')) onToggleStatus(task);
        }}
        className={`w-full text-right px-4 pt-4 pb-3 ${readOnly ? '' : 'cursor-pointer'}`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`shrink-0 w-11 h-11 rounded-[4px] border flex items-center justify-center font-extrabold text-base tabular-nums ${hierarchy.numberBadgeClass}`}
            aria-label={`رقم ${hierarchy.levelLabel} ${taskNumber}`}
          >
            {taskNumber}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div
                className={`${TX_TEXT_PRIMARY} font-extrabold text-[15px] leading-6 break-words min-w-0 flex-1 ${
                  isDone ? 'line-through opacity-70' : ''
                }`}
                title={task.title}
              >
                {task.title}
              </div>
              <span
                className={`shrink-0 inline-flex items-center h-6 px-2 rounded-[3px] border text-[10px] font-bold ${hierarchy.levelBadgeClass}`}
              >
                {hierarchy.levelLabel}
              </span>
            </div>

            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center h-7 px-2.5 rounded-[3px] border text-[11px] font-bold ${statusToneClass(task.status)}`}
              >
                {statusLabelAr(task.status)}
              </span>
              {dBadge ? (
                <span className={`inline-flex items-center h-7 px-2.5 rounded-[3px] border text-[11px] font-bold ${dBadge.className}`}>
                  {dBadge.label}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {isDone && task.officialReference ? (
          <div className="mt-3 mr-14">
            <div className={`inline-flex items-center min-h-8 px-3 rounded-[3px] ${TX_ACCENT_SURFACE} ${TX_TEXT_OCHRE} text-[11px] font-bold`}>
              الصادر/الوارد: {task.officialReference}
            </div>
          </div>
        ) : null}
      </div>

      {!readOnly ? (
        <div
          className="flex items-center justify-end gap-2 px-3 py-2.5 border-t border-[#2A4550]/70 bg-[#0A171D]/35"
          onClick={(e) => e.stopPropagation()}
        >
          <TransactionsDropdownMenu>
            <TransactionsDropdownMenuTrigger asChild>
              <button type="button" className={TX_ICON_BTN} aria-label="خيارات المهمة">
                <MoreVertical className="w-4 h-4" />
              </button>
            </TransactionsDropdownMenuTrigger>
            <TransactionsDropdownMenuContent>
              <TransactionsDropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  runAfterTransactionsMenuClose(() => onEdit(task));
                }}
                className={TX_DROPDOWN_FOCUS}
              >
                <span className="inline-flex items-center gap-2">
                  <Pencil className="w-4 h-4" />
                  تعديل
                </span>
              </TransactionsDropdownMenuItem>
              <TransactionsDropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  runAfterTransactionsMenuClose(() => onDelete(task));
                }}
                className={`${TX_DROPDOWN_FOCUS} text-[#D49248] focus:text-[#D49248]`}
              >
                <span className="inline-flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  حذف
                </span>
              </TransactionsDropdownMenuItem>
            </TransactionsDropdownMenuContent>
          </TransactionsDropdownMenu>

          <button
            type="button"
            onClick={() => onAddSubTask(task)}
            className={`${TX_GOLD_BTN} !px-3 !text-[11px] inline-flex items-center gap-1.5`}
          >
            <GitBranch className="w-4 h-4" />
            متفرع
          </button>
        </div>
      ) : null}
    </div>
  );
}
