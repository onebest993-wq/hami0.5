import React from 'react';
import { motion } from 'motion/react';
import type { Dispatch, SetStateAction } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    findApprovedBreakInventoryNeedingLedger,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { ExecutionTasksSection } from './ExecutionTasksSection';

type CaseNoteLogRow = NonNullable<ExecutionFile['caseNotesLog']>[number];

export interface ExecutionNotesAndAppointmentModalsProps {
    showNotesModal: boolean;
    setShowNotesModal: (show: boolean) => void;
    setNoteTitle: Dispatch<SetStateAction<string>>;
    setNoteBody: Dispatch<SetStateAction<string>>;
    setIsTask: Dispatch<SetStateAction<boolean>>;
    setTaskDueDate: Dispatch<SetStateAction<string>>;
    setTaskStatus: Dispatch<SetStateAction<'pending' | 'done'>>;
    setEditingTaskId: Dispatch<SetStateAction<string | null>>;
    setSavedNotesView: Dispatch<SetStateAction<'notes' | 'tasks_done'>>;
    moveCaseNoteToTrash: (id: string) => void;
    savedNotesSplit: { notes: CaseNoteLogRow[]; doneTasks: CaseNoteLogRow[] };
    savedNotesView: 'notes' | 'tasks_done';

    decisionsStorageExecutionId: string;

    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info'
    ) => void;

    noteTitle: string;
    noteBody: string;
    isTask: boolean;
    editingTaskId: string | null;
    handleSaveNote: () => void;

    showAppointmentModal: boolean;
    setShowAppointmentModal: (show: boolean) => void;
    setEditingAppointmentId: Dispatch<SetStateAction<string | null>>;
    setAppointmentPurpose: Dispatch<SetStateAction<string>>;
    setAppointmentDateOnly: Dispatch<SetStateAction<string>>;
    setAppointmentTimeOptional: Dispatch<SetStateAction<string>>;
    editingAppointmentId: string | null;
    appointmentPurpose: string;
    appointmentDateOnly: string;
    handleSaveAppointment: () => void;
    timelineEvents: TimelineEvent[];
    todayYmd: string;
    moveTimelineEventToTrash: (ev: TimelineEvent) => void;

    /** Task Management */
    caseTasksPending: NonNullable<ExecutionFile['caseTasksPending']>;
    handleSaveTask: (taskData: { title: string; body: string; dueDate: string; steps?: any[] }) => void;
    handleUpdateTask: (taskId: string, updates: Partial<any>) => void;
    handleDeleteTask: (taskId: string) => void;
    handleCompleteTask: (taskId: string) => void;
    handleAddTimelineEvent: (event: { title: string; body?: string }) => void;
}

function ymdOfAppointment(ev: TimelineEvent): string {
    const raw = String(ev?.date || '').trim();
    const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
    return m ? m[0] : '';
}

function titleOfAppointment(ev: TimelineEvent): string {
    const t = String(ev?.title || '').trim();
    return t.replace(/^📅\s*/, '').trim() || 'موعد';
}

export const ExecutionNotesAndAppointmentModals: React.FC<
    ExecutionNotesAndAppointmentModalsProps
> = ({
    showNotesModal,
    setShowNotesModal,
    setNoteTitle,
    setNoteBody,
    setIsTask,
    setTaskDueDate,
    setTaskStatus,
    setEditingTaskId,
    setSavedNotesView,
    moveCaseNoteToTrash,
    savedNotesSplit,
    savedNotesView,
    decisionsStorageExecutionId,
    showToast,
    noteTitle,
    noteBody,
    isTask,
    editingTaskId,
    handleSaveNote,
    showAppointmentModal,
    setShowAppointmentModal,
    setEditingAppointmentId,
    setAppointmentPurpose,
    setAppointmentDateOnly,
    setAppointmentTimeOptional,
    editingAppointmentId,
    appointmentPurpose,
    appointmentDateOnly,
    handleSaveAppointment,
    timelineEvents,
    todayYmd,
    moveTimelineEventToTrash,
    caseTasksPending,
    handleSaveTask,
    handleUpdateTask,
    handleDeleteTask,
    handleCompleteTask,
    handleAddTimelineEvent,
}) => {
    return (
        <>
            {/* 🆕 V16: HYBRID NOTES/TASK ENGINE MODAL */}
            {showNotesModal && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="backdrop-blur-3xl bg-slate-900/40 border border-amber-500/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl shadow-amber-500/10 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                                سجل الملاحظات والمهام
                            </h3>
                            <button type="button"
                                onClick={() => {
                                    setShowNotesModal(false);
                                    setNoteTitle('');
                                    setNoteBody('');
                                    setIsTask(false);
                                    setTaskDueDate('');
                                    setTaskStatus('pending');
                                    setEditingTaskId(null);
                                    setSavedNotesView('notes');
                                }}
                                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <ExecutionTasksSection
                            tasks={caseTasksPending as any[]}
                            onSaveTask={handleSaveTask as any}
                            onUpdateTask={handleUpdateTask as any}
                            onDeleteTask={handleDeleteTask as any}
                            onCompleteTask={handleCompleteTask as any}
                            onAddTimelineEvent={handleAddTimelineEvent as any}
                        />

                        {(savedNotesSplit.notes.length > 0 || savedNotesSplit.doneTasks.length > 0) && (
                            <div className="mb-4 max-h-52 overflow-y-auto space-y-2 rounded-2xl border border-amber-500/15 bg-slate-900/30 p-3">
                                <div className="flex items-center justify-between gap-2" dir="rtl">
                                    <p className="text-amber-400/90 text-xs font-bold text-right">المحفوظات</p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setSavedNotesView('notes')}
                                            className={`rounded-xl border px-2 py-1 text-[10px] font-black transition-all ${
                                                savedNotesView === 'notes'
                                                    ? 'border-white/15 bg-white/10 text-white'
                                                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                                            }`}
                                        >
                                            ملاحظات ({savedNotesSplit.notes.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSavedNotesView('tasks_done')}
                                            className={`rounded-xl border px-2 py-1 text-[10px] font-black transition-all ${
                                                savedNotesView === 'tasks_done'
                                                    ? 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100'
                                                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                                            }`}
                                        >
                                            مهام منجزة ({savedNotesSplit.doneTasks.length})
                                        </button>
                                    </div>
                                </div>
                                {(savedNotesView === 'notes' ? savedNotesSplit.notes : savedNotesSplit.doneTasks).map(
                                    (n) => (
                                        <div
                                            key={n.id}
                                            className={`flex items-start gap-2 border-b border-slate-700/30 pb-2 text-right last:border-0 last:pb-0 ${
                                                savedNotesView === 'tasks_done'
                                                    ? 'bg-emerald-500/[0.02] rounded-xl px-2 py-1'
                                                    : ''
                                            }`}
                                            dir="rtl"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white text-xs font-semibold break-words">{n.title}</p>
                                                <p className="mt-0.5 text-gray-500 text-[10px] leading-relaxed whitespace-pre-line break-words">
                                                    {n.body}
                                                </p>
                                            </div>
                                            {(() => {
                                                const isInventoryNote =
                                                    String(n.title || '').trim() ===
                                                    'جرد الأثاث — كسر الأقفال والجرد';
                                                if (!isInventoryNote) return null;
                                                const hit = findApprovedBreakInventoryNeedingLedger(
                                                    decisionsStorageExecutionId
                                                );
                                                if (!hit) return null;
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const ts = new Date().toISOString();
                                                            patchExecutorDecisionRow(
                                                                decisionsStorageExecutionId,
                                                                hit.decisionId,
                                                                {
                                                                    breakInventoryFurnitureFinalizedAt: ts,
                                                                }
                                                            );
                                                            showToast('تم إنهاء الجرد وإغلاق الطلب', 'success');
                                                        }}
                                                        className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-900/25 px-2 py-1 text-[10px] font-bold text-emerald-100 hover:bg-emerald-900/35"
                                                        title="إنهاء الجرد"
                                                    >
                                                        تم الإنهاء
                                                    </button>
                                                );
                                            })()}
                                            <button
                                                type="button"
                                                onClick={() => moveCaseNoteToTrash(n.id)}
                                                className="shrink-0 rounded-lg border border-rose-500/25 p-1 text-rose-300 hover:bg-rose-950/40"
                                                title="نقل إلى السلة"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {/* Input A: Note Title */}
                        <div className="mb-4">
                            <label className="text-gray-400 text-xs mb-2 block">
                                {isTask ? 'عنوان المهمة' : 'عنوان الملاحظة'}
                            </label>
                            <input
                                type="text"
                                value={noteTitle}
                                onChange={(e) => setNoteTitle(e.target.value)}
                                className="w-full backdrop-blur-xl bg-slate-800/30 border border-amber-500/20 rounded-2xl p-3 text-white focus:outline-none focus:border-amber-500/50 transition-all"
                            />
                        </div>

                        {/* Input B: Note Body */}
                        <div className="mb-5">
                            <label className="text-gray-400 text-xs mb-2 block">
                                {isTask ? 'تفاصيل المهمة' : 'تفاصيل الملاحظة'}
                            </label>
                            <textarea
                                value={noteBody}
                                onChange={(e) => setNoteBody(e.target.value)}
                                placeholder={isTask ? 'اكتب تفاصيل المهمة هنا...' : 'اكتب تفاصيل الملاحظة هنا...'}
                                className="w-full backdrop-blur-xl bg-slate-800/30 border border-amber-500/20 rounded-2xl p-4 text-white h-32 resize-none focus:outline-none focus:border-amber-500/50 transition-all"
                            />
                        </div>

                        {/* Save Button */}
                        <button type="button"
                            onClick={handleSaveNote}
                            className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
                        >
                            📝 حفظ الملاحظة
                        </button>
                    </motion.div>
                </div>
            )}

            {showAppointmentModal && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="backdrop-blur-3xl bg-slate-900/40 border border-indigo-500/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl shadow-indigo-500/10"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent">
                                {editingAppointmentId ? 'تعديل موعد' : 'إضافة موعد'}
                            </h3>
                            <button type="button"
                                onClick={() => {
                                    setShowAppointmentModal(false);
                                    setEditingAppointmentId(null);
                                    setAppointmentPurpose('');
                                    setAppointmentDateOnly('');
                                    setAppointmentTimeOptional('');
                                }}
                                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">الغرض من الموعد</label>
                                <input
                                    type="text"
                                    value={appointmentPurpose}
                                    onChange={(e) => setAppointmentPurpose(e.target.value)}
                                    className="w-full backdrop-blur-xl bg-slate-800/30 border border-indigo-500/20 rounded-2xl p-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">
                                    التاريخ <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={appointmentDateOnly}
                                    onChange={(e) => setAppointmentDateOnly(e.target.value)}
                                    className="w-full backdrop-blur-xl bg-slate-800/30 border border-indigo-500/20 rounded-2xl p-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                    style={{ direction: 'ltr', textAlign: 'right' }}
                                />
                            </div>
                        </div>
                        <button type="button"
                            onClick={handleSaveAppointment}
                            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 mt-4"
                        >
                            {editingAppointmentId ? 'حفظ التعديل' : 'حفظ الموعد'}
                        </button>

                        {(() => {
                            const today = todayYmd;
                            const appts = (timelineEvents || []).filter(
                                (ev) =>
                                    String(ev.type || '') === 'appointment' && !Boolean(ev.trashedAt)
                            );
                            const active = appts.filter((ev) => {
                                const y = ymdOfAppointment(ev);
                                return y && y >= today;
                            });
                            const ended = appts.filter((ev) => {
                                const y = ymdOfAppointment(ev);
                                return y && y < today;
                            });

                            if (active.length === 0 && ended.length === 0) return null;

                            const renderList = (items: TimelineEvent[], allowEdit: boolean) => (
                                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                    {items.slice(0, 50).map((ev) => {
                                        const y = ymdOfAppointment(ev) || '—';
                                        return (
                                            <div
                                                key={String(ev.id)}
                                                className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                                                dir="rtl"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-white text-xs font-bold break-words">
                                                            {titleOfAppointment(ev)}
                                                        </p>
                                                        <p className="mt-1 text-[10px] text-slate-400 font-mono tabular-nums">
                                                            {y}
                                                        </p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-1">
                                                        {allowEdit ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingAppointmentId(String(ev.id));
                                                                    setAppointmentPurpose(titleOfAppointment(ev));
                                                                    setAppointmentDateOnly(ymdOfAppointment(ev));
                                                                    setAppointmentTimeOptional('');
                                                                }}
                                                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-400/35 text-indigo-200 transition hover:bg-indigo-900/35"
                                                                title="تعديل الموعد"
                                                            >
                                                                <Pencil size={12} />
                                                            </button>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            onClick={() => moveTimelineEventToTrash(ev)}
                                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-500/35 text-rose-300 transition hover:bg-rose-950/45"
                                                            title="حذف الموعد"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );

                            return (
                                <div className="mt-5 space-y-4" dir="rtl">
                                    <div className="h-px bg-white/10" />
                                    <div className="space-y-2">
                                        <p className="text-xs font-black text-slate-200">سجل المواعيد النشطة</p>
                                        {active.length ? (
                                            renderList(active, true)
                                        ) : (
                                            <p className="text-[11px] text-slate-500">لا توجد مواعيد نشطة.</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-black text-slate-200">سجل المواعيد المنتهية</p>
                                        {ended.length ? (
                                            renderList(ended, false)
                                        ) : (
                                            <p className="text-[11px] text-slate-500">لا توجد مواعيد منتهية.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </motion.div>
                </div>
            )}
        </>
    );
};
