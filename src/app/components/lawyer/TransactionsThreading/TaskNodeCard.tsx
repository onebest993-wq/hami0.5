import { memo } from 'react';
import { TransactionTaskStatus as TaskStatus, type TransactionTask } from '@/app/modules/transactionsThreading/types';
import { TransactionsLiteMenu } from './TransactionsLiteMenu';
import { GitBranchIcon } from './transactionsTheme/icons';
import {
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

  const menuItems = [
    {
      label: 'تعديل',
      testId: 'transactions-task-menu-edit',
      onSelect: () => onEdit(task),
    },
    {
      label: 'حذف',
      testId: 'transactions-task-menu-delete',
      accent: true,
      onSelect: () => onDelete(task),
    },
    ...(task.status === TaskStatus.Blocked
      ? [
          {
            label: 'استئناف',
            testId: 'transactions-task-menu-resume',
            onSelect: () => onSetTaskStatus(task, TaskStatus.InProgress),
          },
        ]
      : task.status !== TaskStatus.Done
        ? [
            {
              label: 'تعطيل',
              testId: 'transactions-task-menu-block',
              onSelect: () => onSetTaskStatus(task, TaskStatus.Blocked),
            },
          ]
        : []),
  ];

  return (
    <div dir="rtl" className={`relative w-full min-w-0 [contain:layout] ${hierarchy.cardClass} ${readOnly ? 'opacity-85' : ''}`}>
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
        className={`w-full text-right px-1 pt-2 pb-1.5 ${readOnly ? '' : 'cursor-pointer'}`}
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

            <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] font-semibold">
              <span className={statusToneClass(task.status)}>{statusLabelAr(task.status)}</span>
              {dBadge ? <span className={dBadge.className}>{dBadge.label}</span> : null}
            </div>
          </div>
        </div>

        {isDone && task.officialReference ? (
          <div className={`mt-1.5 mr-8 text-[11px] font-semibold ${TX_TEXT_OCHRE}`}>
            الصادر/الوارد: {task.officialReference}
          </div>
        ) : null}
      </div>

      {!readOnly ? (
        <div
          className="flex items-center justify-end gap-0.5 px-0.5 pb-1"
          onClick={(e) => e.stopPropagation()}
        >
          <TransactionsLiteMenu triggerLabel="خيارات المهمة" items={menuItems} />
          <button
            type="button"
            onClick={() => onAddSubTask(task)}
            className={TX_ICON_BTN}
            aria-label="متفرع"
          >
            <GitBranchIcon className="w-4 h-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
});
