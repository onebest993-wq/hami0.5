import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import type { Dispatch, SetStateAction } from 'react';
import { Pencil, Pin, Trash2, X } from 'lucide-react';
import { ExecutionPinnedNotesTray } from './ExecutionPinnedNotesTray';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    findApprovedBreakInventoryNeedingLedger,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { ExecutionTasksSection } from './ExecutionTasksSection';
import { ntm } from './notesTasksModalUi';

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
    toggleCaseNotePin: (id: string) => void;
    toggleCaseTaskPin: (id: string) => void;

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
    savedNotesView: _savedNotesView,
    toggleCaseNotePin,
    toggleCaseTaskPin,
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
    const [showDoneTasksPanel, setShowDoneTasksPanel] = useState(false);

    const pinnedNotes = useMemo(
        () => savedNotesSplit.notes.filter((n) => Boolean(n.pinned)),
        [savedNotesSplit.notes]
    );
    const unpinnedNotes = useMemo(
        () => savedNotesSplit.notes.filter((n) => !n.pinned),
        [savedNotesSplit.notes]
    );
    const pinnedTasks = useMemo(
        () => caseTasksPending.filter((t) => !t.trashedAt && Boolean(t.pinned)),
        [caseTasksPending]
    );

    return (
        <>
            {/* 🆕 V16: HYBRID NOTES/TASK ENGINE MODAL */}
            {showNotesModal && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-amber-500/20 bg-[#0A0F1C]/88 p-6 shadow-2xl shadow-amber-500/10 backdrop-blur-3xl"
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
                                    setShowDoneTasksPanel(false);
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
                            onToggleTaskPin={toggleCaseTaskPin}
                            doneTasks={savedNotesSplit.doneTasks}
                            showDoneTasksPanel={showDoneTasksPanel}
                            setShowDoneTasksPanel={setShowDoneTasksPanel}
                        />

                        <div className="my-5 border-t border-amber-500/15 pt-5" dir="rtl">
                            <p className="mb-3 text-sm font-black text-amber-100/95">الملاحظات</p>
                        {unpinnedNotes.length > 0 && (
                            <div className="mb-4 max-h-44 space-y-2 overflow-y-auto rounded-2xl border border-amber-500/15 bg-[#0A0F1C]/35 p-3">
                                <p className="text-right text-xs font-bold text-amber-300/90">
                                    المحفوظات ({unpinnedNotes.length})
                                </p>
                                {unpinnedNotes.map((n) => (
                                    <div
                                        key={n.id}
                                        className="flex items-start gap-2 border-b border-slate-700/30 pb-2 text-right last:border-0 last:pb-0"
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
                                            onClick={() => toggleCaseNotePin(n.id)}
                                            className={`shrink-0 rounded-lg border p-1 transition-all ${
                                                n.pinned
                                                    ? 'border-amber-400/35 bg-amber-500/15 text-amber-200'
                                                    : 'border-white/10 text-slate-400 hover:bg-white/5'
                                            }`}
                                            title={n.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                                        >
                                            <Pin size={14} className={n.pinned ? 'fill-current' : undefined} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveCaseNoteToTrash(n.id)}
                                            className="shrink-0 rounded-lg border border-rose-500/25 p-1 text-rose-300 hover:bg-rose-950/40"
                                            title="نقل إلى السلة"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className={ntm.label}>عنوان الملاحظة</label>
                            <input
                                type="text"
                                value={noteTitle}
                                onChange={(e) => setNoteTitle(e.target.value)}
                                placeholder="عنوان الملاحظة"
                                className={ntm.field}
                            />
                        </div>

                        <div className="mb-5">
                            <label className={ntm.label}>تفاصيل الملاحظة</label>
                            <textarea
                                value={noteBody}
                                onChange={(e) => setNoteBody(e.target.value)}
                                placeholder="اكتب تفاصيل الملاحظة هنا..."
                                rows={4}
                                className={`${ntm.textarea} min-h-[7rem]`}
                            />
                        </div>

                        <ExecutionPinnedNotesTray
                            variant="modal"
                            pinnedNotes={pinnedNotes}
                            pinnedTasks={pinnedTasks}
                            onToggleNotePin={toggleCaseNotePin}
                            onToggleTaskPin={toggleCaseTaskPin}
                            onTrashNote={moveCaseNoteToTrash}
                        />

                        {/* Save Button */}
                        <button
                            type="button"
                            onClick={handleSaveNote}
                            className={`${ntm.btnPrimary} w-full py-3 text-sm`}
                        >
                            حفظ الملاحظة
                        </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {showAppointmentModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xl">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-amber-500/20 bg-[#0A0F1C]/88 p-6 shadow-2xl shadow-amber-500/10 backdrop-blur-3xl"
                        dir="rtl"
                    >
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                                {editingAppointmentId ? 'تعديل موعد' : 'إضافة موعد'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAppointmentModal(false);
                                    setEditingAppointmentId(null);
                                    setAppointmentPurpose('');
                                    setAppointmentDateOnly('');
                                    setAppointmentTimeOptional('');
                                }}
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className={ntm.label}>الغرض من الموعد</label>
                                <input
                                    type="text"
                                    value={appointmentPurpose}
                                    onChange={(e) => setAppointmentPurpose(e.target.value)}
                                    placeholder="مثال: جلسة متابعة"
                                    className={ntm.field}
                                />
                            </div>
                            <div>
                                <label className={ntm.label}>
                                    التاريخ <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={appointmentDateOnly}
                                    onChange={(e) => setAppointmentDateOnly(e.target.value)}
                                    className={ntm.field}
                                    style={{ direction: 'ltr', textAlign: 'right' }}
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveAppointment}
                            className={`${ntm.btnPrimary} mt-4 w-full py-3 text-sm`}
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

                            const renderList = (items: TimelineEvent[], allowEdit: boolean) => (
                                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                    {items.slice(0, 50).map((ev) => {
                                        const y = ymdOfAppointment(ev) || '—';
                                        return (
                                            <div
                                                key={String(ev.id)}
                                                className="rounded-xl border border-amber-500/12 bg-[#0A0F1C]/35 p-3"
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
                                                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/30 text-amber-100 transition hover:bg-amber-900/30"
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
                                    <div className="h-px bg-amber-500/15" />
                                    <div className="space-y-2">
                                        <p className="text-xs font-black text-amber-100/90">سجل المواعيد النشطة</p>
                                        {active.length ? (
                                            renderList(active, true)
                                        ) : (
                                            <p className="text-[11px] text-slate-500">لا توجد مواعيد نشطة.</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-black text-amber-100/90">سجل المواعيد المنتهية</p>
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
