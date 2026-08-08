import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Plus, Trash2, Pencil, CheckCircle, XCircle,
    Clock, ChevronDown, ChevronUp, Calendar, ListChecks,
    Pin
} from '@/app/components/ui/lucideIcons';
import { formatArTaskDate, ntm } from './notesTasksModalUi';
import { TaskStepDisplayRow } from './TaskStepDisplayRow';

type TaskStep = {
    id: string;
    text: string;
    order: number;
    dueDate?: string;
    status: 'pending' | 'done' | 'failed';
};

type ExecutionTask = {
    id: string;
    title: string;
    body: string;
    dueDate: string;
    createdAt: string;
    trashedAt?: string;
    pinned?: boolean;
    steps?: TaskStep[];
};

type DoneTaskNote = {
    id: string;
    title: string;
    body: string;
    createdAt: string;
};

interface ExecutionTasksSectionProps {
    tasks: ExecutionTask[];
    onSaveTask: (task: { title: string; body: string; dueDate: string; steps: TaskStep[] }) => void;
    onUpdateTask: (id: string, updates: Partial<ExecutionTask>) => void;
    onDeleteTask: (id: string) => void;
    onCompleteTask: (id: string) => void;
    onAddTimelineEvent: (event: { title: string; body?: string }) => void;
    onToggleTaskPin: (id: string) => void;
    doneTasks: DoneTaskNote[];
    showDoneTasksPanel: boolean;
    setShowDoneTasksPanel: (show: boolean) => void;
}

let stepCounter = 0;
const genStepId = () => `step_${Date.now()}_${++stepCounter}`;

function normalizeSteps(steps: TaskStep[]): TaskStep[] {
    return steps
        .filter((s) => s.text.trim())
        .map((s, i) => ({
            ...s,
            order: i + 1,
            dueDate: s.dueDate?.trim() ? s.dueDate.trim() : undefined,
        }));
}

export const ExecutionTasksSection: React.FC<ExecutionTasksSectionProps> = ({
    tasks, onSaveTask, onUpdateTask, onDeleteTask,
    onCompleteTask, onAddTimelineEvent, onToggleTaskPin,
    doneTasks, showDoneTasksPanel, setShowDoneTasksPanel,
}) => {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [steps, setSteps] = useState<TaskStep[]>([]);
    const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

    const activeTasks = tasks.filter(t => !t.trashedAt && !t.pinned);

    const resetForm = useCallback(() => {
        setShowForm(false);
        setEditingId(null);
        setTitle('');
        setBody('');
        setDueDate('');
        setSteps([]);
    }, []);

    const handleAddStep = useCallback(() => {
        setSteps(prev => [...prev, {
            id: genStepId(), text: '', order: prev.length + 1,
            status: 'pending'
        }]);
    }, []);

    const handleRemoveStep = useCallback((stepId: string) => {
        setSteps(prev => prev.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i + 1 })));
    }, []);

    const handleStepChange = useCallback((stepId: string, field: keyof TaskStep, value: string) => {
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, [field]: value } : s));
    }, []);

    const handleSave = useCallback(() => {
        if (!title.trim()) return;
        onSaveTask({ title: title.trim(), body: body.trim(), dueDate, steps: normalizeSteps(steps) });
        onAddTimelineEvent({
            title: `📌 مهمة جديدة: ${title.trim()}`,
            body: body.trim() || undefined
        });
        resetForm();
    }, [title, body, dueDate, steps, onSaveTask, onAddTimelineEvent, resetForm]);

    const handleEdit = useCallback((task: ExecutionTask) => {
        setEditingId(task.id);
        setTitle(task.title);
        setBody(task.body || '');
        setDueDate(task.dueDate || '');
        setSteps(task.steps?.map(s => ({ ...s })) || []);
        setShowForm(true);
        setShowDoneTasksPanel(false);
    }, [setShowDoneTasksPanel]);

    const handleUpdate = useCallback(() => {
        if (!editingId || !title.trim()) return;
        onUpdateTask(editingId, {
            title: title.trim(), body: body.trim(), dueDate, steps: normalizeSteps(steps)
        });
        onAddTimelineEvent({
            title: `✏️ تعديل مهمة: ${title.trim()}`,
        });
        resetForm();
    }, [editingId, title, body, dueDate, steps, onUpdateTask, onAddTimelineEvent, resetForm]);

    const handleDelete = useCallback((taskId: string, taskTitle: string) => {
        onDeleteTask(taskId);
        onAddTimelineEvent({
            title: `🗑️ حذف مهمة: ${taskTitle}`,
        });
    }, [onDeleteTask, onAddTimelineEvent]);

    const handleComplete = useCallback((taskId: string) => {
        onCompleteTask(taskId);
    }, [onCompleteTask]);

    const handleToggleStepStatus = useCallback((taskId: string, stepId: string, status: 'done' | 'failed') => {
        const task = activeTasks.find(t => t.id === taskId);
        if (!task) return;
        const updatedSteps = task.steps?.map(s =>
            s.id === stepId ? { ...s, status } : s
        ) || [];
        onUpdateTask(taskId, { steps: updatedSteps });
    }, [activeTasks, onUpdateTask]);

    const handleToggleExpanded = useCallback((taskId: string) => {
        setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    }, []);

    const toggleAllStepsDone = useCallback((taskId: string, currentSteps?: TaskStep[]) => {
        if (!currentSteps || currentSteps.length === 0) return;
        const allDone = currentSteps.every(s => s.status === 'done');
        const updated = currentSteps.map(s => ({
            ...s, status: allDone ? 'pending' : 'done' as 'pending' | 'done'
        }));
        onUpdateTask(taskId, { steps: updated });
    }, [onUpdateTask]);

    return (
        <div className="space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={ntm.iconWrap}>
                        <ListChecks size={16} className="text-amber-300" />
                    </div>
                    <div>
                        <span className="text-sm font-black text-white">المهام</span>
                        {activeTasks.length > 0 && !showDoneTasksPanel && (
                            <span className="mr-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-100">
                                {activeTasks.length}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => {
                            setShowDoneTasksPanel(!showDoneTasksPanel);
                            if (!showDoneTasksPanel) resetForm();
                        }}
                        className={showDoneTasksPanel ? ntm.btnChip : ntm.btnChipMuted}
                    >
                        مهام منجزة ({doneTasks.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShowDoneTasksPanel(false);
                            resetForm();
                            setShowForm(true);
                        }}
                        className={`${ntm.btnChip} flex items-center gap-1.5`}
                    >
                        <Plus size={14} />
                        إضافة مهمة
                    </button>
                </div>
            </div>

            {showDoneTasksPanel ? (
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-amber-500/15 bg-[#0A0F1C]/30 p-3">
                    {doneTasks.length === 0 ? (
                        <p className="text-center text-[11px] text-slate-500">لا توجد مهام منجزة بعد.</p>
                    ) : (
                        doneTasks.map((t) => (
                            <div
                                key={t.id}
                                className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] px-2.5 py-2"
                            >
                                <p className="text-[11px] font-bold text-amber-50 break-words">{t.title}</p>
                                {t.body ? (
                                    <p className="mt-0.5 text-[10px] text-slate-400 whitespace-pre-line break-words">
                                        {t.body}
                                    </p>
                                ) : null}
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <>
                    <AnimatePresence>
                        {showForm && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={ntm.section}
                            >
                                <div className="space-y-3">
                                    <div>
                                        <label className={ntm.label}>عنوان المهمة</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder="عنوان المهمة"
                                            className={ntm.field}
                                        />
                                    </div>
                                    <div>
                                        <label className={ntm.label}>تفاصيل المهمة (اختياري)</label>
                                        <textarea
                                            value={body}
                                            onChange={e => setBody(e.target.value)}
                                            placeholder="تفاصيل المهمة..."
                                            rows={2}
                                            className={ntm.textarea}
                                        />
                                    </div>

                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className={ntm.label}>خطوات المهمة (اختياري)</span>
                                            <button
                                                type="button"
                                                onClick={handleAddStep}
                                                className="flex items-center gap-1 rounded-lg border border-amber-500/25 bg-amber-500/8 px-2 py-1 text-[10px] font-bold text-amber-100 hover:bg-amber-500/15"
                                            >
                                                <Plus size={10} /> إضافة خطوة
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {steps.map((step, idx) => (
                                                <div
                                                    key={step.id}
                                                    className="flex items-center gap-2 rounded-xl border border-white/8 bg-[#0A0F1C]/20 p-2"
                                                >
                                                        <span className="shrink-0 w-4 text-center text-[10px] font-bold text-slate-500">
                                                            {idx + 1}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={step.text}
                                                            onChange={e =>
                                                                handleStepChange(step.id, 'text', e.target.value)
                                                            }
                                                            placeholder={`الخطوة ${idx + 1}`}
                                                            className={ntm.fieldSm}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveStep(step.id)}
                                                            className="shrink-0 rounded-lg border border-rose-500/25 p-1.5 text-rose-300 hover:bg-rose-950/40"
                                                        >
                                                            <XCircle size={12} />
                                                        </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className={ntm.label}>تاريخ التسليم (اختياري)</label>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="shrink-0 text-amber-300/80" />
                                            <input
                                                type="date"
                                                value={dueDate}
                                                onChange={e => setDueDate(e.target.value)}
                                                className={`${ntm.field} flex-1 text-[11px]`}
                                                style={{ direction: 'ltr' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={editingId ? handleUpdate : handleSave}
                                            disabled={!title.trim()}
                                            className={ntm.btnPrimary}
                                        >
                                            {editingId ? 'حفظ التعديل' : 'حفظ المهمة'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className={ntm.btnGhost}
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {activeTasks.length > 0 && (
                        <div className="space-y-2">
                            {activeTasks.map(task => {
                                const isExpanded = expandedTasks[task.id];
                                const allStepsDone = task.steps?.every(s => s.status === 'done');
                                return (
                                    <motion.div
                                        key={task.id}
                                        className={ntm.card}
                                    >
                                        <div
                                            className="flex cursor-pointer items-center justify-between gap-2 p-3"
                                            onClick={() => handleToggleExpanded(task.id)}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <span className={`text-sm font-bold break-words ${allStepsDone ? 'text-emerald-300' : 'text-white'}`}>
                                                    {task.title}
                                                </span>
                                                {allStepsDone && (
                                                    <span className="mr-2 text-[10px] text-emerald-400">✓ مكتملة</span>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={e => { e.stopPropagation(); onToggleTaskPin(task.id); }}
                                                    className={`rounded-lg border p-1.5 transition-all ${
                                                        task.pinned
                                                            ? 'border-amber-400/35 bg-amber-500/15 text-amber-200'
                                                            : 'border-white/10 text-slate-400 hover:bg-white/5'
                                                    }`}
                                                    title={task.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                                                >
                                                    <Pin size={12} className={task.pinned ? 'fill-current' : undefined} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={e => { e.stopPropagation(); handleComplete(task.id); }}
                                                    className="rounded-lg border border-emerald-400/25 p-1.5 text-emerald-200 hover:bg-emerald-900/40"
                                                    title="إنجاز المهمة"
                                                >
                                                    <CheckCircle size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={e => { e.stopPropagation(); handleEdit(task); }}
                                                    className="rounded-lg border border-amber-400/25 p-1.5 text-amber-100 hover:bg-amber-900/30"
                                                    title="تعديل"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={e => { e.stopPropagation(); handleDelete(task.id, task.title); }}
                                                    className="rounded-lg border border-rose-400/25 p-1.5 text-rose-200 hover:bg-rose-950/40"
                                                    title="حذف"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                                {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="space-y-2 border-t border-white/8 px-3 pb-3 pt-2"
                                                >
                                                    {task.body && (
                                                        <p className="text-[11px] text-slate-300 whitespace-pre-line break-words">{task.body}</p>
                                                    )}
                                                    {task.dueDate ? (
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                            <Clock size={10} className="text-amber-300/70" />
                                                            <span>تاريخ التسليم: {formatArTaskDate(task.dueDate)}</span>
                                                        </div>
                                                    ) : null}
                                                    {task.steps && task.steps.length > 0 && (
                                                        <div>
                                                            <div className="mb-1.5 flex items-center justify-between">
                                                                <span className="text-[10px] font-bold text-slate-400">الخطوات</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); toggleAllStepsDone(task.id, task.steps); }}
                                                                    className="text-[10px] text-amber-200/90 hover:underline"
                                                                >
                                                                    {task.steps.every(s => s.status === 'done') ? 'إعادة تعيين' : 'إنجاز الكل'}
                                                                </button>
                                                            </div>
                                                            <div className="space-y-1">
                                                                {task.steps.map((step) => (
                                                                    <TaskStepDisplayRow
                                                                        key={step.id}
                                                                        step={step}
                                                                        stopPropagation
                                                                        onMarkDone={() =>
                                                                            handleToggleStepStatus(
                                                                                task.id,
                                                                                step.id,
                                                                                'done'
                                                                            )
                                                                        }
                                                                        onMarkFailed={() =>
                                                                            handleToggleStepStatus(
                                                                                task.id,
                                                                                step.id,
                                                                                'failed'
                                                                            )
                                                                        }
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="pt-1 text-[9px] text-slate-600">
                                                        تاريخ الإنشاء: {formatArTaskDate(task.createdAt)}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {activeTasks.length === 0 && !showForm && (
                        <p className="py-1 text-center text-[11px] text-slate-500">
                            لا مهام نشطة — أضف مهمة
                        </p>
                    )}
                </>
            )}
        </div>
    );
};
