import { Check, GitBranch, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { TransactionTask, TransactionTaskStatus } from '@/app/modules/transactionsThreading/types';
import { TransactionTaskStatus as TaskStatus } from '@/app/modules/transactionsThreading/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import {
    TX_ACCENT_SURFACE,
    TX_DROPDOWN_CONTENT,
    TX_DROPDOWN_FOCUS,
    TX_GOLD_BTN,
    TX_ICON_BTN,
    TX_OCHRE_BTN,
    TX_TEXT_MUTED,
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
    return { label: '🔴 نافذ الصلاحية', className: 'bg-[#C4782F]/12 text-[#D49248] border-[#C4782F]/40' };
  }
  if (daysLeft <= 3) {
    return { label: '⚠️ ينتهي قريباً!', className: TX_ACCENT_SURFACE + ' text-[#D49248]' };
  }
  return { label: `⏳ متبقي ${daysLeft} أيام`, className: 'bg-[#1A3340] text-[#B4B0AA] border-[#2A4550]/80' };
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
      className={`w-full text-right rounded-sm border transition px-4 py-3 ${
        hierarchy.cardClass
      } ${readOnly ? 'opacity-85' : 'cursor-pointer'}`}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`shrink-0 min-w-9 h-9 px-2 rounded-[3px] border flex items-center justify-center font-extrabold text-sm tabular-nums ${hierarchy.numberBadgeClass}`}
            aria-label={`رقم ${hierarchy.levelLabel} ${taskNumber}`}
          >
            {taskNumber}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center h-6 px-2.5 rounded-[3px] border text-[10px] font-bold ${hierarchy.levelBadgeClass}`}
              >
                {hierarchy.levelLabel}
              </span>
            </div>
            <div
              className={`${TX_TEXT_PRIMARY} font-extrabold text-sm leading-6 break-words ${isDone ? 'line-through opacity-70' : ''}`}
              title={task.title}
            >
              {task.title}
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <div className={`${TX_TEXT_MUTED} text-xs font-medium`}>{statusLabelAr(task.status)}</div>
              {dBadge && (
                <div className={`inline-flex items-center h-7 px-3 rounded-[3px] border text-xs font-bold ${dBadge.className}`}>
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
                  className={TX_ICON_BTN + ' !w-9 !h-9'}
                  aria-label="خيارات المهمة"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className={TX_DROPDOWN_CONTENT}>
                <DropdownMenuItem onSelect={() => onEdit(task)} className={TX_DROPDOWN_FOCUS}>
                  <span className="inline-flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    تعديل
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onDelete(task)}
                  className={`${TX_DROPDOWN_FOCUS} text-[#D49248] focus:text-[#D49248]`}
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
            className={`${TX_OCHRE_BTN} !w-9 !h-9 !p-0 flex items-center justify-center disabled:opacity-40`}
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
            className={`${TX_GOLD_BTN} !h-9 !px-2.5 sm:!px-3 !text-xs disabled:opacity-40 inline-flex items-center gap-1.5`}
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
          <div className={`inline-flex items-center h-8 px-3 rounded-[3px] ${TX_ACCENT_SURFACE} ${TX_TEXT_OCHRE} text-xs font-extrabold`}>
            🏷️ الصادر/الوارد: {task.officialReference}
          </div>
        </div>
      )}
    </div>
  );
}
