import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Plus, Clock, Check, Edit3 } from '@/app/components/ui/lucideIcons';
import type { Task } from '../../LawyerShared';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { filterCivilLawsuitVisibleTasks } from '../smartFile/civilLawsuitTaskFilter';

function isAppealBriefTask(task: Task): boolean {
    return String(task.id).startsWith('task_appeal_');
}

function isCorrespondenceTask(task: Task): boolean {
    return task.taskKind === 'correspondence' || String(task.id).startsWith('task_corr_');
}

type CorrespondencePanelProps = {
    task: Task;
    onRecordResponse: (taskId: string, received: boolean) => void;
};

const CorrespondencePanel = ({ task, onRecordResponse }: CorrespondencePanelProps) => {
    if (task.isCompleted && task.correspondenceResponseReceived !== undefined && task.correspondenceResponseReceived !== null) {
        return (
            <div className="mt-2 rounded-lg border border-[#E6C673]/15 bg-[#E6C673]/5 px-2.5 py-2 space-y-1">
                {task.correspondenceEntity ? (
                    <p className="text-[10px] text-white/55">
                        الجهة: <span className="font-bold text-white/80">{task.correspondenceEntity}</span>
                    </p>
                ) : null}
                <p className="text-[10px] text-[#E6C673] font-bold">
                    {task.correspondenceResponseReceived ? '✓ تم استلام الرد' : '✗ لم يُستلم رد'}
                </p>
            </div>
        );
    }

    return (
        <div className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2.5 space-y-2">
            {task.correspondenceContent ? (
                <p className="text-[10px] text-white/55 leading-relaxed">{task.correspondenceContent}</p>
            ) : null}
            <p className="text-[10px] text-white/45">هل تم استلام الرد؟</p>
            <div className="grid grid-cols-2 gap-1.5">
                <button
                    type="button"
                    onClick={() => onRecordResponse(task.id, true)}
                    className="px-2 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/15 transition-colors"
                >
                    نعم — وُجد رد
                </button>
                <button
                    type="button"
                    onClick={() => onRecordResponse(task.id, false)}
                    className="px-2 py-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 text-[10px] font-bold text-rose-300 hover:bg-rose-500/15 transition-colors"
                >
                    لا — بلا رد
                </button>
            </div>
        </div>
    );
};

function appealOutcomeLabel(outcome: Task['appealOutcome']): string {
    if (outcome === 'quashed') return 'نقض القرار الإعدادي';
    if (outcome === 'upheld') return 'تأييد القرار الإعدادي';
    return '';
}

type AppealBriefPanelProps = {
    task: Task;
    onFileBrief: (taskId: string, decisionNo: string, decisionDate: string) => void;
    onRecordOutcome: (taskId: string, outcome: 'quashed' | 'upheld') => void;
};

const AppealBriefPanel = ({ task, onFileBrief, onRecordOutcome }: AppealBriefPanelProps) => {
    const [decisionNo, setDecisionNo] = useState(task.appealDecisionNo ?? '');
    const [decisionDate, setDecisionDate] = useState(task.appealDecisionDate ?? '');

    if (task.isCompleted && task.appealOutcome) {
        return (
            <div className="mt-2 rounded-lg border border-[#E6C673]/15 bg-[#E6C673]/5 px-2.5 py-2 space-y-1">
                {task.appealDecisionNo ? (
                    <p className="text-[10px] text-white/55">
                        رقم القرار: <span className="font-bold text-white/80">{task.appealDecisionNo}</span>
                    </p>
                ) : null}
                {task.appealDecisionDate ? (
                    <p className="text-[10px] text-white/55">
                        تاريخ القرار:{' '}
                        <span className="font-mono text-white/80" dir="ltr">
                            {task.appealDecisionDate}
                        </span>
                    </p>
                ) : null}
                <p className="text-[10px] text-[#E6C673] font-bold">
                    النتيجة: {appealOutcomeLabel(task.appealOutcome)}
                </p>
            </div>
        );
    }

    if (task.appealBriefFiled) {
        return (
            <div className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2.5 space-y-2">
                {task.appealDecisionNo ? (
                    <p className="text-[10px] text-white/55">
                        رقم القرار: <span className="font-bold text-white/80">{task.appealDecisionNo}</span>
                    </p>
                ) : null}
                {task.appealDecisionDate ? (
                    <p className="text-[10px] text-white/55">
                        تاريخ القرار:{' '}
                        <span className="font-mono text-white/80" dir="ltr">
                            {task.appealDecisionDate}
                        </span>
                    </p>
                ) : null}
                <p className="text-[10px] text-emerald-400/90 font-bold">✓ تم تقديم اللائحة</p>
                <div className="grid grid-cols-2 gap-1.5">
                    <button
                        type="button"
                        onClick={() => onRecordOutcome(task.id, 'quashed')}
                        className="px-2 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] text-[10px] font-bold text-white/80 hover:border-[#E6C673]/30 hover:text-[#E6C673] transition-colors"
                    >
                        نقض القرار الإعدادي
                    </button>
                    <button
                        type="button"
                        onClick={() => onRecordOutcome(task.id, 'upheld')}
                        className="px-2 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] text-[10px] font-bold text-white/80 hover:border-[#E6C673]/30 hover:text-[#E6C673] transition-colors"
                    >
                        تأييد القرار الإعدادي
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2.5 space-y-2">
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-[9px] text-white/45 mb-1">رقم القرار</label>
                    <input
                        type="text"
                        value={decisionNo}
                        onChange={(e) => setDecisionNo(e.target.value)}
                        className="w-full rounded-lg border border-white/[0.1] bg-black/20 px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#E6C673]/40"
                        placeholder="رقم القرار"
                    />
                </div>
                <div>
                    <label className="block text-[9px] text-white/45 mb-1">تاريخ القرار</label>
                    <input
                        type="date"
                        value={decisionDate}
                        onChange={(e) => setDecisionDate(e.target.value)}
                        className="w-full rounded-lg border border-white/[0.1] bg-black/20 px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#E6C673]/40 [color-scheme:dark]"
                    />
                </div>
            </div>
            <button
                type="button"
                onClick={() => onFileBrief(task.id, decisionNo, decisionDate)}
                className="w-full px-2 py-1.5 rounded-lg border border-[#E6C673]/25 bg-[#E6C673]/10 text-[10px] font-bold text-[#E6C673] hover:bg-[#E6C673]/15 transition-colors"
            >
                تسجيل تقديم اللائحة
            </button>
        </div>
    );
};

export const ToDoList = memo(function ToDoList({
    tasks,
    onAddTask,
    onToggleTask,
    onEditTask,
    onAppealBriefFile,
    onAppealBriefOutcome,
    onCorrespondenceResponse,
    visualVariant = 'civil',
    readOnly = false,
}: {
    tasks: Task[];
    onAddTask: () => void;
    onToggleTask: (id: string) => void;
    onEditTask: (task: Task) => void;
    onAppealBriefFile?: (taskId: string, decisionNo: string, decisionDate: string) => void;
    onAppealBriefOutcome?: (taskId: string, outcome: 'quashed' | 'upheld') => void;
    onCorrespondenceResponse?: (taskId: string, received: boolean) => void;
    visualVariant?: 'civil' | 'personal' | 'personal-pearl';
    readOnly?: boolean;
}) {
    const [expandedAppealTaskId, setExpandedAppealTaskId] = useState<string | null>(null);
    const [expandedCorrespondenceTaskId, setExpandedCorrespondenceTaskId] = useState<string | null>(null);
    const sortedTasks = filterCivilLawsuitVisibleTasks(tasks).sort((a, b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1));

    const handleTaskActivate = (task: Task) => {
        if (readOnly) return;
        if (isAppealBriefTask(task) && !task.isCompleted) {
            setExpandedAppealTaskId((prev) => (prev === task.id ? null : task.id));
            return;
        }
        if (isCorrespondenceTask(task) && !task.isCompleted) {
            setExpandedCorrespondenceTaskId((prev) => (prev === task.id ? null : task.id));
            return;
        }
        onToggleTask(task.id);
    };

    const isPearl = visualVariant === 'personal-pearl';
    const isPersonal = visualVariant === 'personal' || isPearl;

    const pendingCount = sortedTasks.filter((t) => !t.isCompleted).length;
    const completedCount = sortedTasks.length - pendingCount;

    return (
        <div className={isPearl ? '' : 'mb-2'}>
            {!isPearl ? (
            <div className={`flex items-center justify-between rounded-xl border px-3 py-2 mb-2 ${isPersonal ? 'border-white/[0.07] bg-[#141214]' : 'border-[#E6C673]/14 bg-[radial-gradient(circle_at_top,rgba(230,198,115,0.06),transparent_42%),linear-gradient(180deg,rgba(22,28,42,0.96),rgba(12,16,28,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'}`} dir="rtl">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${isPersonal ? 'bg-[#C4A574]/10 border-[#C4A574]/22' : 'bg-[#E6C673]/10 border-[#E6C673]/22'}`}>
                        <CheckSquare size={13} className={isPersonal ? 'text-[#C4A574]' : 'text-[#E6C673]'} />
                    </div>
                    <div className="min-w-0">
                        <h3 className={`text-[11px] font-bold leading-tight ${isPersonal ? 'text-[#C4A574]' : 'text-[#E6C673]'}`}>
                            المهام الإدارية
                        </h3>
                        {sortedTasks.length > 0 ? (
                            <p className="text-[9px] text-white/40 mt-0.5 tabular-nums">
                                {pendingCount} قيد التنفيذ
                                {completedCount > 0 ? ` · ${completedCount} منجزة` : ''}
                            </p>
                        ) : (
                            <p className="text-[9px] text-white/35 mt-0.5">لا مهام — اضغط + للإضافة</p>
                        )}
                    </div>
                </div>
                {!readOnly ? (
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.taskAdd}
                    onClick={onAddTask}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-[#E6C673]/20 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/18 hover:border-[#E6C673]/30 transition-colors shrink-0"
                    title="إضافة مهمة جديدة"
                    aria-label="إضافة مهمة جديدة"
                >
                    <Plus size={15} />
                </button>
                ) : null}
            </div>
            ) : null}

            <div className="space-y-1.5 relative">
                <AnimatePresence>
                    {sortedTasks.length === 0 ? null : (
                        sortedTasks.map((task, idx) => {
                            const appealTask = isAppealBriefTask(task);
                            const correspondenceTask = isCorrespondenceTask(task);
                            const appealExpanded =
                                appealTask && !task.isCompleted && expandedAppealTaskId === task.id;
                            const correspondenceExpanded =
                                correspondenceTask &&
                                !task.isCompleted &&
                                expandedCorrespondenceTaskId === task.id;

                            return (
                                <motion.div
                                    key={task.id}
                                    data-testid={CIVIL_LAWSUIT_TEST_IDS.taskRow(task.id)}
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={`flex items-start gap-3 ${isPearl ? 'py-1.5' : 'py-2.5 px-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:border-[#E6C673]/12 hover:bg-white/[0.035] transition-colors'} group ${idx !== sortedTasks.length - 1 && isPearl ? `border-b ${isPearl ? 'border-[#C9B89A]/08' : ''}` : ''}`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleTaskActivate(task)}
                                        disabled={readOnly}
                                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all mt-0.5 shrink-0 ${
                                            readOnly ? 'cursor-default opacity-80' : ''
                                        } ${
                                            task.isCompleted
                                                ? isPearl
                                                    ? 'bg-[#C9B89A] border-[#C9B89A] text-[#131211]'
                                                    : 'bg-[#E6C673] border-[#E6C673] text-black shadow-[0_0_10px_rgba(230,198,115,0.4)]'
                                                : appealTask
                                                  ? appealExpanded
                                                      ? 'border-[#E6C673] bg-[#E6C673]/20 text-[#E6C673]'
                                                      : 'border-[#E6C673]/40 hover:border-[#E6C673]/70 bg-transparent'
                                                  : correspondenceTask
                                                    ? correspondenceExpanded
                                                        ? 'border-amber-400/50 bg-amber-400/15 text-amber-300'
                                                        : 'border-amber-400/30 hover:border-amber-400/50 bg-transparent'
                                                    : isPearl
                                                      ? 'border-[#C9B89A]/35 hover:border-[#C9B89A]/60 bg-transparent'
                                                      : 'border-white/20 hover:border-[#E6C673]/50 bg-transparent'
                                        }`}
                                    >
                                        {task.isCompleted ? <Check size={10} strokeWidth={3} /> : null}
                                    </button>

                                    <div
                                        className={`flex-1 transition-all ${task.isCompleted ? 'opacity-30' : 'opacity-90'}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                (appealTask || correspondenceTask) &&
                                                !task.isCompleted &&
                                                handleTaskActivate(task)
                                            }
                                            className={`text-right w-full ${
                                                (appealTask || correspondenceTask) && !task.isCompleted
                                                    ? 'cursor-pointer'
                                                    : 'cursor-default'
                                            }`}
                                        >
                                            <p
                                                className={`${isPearl ? 'text-[11px]' : 'text-xs'} font-medium leading-snug ${task.isCompleted ? 'line-through decoration-white/20' : isPearl ? 'text-[#FFFEF9]' : 'text-white'}`}
                                            >
                                                {task.title}
                                            </p>
                                        </button>
                                        {task.dueDate && !task.isCompleted ? (
                                            <span className="text-[9px] text-[#E6C673]/60 flex items-center gap-1 mt-1 font-mono">
                                                <Clock size={8} /> {task.dueDate}
                                            </span>
                                        ) : null}

                                        {appealTask && onAppealBriefFile && onAppealBriefOutcome && !readOnly
                                            ? (appealExpanded || task.isCompleted || task.appealBriefFiled) && (
                                                  <AppealBriefPanel
                                                      task={task}
                                                      onFileBrief={onAppealBriefFile}
                                                      onRecordOutcome={onAppealBriefOutcome}
                                                  />
                                              )
                                            : null}
                                        {correspondenceTask && onCorrespondenceResponse && !readOnly
                                            ? (correspondenceExpanded ||
                                                  task.isCompleted ||
                                                  task.correspondenceResponseReceived !== null) && (
                                                  <CorrespondencePanel
                                                      task={task}
                                                      onRecordResponse={onCorrespondenceResponse}
                                                  />
                                              )
                                            : null}
                                    </div>

                                    {!readOnly ? (
                                    <button
                                        type="button"
                                        onClick={() => onEditTask(task)}
                                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-white/35 hover:text-[#E6C673] hover:bg-[#E6C673]/10 border border-transparent hover:border-[#E6C673]/20 transition-colors shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                                        title="تعديل المهمة"
                                        aria-label="تعديل المهمة"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    ) : null}
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
});
