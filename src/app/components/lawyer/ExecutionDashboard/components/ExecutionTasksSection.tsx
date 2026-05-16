import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Plus, Trash2, Pencil, CheckCircle, XCircle,
    Clock, ChevronDown, ChevronUp, Save, Calendar, ListChecks,
    AlertCircle
} from 'lucide-react';

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
    steps?: TaskStep[];
};

interface ExecutionTasksSectionProps {
    tasks: ExecutionTask[];
    onSaveTask: (task: { title: string; body: string; dueDate: string; steps: TaskStep[] }) => void;
    onUpdateTask: (id: string, updates: Partial<ExecutionTask>) => void;
    onDeleteTask: (id: string) => void;
    onCompleteTask: (id: string) => void;
    onAddTimelineEvent: (event: { title: string; body?: string }) => void;
}

let stepCounter = 0;
const genStepId = () => `step_${Date.now()}_${++stepCounter}`;

export const ExecutionTasksSection: React.FC<ExecutionTasksSectionProps> = ({
    tasks, onSaveTask, onUpdateTask, onDeleteTask,
    onCompleteTask, onAddTimelineEvent
}) => {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [steps, setSteps] = useState<TaskStep[]>([]);
    const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

    const activeTasks = tasks.filter(t => !t.trashedAt);

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
            dueDate: '', status: 'pending'
        }]);
    }, []);

    const handleRemoveStep = useCallback((stepId: string) => {
        setSteps(prev => prev.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i + 1 })));
    }, []);

    const handleStepChange = useCallback((stepId: string, field: keyof TaskStep, value: any) => {
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, [field]: value } : s));
    }, []);

    const handleSave = useCallback(() => {
        if (!title.trim()) return;
        const cleanSteps = steps.filter(s => s.text.trim());
        onSaveTask({ title: title.trim(), body: body.trim(), dueDate, steps: cleanSteps });
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
    }, []);

    const handleUpdate = useCallback(() => {
        if (!editingId || !title.trim()) return;
        const cleanSteps = steps.filter(s => s.text.trim());
        onUpdateTask(editingId, {
            title: title.trim(), body: body.trim(), dueDate, steps: cleanSteps
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

    const handleComplete = useCallback((taskId: string, taskTitle: string) => {
        onCompleteTask(taskId);
        onAddTimelineEvent({
            title: `✅ إنجاز مهمة: ${taskTitle}`,
        });
    }, [onCompleteTask, onAddTimelineEvent]);

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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between" dir="rtl">
                <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-2xl border border-indigo-500/25 bg-indigo-500/10">
                        <ListChecks size={16} className="text-indigo-300" />
                    </div>
                    <div>
                        <span className="text-sm font-black text-white">المهام</span>
                        {activeTasks.length > 0 && (
                            <span className="mr-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                                {activeTasks.length}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-[11px] font-bold text-indigo-100 transition-all hover:bg-indigo-500/20"
                >
                    <Plus size={14} />
                    إضافة مهمة
                </button>
            </div>

            {/* Task Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden rounded-2xl border border-indigo-500/20 bg-slate-900/60 p-4 backdrop-blur-xl"
                    >
                        <div className="space-y-3" dir="rtl">
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="عنوان المهمة"
                                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:outline-none"
                            />
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                placeholder="تفاصيل المهمة (اختياري)"
                                rows={2}
                                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:outline-none resize-none"
                            />

                            {/* Steps */}
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-300">خطوات المهمة</span>
                                    <button
                                        type="button"
                                        onClick={handleAddStep}
                                        className="flex items-center gap-1 rounded-lg border border-indigo-400/25 bg-indigo-500/8 px-2 py-1 text-[10px] font-bold text-indigo-200 hover:bg-indigo-500/15"
                                    >
                                        <Plus size={10} /> إضافة خطوة
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {steps.map((step, idx) => (
                                        <div key={step.id} className="flex items-center gap-2" dir="rtl">
                                            <span className="shrink-0 text-[10px] font-bold text-slate-500 w-4 text-center">
                                                {idx + 1}
                                            </span>
                                            <input
                                                type="text"
                                                value={step.text}
                                                onChange={e => handleStepChange(step.id, 'text', e.target.value)}
                                                placeholder={`الخطوة ${idx + 1}`}
                                                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 p-1.5 text-[11px] text-white placeholder:text-slate-600 focus:border-amber-400/30 focus:outline-none"
                                            />
                                            <input
                                                type="date"
                                                value={step.dueDate || ''}
                                                onChange={e => handleStepChange(step.id, 'dueDate', e.target.value)}
                                                className="w-[120px] rounded-lg border border-white/10 bg-white/5 p-1.5 text-[11px] text-white focus:border-amber-400/30 focus:outline-none"
                                                style={{ direction: 'ltr' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveStep(step.id)}
                                                className="shrink-0 rounded-lg border border-rose-500/25 p-1 text-rose-300 hover:bg-rose-950/40"
                                            >
                                                <XCircle size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Due Date */}
                            <div className="flex items-center gap-2" dir="rtl">
                                <Calendar size={14} className="text-slate-400 shrink-0" />
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/5 p-2 text-[11px] text-white focus:border-amber-400/30 focus:outline-none"
                                    style={{ direction: 'ltr' }}
                                />
                                <span className="text-[10px] text-slate-400">(تاريخ التسليم اختياري)</span>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2" dir="rtl">
                                <button
                                    type="button"
                                    onClick={editingId ? handleUpdate : handleSave}
                                    disabled={!title.trim()}
                                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-indigo-600 to-indigo-500 px-4 py-2 text-[11px] font-bold text-white transition-all hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40"
                                >
                                    <Save size={14} />
                                    {editingId ? 'حفظ التعديل' : 'حفظ المهمة'}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="rounded-xl border border-white/10 px-4 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/5"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active Tasks */}
            {activeTasks.length > 0 && (
                <div className="space-y-2" dir="rtl">
                    {activeTasks.map(task => {
                        const isExpanded = expandedTasks[task.id];
                        const allStepsDone = task.steps?.every(s => s.status === 'done');
                        return (
                            <motion.div
                                key={task.id}
                                layout
                                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-indigo-400/20"
                            >
                                {/* Task Header */}
                                <div
                                    className="flex items-center justify-between gap-2 p-3 cursor-pointer"
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
                                            onClick={e => { e.stopPropagation(); handleComplete(task.id, task.title); }}
                                            className="rounded-lg border border-emerald-400/25 p-1.5 text-emerald-200 hover:bg-emerald-900/40"
                                            title="إنجاز المهمة"
                                        >
                                            <CheckCircle size={12} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={e => { e.stopPropagation(); handleEdit(task); }}
                                            className="rounded-lg border border-indigo-400/25 p-1.5 text-indigo-200 hover:bg-indigo-900/35"
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

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="border-t border-white/5 px-3 pb-3 pt-2 space-y-2"
                                        >
                                            {task.body && (
                                                <p className="text-[11px] text-slate-300 whitespace-pre-line break-words">{task.body}</p>
                                            )}
                                            {task.dueDate && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                    <Clock size={10} />
                                                    <span>تاريخ التسليم: {new Date(task.dueDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                </div>
                                            )}
                                            {task.steps && task.steps.length > 0 && (
                                                <div>
                                                    <div className="mb-1.5 flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-slate-400">الخطوات</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); toggleAllStepsDone(task.id, task.steps); }}
                                                            className="text-[10px] text-indigo-300 hover:underline"
                                                        >
                                                            {task.steps.every(s => s.status === 'done') ? 'إعادة تعيين' : 'إنجاز الكل'}
                                                        </button>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {task.steps.map(step => (
                                                            <div key={step.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2">
                                                                <span className="shrink-0 text-[10px] font-bold text-slate-500 w-4 text-center">{step.order}</span>
                                                                <span className={`min-w-0 flex-1 text-[11px] break-words ${step.status === 'done' ? 'text-emerald-300 line-through' : step.status === 'failed' ? 'text-rose-300 line-through' : 'text-slate-200'}`}>
                                                                    {step.text}
                                                                </span>
                                                                {step.dueDate && (
                                                                    <span className="shrink-0 text-[9px] text-slate-500">{new Date(step.dueDate).toLocaleDateString('ar-EG')}</span>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); handleToggleStepStatus(task.id, step.id, 'done'); }}
                                                                    className={`rounded p-1 ${step.status === 'done' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500 hover:text-emerald-300'}`}
                                                                >
                                                                    <CheckCircle size={10} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); handleToggleStepStatus(task.id, step.id, 'failed'); }}
                                                                    className={`rounded p-1 ${step.status === 'failed' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-500 hover:text-rose-300'}`}
                                                                >
                                                                    <XCircle size={10} />
                                                                </button>
                                                            </div>
                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="text-[9px] text-slate-600 pt-1">
                                                تاريخ الإنشاء: {new Date(task.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
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
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center" dir="rtl">
                    <AlertCircle size={24} className="mx-auto mb-2 text-slate-500" />
                    <p className="text-[11px] text-slate-400">لا توجد مهام نشطة. أضف مهمة جديدة للمتابعة.</p>
                </div>
            )}
        </div>
    );
};
