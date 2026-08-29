import React from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { XCircle } from '@/app/components/ui/icons/XCircle';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { ntm } from './notesTasksModalUi';
import { EXEC_MODAL_TOUCH_TARGET } from '../executionModalMobileShell';
import type { TaskStep } from './executionTasksSection.types';

export type ExecutionTaskComposerFormProps = {
    title: string;
    body: string;
    dueDate: string;
    steps: TaskStep[];
    editingId: string | null;
    onTitleChange: (value: string) => void;
    onBodyChange: (value: string) => void;
    onDueDateChange: (value: string) => void;
    onAddStep: () => void;
    onRemoveStep: (stepId: string) => void;
    onStepChange: (stepId: string, field: keyof TaskStep, value: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
};

export const ExecutionTaskComposerForm: React.FC<ExecutionTaskComposerFormProps> = ({
    title,
    body,
    dueDate,
    steps,
    editingId,
    onTitleChange,
    onBodyChange,
    onDueDateChange,
    onAddStep,
    onRemoveStep,
    onStepChange,
    onSubmit,
    onCancel,
}) => (
    <div className={ntm.section}>
        <div className="space-y-3">
            <div>
                <label className={ntm.label}>عنوان المهمة</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="عنوان المهمة"
                    className={ntm.field}
                />
            </div>
            <div>
                <label className={ntm.label}>تفاصيل المهمة (اختياري)</label>
                <textarea
                    value={body}
                    onChange={(e) => onBodyChange(e.target.value)}
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
                        onClick={onAddStep}
                        className={`flex items-center gap-1 rounded-lg border border-amber-500/25 bg-amber-500/8 px-2 py-1 text-[10px] font-bold text-amber-100 hover:bg-amber-500/15 ${EXEC_MODAL_TOUCH_TARGET}`}
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
                                onChange={(e) => onStepChange(step.id, 'text', e.target.value)}
                                placeholder={`الخطوة ${idx + 1}`}
                                className={ntm.fieldSm}
                            />
                            <button
                                type="button"
                                onClick={() => onRemoveStep(step.id)}
                                className={`shrink-0 rounded-lg border border-rose-500/25 p-1.5 text-rose-300 hover:bg-rose-950/40 ${EXEC_MODAL_TOUCH_TARGET}`}
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
                        onChange={(e) => onDueDateChange(e.target.value)}
                        className={`${ntm.field} flex-1 text-[11px]`}
                        style={{ direction: 'ltr' }}
                    />
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={!title.trim()}
                    className={ntm.btnPrimary}
                >
                    {editingId ? 'حفظ التعديل' : 'حفظ المهمة'}
                </button>
                <button type="button" onClick={onCancel} className={ntm.btnGhost}>
                    إلغاء
                </button>
            </div>
        </div>
    </div>
);
