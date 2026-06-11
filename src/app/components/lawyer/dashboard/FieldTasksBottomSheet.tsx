import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronDown, MapPin, PanelBottom, X } from 'lucide-react';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildTaskWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import type { LegalTask } from '@/app/types/TaskEngine';
import { isTaskOnFieldCurtain } from '@/app/utils/fieldCurtain';
import { useQuantumTasksContext } from '@/app/hooks/useQuantumTasksContext';
import { useFatalTaskComplete } from '@/app/hooks/useFatalTaskComplete';
import { isTaskAgendaReadOnly, isTaskMarkedDone } from '@/app/components/lawyer/dashboard/tasksManager/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';

export type FieldTasksBottomSheetProps = {
    open: boolean;
    onClose: () => void;
    onManageAll: () => void;
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
};

type FieldCurtainTaskCardProps = {
    task: LegalTask;
    now: Date;
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    onCompleteRequest: (task: LegalTask) => void;
    onReopenTask: (task: LegalTask) => void;
    onToggleSubComplete: (parentId: string, subId: string) => void;
};

function FieldCurtainTaskCard({
    task,
    now,
    lawsuitFiles,
    executionFiles,
    onCompleteRequest,
    onReopenTask,
    onToggleSubComplete,
}: FieldCurtainTaskCardProps) {
    const [branchOpen, setBranchOpen] = useState(false);
    const markedDone = isTaskMarkedDone(task);
    const readOnly = isTaskAgendaReadOnly(task, now);
    const fatal = task.isFatalDeadline;
    const activeSubs = task.subTasks.filter((s) => !s.isCompleted);
    const hasSubs = task.subTasks.length > 0;
    const clusterPin = buildTaskWorkspacePin(task, lawsuitFiles, executionFiles);

    return (
        <li
            className={`rounded-xl border px-3 py-2.5 text-right ${
                fatal
                    ? 'border-red-500/45 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.18)]'
                    : markedDone
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : 'border-white/10 bg-white/[0.04]'
            }`}
        >
            <div className="flex flex-row items-start gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 justify-end mb-1">
                        {task.pinnedToFieldCurtain ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/35">
                                <PanelBottom className="size-3" aria-hidden />
                                ستارة الميدان
                            </span>
                        ) : null}
                        {fatal ? (
                            <span className="text-[10px] font-extrabold text-red-200 bg-red-500/22 border border-red-400/35 px-2 py-0.5 rounded-full">
                                ⚠️ حتمي
                            </span>
                        ) : null}
                    </div>
                    <p className="text-white text-base font-extrabold leading-snug break-words">{task.title}</p>
                    {task.location ? (
                        <p className="mt-1 text-[11px] font-bold text-emerald-300/90 flex flex-row-reverse items-center gap-1 justify-end">
                            <MapPin className="size-3 shrink-0 opacity-80" aria-hidden />
                            {task.location}
                        </p>
                    ) : null}
                </div>
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                    {clusterPin ? (
                        <WorkspacePinButton item={clusterPin} className="!w-7 !h-7" size={14} />
                    ) : null}
                    {markedDone ? (
                        <div className="flex flex-col items-center gap-1">
                            <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-extrabold whitespace-nowrap ${
                                    readOnly
                                        ? 'bg-slate-700/30 border-slate-600/50 text-slate-300'
                                        : 'bg-emerald-600/25 border-emerald-500/40 text-emerald-100'
                                }`}
                            >
                                <CheckCircle2 className="size-3" aria-hidden />
                                {readOnly ? 'للمعاينة' : 'تم'}
                            </span>
                            {!readOnly ? (
                                <button
                                    type="button"
                                    onClick={() => onReopenTask(task)}
                                    className="text-[9px] font-bold text-sky-300/90 hover:underline"
                                >
                                    تراجع
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onCompleteRequest(task)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600/85 hover:bg-rose-600 border border-rose-500/45 text-white text-[10px] font-extrabold transition whitespace-nowrap"
                        >
                            إنهاء المهمة
                        </button>
                    )}
                </div>
            </div>

            {hasSubs ? (
                <div className="mt-2 border-t border-white/10 pt-2">
                    <button
                        type="button"
                        onClick={() => setBranchOpen((v) => !v)}
                        className="w-full flex flex-row-reverse items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-white/5 transition"
                        aria-expanded={branchOpen}
                    >
                        <span className="text-[11px] font-bold text-sky-200/90">
                            إجراءات فرعية ({task.subTasks.length}
                            {activeSubs.length > 0 ? ` · ${activeSubs.length} متبق` : ''})
                        </span>
                        <ChevronDown
                            className={`size-4 text-sky-300/70 shrink-0 transition-transform duration-200 ${
                                branchOpen ? 'rotate-180' : ''
                            }`}
                            aria-hidden
                        />
                    </button>
                    {branchOpen ? (
                        <ul className="mt-1.5 space-y-1">
                            {task.subTasks.map((st, idx) => (
                                <li
                                    key={st.id}
                                    className={`rounded-lg border px-2 py-1.5 flex flex-row items-center gap-2 ${
                                        st.isCompleted
                                            ? 'border-emerald-500/25 bg-emerald-950/15'
                                            : 'border-white/10 bg-black/20'
                                    }`}
                                >
                                    <div className="flex-1 min-w-0 text-right">
                                        <div className="flex flex-row-reverse items-center gap-1">
                                            <span className="text-[10px] text-white/45 tabular-nums">{idx + 1}.</span>
                                            <span
                                                className={`text-sm font-bold leading-snug ${
                                                    st.isCompleted
                                                        ? 'text-white/45 line-through'
                                                        : 'text-white'
                                                }`}
                                            >
                                                {st.title}
                                            </span>
                                        </div>
                                        {st.location ? (
                                            <p className="mt-0.5 text-[10px] text-emerald-300/80 truncate">{st.location}</p>
                                        ) : null}
                                    </div>
                                    {st.isCompleted ? (
                                        <span className="shrink-0 text-[10px] font-extrabold text-emerald-300">تم</span>
                                    ) : readOnly ? null : (
                                        <button
                                            type="button"
                                            onClick={() => onToggleSubComplete(task.id, st.id)}
                                            className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-600/80 hover:bg-emerald-600 text-white text-[10px] font-extrabold transition whitespace-nowrap"
                                        >
                                            تم الإجراء
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            ) : null}
        </li>
    );
}

export const FieldTasksBottomSheet: React.FC<FieldTasksBottomSheetProps> = ({
    open,
    onClose,
    onManageAll,
    lawsuitFiles = [],
    executionFiles = [],
}) => {
    const { pendingTasks, completeTask, reopenTask, toggleSubTaskComplete } = useQuantumTasksContext();
    const { fatalOpen, requestComplete, confirmFatalComplete, cancelFatalComplete } =
        useFatalTaskComplete(completeTask);

    const curtainTasks = useMemo(
        () =>
            pendingTasks
                .filter(isTaskOnFieldCurtain)
                .sort((a, b) => {
                    if (a.pinnedToFieldCurtain !== b.pinnedToFieldCurtain) {
                        return a.pinnedToFieldCurtain ? -1 : 1;
                    }
                    return a.title.localeCompare(b.title, 'ar');
                }),
        [pendingTasks],
    );

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <>
                    <Dialog
                        open={fatalOpen}
                        onOpenChange={(o) => {
                            if (!o) cancelFatalComplete();
                        }}
                    >
                        <DialogContent className="border-[#D4AF37]/40 bg-[#0B1021] text-white sm:max-w-md [&]:translate-x-[-50%] [&]:translate-y-[-50%]">
                            <DialogHeader className="text-right sm:text-right space-y-2">
                                <DialogTitle className="text-amber-200 text-base font-extrabold leading-relaxed">
                                    تحذير — موعد حتمي
                                </DialogTitle>
                                <DialogDescription className="text-white/80 text-sm leading-relaxed">
                                    ⚠️ تحذير: هذا موعد حتمي (سقوط حق). هل أنت متأكد من إنجاز الإجراء القانوني بشكل
                                    نهائي؟
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
                                <button
                                    type="button"
                                    onClick={confirmFatalComplete}
                                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold transition-colors"
                                >
                                    تأكيد الإكمال
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelFatalComplete}
                                    className="px-4 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors"
                                >
                                    إلغاء
                                </button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <motion.button
                        key="ft-backdrop"
                        type="button"
                        aria-label="إغلاق الستارة"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[214] bg-black/55 backdrop-blur-[6px] border-0 cursor-default"
                        onClick={onClose}
                    />
                    <motion.div
                        key="ft-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="field-tasks-sheet-title"
                        initial={{ y: '105%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '105%' }}
                        transition={{ type: 'spring', damping: 32, stiffness: 380 }}
                        className="fixed bottom-0 left-0 right-0 z-[215] max-h-[min(88dvh,640px)] flex flex-col rounded-t-[22px] border border-[#D4AF37]/35 border-b-0 bg-[#0B1021]/96 shadow-[0_-12px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl font-['Tajawal','Cairo',sans-serif]"
                    >
                        <motion.div
                            className="shrink-0 flex flex-col items-center cursor-grab active:cursor-grabbing touch-pan-y pt-2 pb-1"
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 140 }}
                            dragElastic={0.12}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 48 || info.velocity.y > 420) onClose();
                            }}
                        >
                            <div className="w-11 h-1.5 rounded-full bg-white/25" />
                        </motion.div>

                        <div className="shrink-0 flex items-center justify-between gap-3 px-4 pb-2 border-b border-white/10">
                            <h2 id="field-tasks-sheet-title" className="text-white font-extrabold text-base truncate">
                                📋 مهام اليوم الميدانية
                            </h2>
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 w-10 h-10 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center text-white/85 hover:bg-white/10 transition-colors"
                                aria-label="إغلاق"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div dir="rtl" className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
                            {curtainTasks.length === 0 ? (
                                <p className="text-white/45 text-sm text-center font-medium py-10 leading-relaxed">
                                    لا مهام مثبتة على الستارة. اضغط «ستارة الميدان» في مدير المهام لتثبيت مهمة هنا.
                                </p>
                            ) : (
                                <ul className="space-y-2.5">
                                    {curtainTasks.map((task) => (
                                        <FieldCurtainTaskCard
                                            key={task.id}
                                            task={task}
                                            now={new Date()}
                                            lawsuitFiles={lawsuitFiles}
                                            executionFiles={executionFiles}
                                            onCompleteRequest={requestComplete}
                                            onReopenTask={(t) => reopenTask(t.id)}
                                            onToggleSubComplete={toggleSubTaskComplete}
                                        />
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="shrink-0 p-4 pt-2 border-t border-white/10 bg-black/20">
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onManageAll();
                                }}
                                className="w-full py-3.5 rounded-xl font-extrabold text-sm text-[#0B1021] bg-gradient-to-l from-[#E6C673] to-[#C4A035] border border-[#E6C673]/60 shadow-[0_4px_24px_rgba(230,198,115,0.25)] active:scale-[0.99] transition-transform"
                            >
                                عرض وإدارة جميع المهام ➔
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body,
    );
};
