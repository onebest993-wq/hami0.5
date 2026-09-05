import React, { useState } from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { GitBranch } from '@/app/components/ui/icons/GitBranch';
import type { DocumentRequirementItem, LegalSubTask, LegalSubTaskPlanStatus } from '@/app/types/TaskEngine';
import { TASKS_INPUT, TASKS_INNER_GLASS_SOFT } from './tasksBoucleTheme';
import { TaskRingToggle } from './TaskRingToggle';
import { TaskPlanChainLive } from './TaskPlanChain';

type TaskCardBranchPanelProps = {
    subTasks: LegalSubTask[];
    branchOpen: boolean;
    readOnly: boolean;
    onToggleSection: () => void;
    onAddSubTask: (title: string, location: string | null) => void;
    onSetPlanStatus: (subId: string, status: LegalSubTaskPlanStatus) => void;
    onRenameSubTask: (subId: string, title: string) => void;
    onRemoveSubTask: (subId: string) => void;
};

export function TaskCardBranchPanel({
    subTasks,
    branchOpen,
    readOnly,
    onToggleSection,
    onAddSubTask,
    onSetPlanStatus,
    onRenameSubTask,
    onRemoveSubTask,
}: TaskCardBranchPanelProps) {
    const hasSubTasks = subTasks.length > 0;

    return (
        <div className={`mx-3 mb-3 rounded-xl border border-sky-500/22 ${TASKS_INNER_GLASS_SOFT} overflow-hidden text-right`}>
            <button
                type="button"
                onClick={onToggleSection}
                className="w-full min-h-[44px] flex flex-row-reverse items-center justify-between gap-2 px-3 py-2.5 border-b border-sky-500/15 bg-sky-500/6 hover:bg-sky-500/10 transition touch-manipulation"
                aria-expanded={branchOpen}
            >
                <span className="text-[11px] font-extrabold text-sky-200/95 flex flex-row-reverse items-center gap-1.5">
                    <GitBranch className="size-3.5 shrink-0 opacity-90" aria-hidden />
                    {hasSubTasks ? `الخطة (${subTasks.length})` : 'إنشاء خطة'}
                </span>
                <ChevronDown
                    className={`size-4 text-sky-300/75 shrink-0 transition-transform duration-200 ${
                        branchOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                />
            </button>

            {branchOpen ? (
                <div className="px-3 py-2.5 space-y-2">
                    {!hasSubTasks && readOnly ? (
                        <p className="text-[11px] text-[#F4F4F5]/45 py-1">لا توجد حلقات في الخطة بعد.</p>
                    ) : (
                        <TaskPlanChainLive
                            subTasks={subTasks}
                            readOnly={readOnly}
                            onSetPlanStatus={onSetPlanStatus}
                            onRename={onRenameSubTask}
                            onRemove={onRemoveSubTask}
                            onAdd={(title) => onAddSubTask(title, null)}
                        />
                    )}
                </div>
            ) : null}
        </div>
    );
}

type TaskCardDocPanelProps = {
    items: DocumentRequirementItem[];
    readOnly: boolean;
    showAdd?: boolean;
    onToggle: (itemId: string) => void;
    onAdd: (text: string) => void;
};

export function TaskCardDocPanel({
    items,
    readOnly,
    showAdd = true,
    onToggle,
    onAdd,
}: TaskCardDocPanelProps) {
    const [docDraft, setDocDraft] = useState('');
    const openCount = items.filter((d) => !d.isChecked).length;

    return (
        <div className="text-right space-y-1.5">
            {items.length > 0 ? (
                <p className="text-[10px] font-bold text-violet-200/75 flex flex-row-reverse items-center justify-between gap-2 px-0.5">
                    <span>الطلبات</span>
                    <span className="tabular-nums text-violet-300/60">
                        {openCount > 0 ? `${openCount} متبق` : 'مكتمل'}
                    </span>
                </p>
            ) : null}
            {items.length > 0 ? (
                <ul className="space-y-0.5 max-h-32 overflow-y-auto overscroll-y-contain">
                    {items.map((d, idx) => (
                        <li
                            key={d.id}
                            className={`flex flex-row-reverse items-center gap-2 min-h-[44px] rounded-md px-1 ${
                                d.isChecked ? 'opacity-65' : ''
                            }`}
                        >
                            <TaskRingToggle
                                checked={d.isChecked}
                                disabled={readOnly}
                                label={d.isChecked ? `إلغاء: ${d.text}` : `إنجاز: ${d.text}`}
                                onToggle={() => !readOnly && onToggle(d.id)}
                                tone="violet"
                                size="sm"
                            />
                            {items.length > 1 ? (
                                <span className="text-[10px] font-extrabold tabular-nums text-violet-300/55 shrink-0 w-4 text-center">
                                    {idx + 1}
                                </span>
                            ) : null}
                            <span
                                className={`text-[12px] flex-1 leading-snug break-words ${
                                    d.isChecked
                                        ? 'text-[#F4F4F5]/45 line-through decoration-violet-300/30'
                                        : 'text-[#F4F4F5]/90'
                                }`}
                            >
                                {d.text}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : null}
            {!readOnly && showAdd ? (
                <div className="flex gap-1.5 flex-row-reverse pt-0.5">
                    <input
                        dir="rtl"
                        type="text"
                        data-testid="tasks-doc-add-input"
                        value={docDraft}
                        onChange={(e) => setDocDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            const t = docDraft.trim();
                            if (!t) return;
                            onAdd(t);
                            setDocDraft('');
                        }}
                        className={`flex-1 min-h-[44px] ${TASKS_INPUT} !py-2 text-[12px]`}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            const t = docDraft.trim();
                            if (!t) return;
                            onAdd(t);
                            setDocDraft('');
                        }}
                        disabled={!docDraft.trim()}
                        className="shrink-0 min-h-[44px] min-w-[44px] px-2 rounded-lg border border-[#E6C673]/28 bg-[#E6C673]/10 text-[#E6C673] text-sm font-bold disabled:opacity-40 touch-manipulation"
                        aria-label="إضافة طلب"
                    >
                        +
                    </button>
                </div>
            ) : null}
        </div>
    );
}
