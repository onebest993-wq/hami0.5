import React, { useState, useCallback } from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { ListChecks } from '@/app/components/ui/icons/ListChecks';
import { ntm } from './notesTasksModalUi';
import { ExecutionTaskComposerForm } from './ExecutionTaskComposerForm';
import { ExecutionActiveTaskCard } from './ExecutionActiveTaskCard';
import { ExecutionDoneTasksPanel } from './ExecutionDoneTasksPanel';

import {
    type ExecutionTask,
    type ExecutionTasksSectionProps,
    type TaskStep,
    genStepId,
    normalizeSteps,
} from './executionTasksSection.types';

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
                <ExecutionDoneTasksPanel doneTasks={doneTasks} />
            ) : (
                <>
                    {showForm ? (
                        <ExecutionTaskComposerForm
                            title={title}
                            body={body}
                            dueDate={dueDate}
                            steps={steps}
                            editingId={editingId}
                            onTitleChange={setTitle}
                            onBodyChange={setBody}
                            onDueDateChange={setDueDate}
                            onAddStep={handleAddStep}
                            onRemoveStep={handleRemoveStep}
                            onStepChange={handleStepChange}
                            onSubmit={editingId ? handleUpdate : handleSave}
                            onCancel={resetForm}
                        />
                    ) : null}

                    {activeTasks.length > 0 ? (
                        <div className="space-y-2">
                            {activeTasks.map((task) => (
                                <ExecutionActiveTaskCard
                                    key={task.id}
                                    task={task}
                                    isExpanded={Boolean(expandedTasks[task.id])}
                                    onToggleExpanded={() => handleToggleExpanded(task.id)}
                                    onTogglePin={() => onToggleTaskPin(task.id)}
                                    onComplete={() => handleComplete(task.id)}
                                    onEdit={() => handleEdit(task)}
                                    onDelete={() => handleDelete(task.id, task.title)}
                                    onToggleAllStepsDone={(currentSteps) =>
                                        toggleAllStepsDone(task.id, currentSteps)
                                    }
                                    onMarkStepDone={(stepId) =>
                                        handleToggleStepStatus(task.id, stepId, 'done')
                                    }
                                    onMarkStepFailed={(stepId) =>
                                        handleToggleStepStatus(task.id, stepId, 'failed')
                                    }
                                />
                            ))}
                        </div>
                    ) : null}

                    {activeTasks.length === 0 && !showForm ? (
                        <p className="py-1 text-center text-[11px] text-slate-500">
                            لا مهام نشطة — أضف مهمة
                        </p>
                    ) : null}
                </>
            )}
        </div>
    );
};
