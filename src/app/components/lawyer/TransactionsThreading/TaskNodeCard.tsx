import { memo } from 'react';
import { GitBranch } from '@/app/components/ui/icons/GitBranch';
import { MoreVertical } from '@/app/components/ui/icons/MoreVertical';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { TransactionTaskStatus as TaskStatus, type TransactionTask } from '@/app/modules/transactionsThreading/types';
import {
    TransactionsDropdownMenu,
    TransactionsDropdownMenuContent,
    TransactionsDropdownMenuItem,
    TransactionsDropdownMenuTrigger,
    runAfterTransactionsMenuClose,
} from './TransactionsDropdownMenu';
import {
    TX_DROPDOWN_FOCUS,
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
    return { label: 'نافذ الصلاحية', className: 'text-[#E6C673]' };
  }
  if (daysLeft <= 3) {
    return { label: `ينتهي خلال ${daysLeft} ي`, className: TX_TEXT_OCHRE };
  }
  return { label: `متبقي ${daysLeft} ي`, className: 'text-white/50' };
}

function statusLabelAr(status: TransactionTask['status']) {
  if (status === TaskStatus.Pending) return 'بانتظار';
  if (status === TaskStatus.InProgress) return 'قيد التنفيذ';
  if (status === TaskStatus.Blocked) return 'معطّل';
  return 'منجز';
}

function statusToneClass(status: TransactionTask['status']) {
  if (status === TaskStatus.InProgress) return 'text-[#E6C673]';
  if (status === TaskStatus.Blocked) return 'text-white/40';
  if (status === TaskStatus.Done) return 'text-white/40';
  return 'text-white/55';
}

export const TaskNodeCard = memo(function TaskNodeCard({
  task,
  taskNumber,
  depth,
  onToggleStatus,
  onAddSubTask,
  onEdit,
  onDelete,
  onSetTaskStatus,
  readOnly,
}: {
  task: TransactionTask;
  taskNumber: string;
  depth: number;
  onToggleStatus: (task: TransactionTask) => void;
  onAddSubTask: (task: TransactionTask) => void;
  onEdit: (task: TransactionTask) => void;
  onDelete: (task: TransactionTask) => void;
  onSetTaskStatus: (task: TransactionTask, status: TransactionTask['status']) => void;
  readOnly?: boolean;
}) {
  const isDone = task.status === TaskStatus.Done;
  const dBadge = deadlineBadge(task.deadline);
  const hierarchy = taskHierarchyVisuals(depth);

  return (
    <div
      dir="rtl"
      className={`relative w-full min-w-0 overflow-hidden rounded-xl border [contain:layout] ${hierarchy.cardClass} ${
        readOnly ? 'opacity-85' : ''
      }`}
    >
      <div
        role="button"
        tabIndex={readOnly ? -1 : 0}
        onClick={() => {
          if (!readOnly) onToggleStatus(task);
        }}
        onKeyDown={(e) => {
          if (readOnly) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleStatus(task);
          }
        }}
        className={`w-full text-right px-3 pt-2 pb-1.5 ${readOnly ? '' : 'cursor-pointer'}`}
      >
        <div className="flex items-start gap-2 min-w-0">
          <span
            className={`shrink-0 w-6 pt-0.5 text-center text-[11px] font-bold tabular-nums ${hierarchy.numberTextClass}`}
            aria-label={`رقم ${hierarchy.levelLabel} ${taskNumber}`}
          >
            {taskNumber}
          </span>

          <div className="flex-1 min-w-0">
            <div
              className={`${TX_TEXT_PRIMARY} font-semibold text-[14px] leading-5 break-words ${
                isDone ? 'line-through opacity-70' : ''
              }`}
              title={task.title}
            >
              {task.title}
            </div>

            <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] font-bold">
              <span className={statusToneClass(task.status)}>{statusLabelAr(task.status)}</span>
              {dBadge ? <span className={dBadge.className}>{dBadge.label}</span> : null}
            </div>
          </div>
        </div>

        {isDone && task.officialReference ? (
          <div className={`mt-1.5 mr-8 text-[11px] font-bold ${TX_TEXT_OCHRE}`}>
            الصادر/الوارد: {task.officialReference}
          </div>
        ) : null}
      </div>

      {!readOnly ? (
        <div
          className="flex items-center justify-end gap-1 px-2 py-1 border-t border-white/[0.06]"
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
                data-testid="transactions-task-menu-edit"
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
                className={`${TX_DROPDOWN_FOCUS} text-[#E6C673] focus:text-[#E6C673]`}
                data-testid="transactions-task-menu-delete"
              >
                <span className="inline-flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  حذف
                </span>
              </TransactionsDropdownMenuItem>
              {task.status === TaskStatus.Blocked ? (
                <TransactionsDropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    runAfterTransactionsMenuClose(() => onSetTaskStatus(task, TaskStatus.InProgress));
                  }}
                  className={TX_DROPDOWN_FOCUS}
                  data-testid="transactions-task-menu-resume"
                >
                  استئناف
                </TransactionsDropdownMenuItem>
              ) : task.status !== TaskStatus.Done ? (
                <TransactionsDropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    runAfterTransactionsMenuClose(() => onSetTaskStatus(task, TaskStatus.Blocked));
                  }}
                  className={TX_DROPDOWN_FOCUS}
                  data-testid="transactions-task-menu-block"
                >
                  تعطيل
                </TransactionsDropdownMenuItem>
              ) : null}
            </TransactionsDropdownMenuContent>
          </TransactionsDropdownMenu>

          <button
            type="button"
            onClick={() => onAddSubTask(task)}
            className={TX_ICON_BTN}
            aria-label="متفرع"
          >
            <GitBranch className="w-4 h-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
});
