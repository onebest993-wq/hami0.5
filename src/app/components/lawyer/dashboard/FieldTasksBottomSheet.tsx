import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronDown, MapPin, PanelBottom, X, ClipboardList } from 'lucide-react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildTaskWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import type { LegalTask } from '@/app/types/TaskEngine';
import { isTaskOnFieldCurtain } from '@/app/utils/fieldCurtain';
import { useQuantumTasksContext } from '@/app/hooks/useQuantumTasksContext';
import { useFatalTaskComplete } from '@/app/hooks/useFatalTaskComplete';
import { isTaskAgendaReadOnly, isTaskMarkedDone } from '@/app/components/lawyer/dashboard/tasksManager/utils';
import {
    CURTAIN_BACKDROP,
    CURTAIN_BTN_MANAGE,
    CURTAIN_GLASS_INNER,
    CURTAIN_SHEET,
    TASKS_BRONZE_LINE,
} from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';

type FieldTasksBottomSheetProps = {
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
            className={`relative ${CURTAIN_GLASS_INNER} px-3 py-2.5 text-right ${
                fatal
                    ? 'border-rose-500/40 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                    : markedDone
                      ? 'border-[#1A7059]/35'
                      : ''
            }`}
        >
            <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-gradient-to-b from-[#A67C52]/50 via-[#1A7059]/30 to-transparent rounded-r-xl pointer-events-none" />

            <div className="flex flex-row items-start gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 justify-end mb-1">
                        {task.pinnedToFieldCurtain ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#A67C52]/15 text-[#D4B896] border border-[#A67C52]/35">
                                <PanelBottom className="size-3" aria-hidden />
                                ستارة الميدان
                            </span>
                        ) : null}
                        {fatal ? (
                            <span className="text-[10px] font-extrabold text-rose-200 bg-rose-500/20 border border-rose-400/35 px-2 py-0.5 rounded-full">
                                حتمي
                            </span>
                        ) : null}
                    </div>
                    <p className="text-[#E8F5F0] text-base font-extrabold leading-snug break-words">{task.title}</p>
                    {task.location ? (
                        <p className="mt-1 text-[11px] font-bold text-[#6BC4A8]/90 flex flex-row-reverse items-center gap-1 justify-end">
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
                                        ? 'bg-[#0c0c0e]/40 border-[#A67C52]/20 text-[#A67C52]/70'
                                        : 'bg-[#1A7059]/25 border-[#1A7059]/40 text-[#E8F5F0]'
                                }`}
                            >
                                <CheckCircle2 className="size-3" aria-hidden />
                                {readOnly ? 'للمعاينة' : 'تم'}
                            </span>
                            {!readOnly ? (
                                <button
                                    type="button"
                                    onClick={() => onReopenTask(task)}
                                    className="text-[9px] font-bold text-[#B8956A] hover:underline"
                                >
                                    تراجع
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onCompleteRequest(task)}
                            className="px-2.5 py-1 rounded-lg bg-[#1A7059]/70 hover:bg-[#1A7059] border border-[#1A7059]/50 text-[#E8F5F0] text-[10px] font-extrabold transition whitespace-nowrap"
                        >
                            إنهاء المهمة
                        </button>
                    )}
                </div>
            </div>

            {hasSubs ? (
                <div className="mt-2 border-t border-[#A67C52]/15 pt-2">
                    <button
                        type="button"
                        onClick={() => setBranchOpen((v) => !v)}
                        className="w-full flex flex-row-reverse items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-[#0c0c0e]/30 transition"
                        aria-expanded={branchOpen}
                    >
                        <span className="text-[11px] font-bold text-[#B8956A]/90">
                            إجراءات فرعية ({task.subTasks.length}
                            {activeSubs.length > 0 ? ` · ${activeSubs.length} متبق` : ''})
                        </span>
                        <ChevronDown
                            className={`size-4 text-[#A67C52]/70 shrink-0 transition-transform duration-200 ${
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
                                            ? 'border-[#1A7059]/25 bg-[#1A7059]/10'
                                            : `${CURTAIN_GLASS_INNER} border-white/[0.06]`
                                    }`}
                                >
                                    <div className="flex-1 min-w-0 text-right">
                                        <div className="flex flex-row-reverse items-center gap-1">
                                            <span className="text-[10px] text-[#A67C52]/50 tabular-nums">{idx + 1}.</span>
                                            <span
                                                className={`text-sm font-bold leading-snug ${
                                                    st.isCompleted ? 'text-[#E8F5F0]/40 line-through' : 'text-[#E8F5F0]'
                                                }`}
                                            >
                                                {st.title}
                                            </span>
                                        </div>
                                        {st.location ? (
                                            <p className="mt-0.5 text-[10px] text-[#6BC4A8]/75 truncate">{st.location}</p>
                                        ) : null}
                                    </div>
                                    {st.isCompleted ? (
                                        <span className="shrink-0 text-[10px] font-extrabold text-[#6BC4A8]">تم</span>
                                    ) : readOnly ? null : (
                                        <button
                                            type="button"
                                            onClick={() => onToggleSubComplete(task.id, st.id)}
                                            className="shrink-0 px-2 py-0.5 rounded-md bg-[#1A7059]/75 hover:bg-[#1A7059] text-[#E8F5F0] text-[10px] font-extrabold transition whitespace-nowrap"
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

    useBodyScrollLock(open);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <>
            <Dialog
                open={open && fatalOpen}
                onOpenChange={(o) => {
                    if (!o) cancelFatalComplete();
                }}
            >
                <DialogContent className="border-[#A67C52]/35 bg-[#0A2E25] text-[#E8F5F0] sm:max-w-md [&]:translate-x-[-50%] [&]:translate-y-[-50%]">
                    <DialogHeader className="text-right sm:text-right space-y-2">
                        <DialogTitle className="text-[#D4B896] text-base font-extrabold leading-relaxed">
                            تحذير — موعد حتمي
                        </DialogTitle>
                        <DialogDescription className="text-[#E8F5F0]/80 text-sm leading-relaxed">
                            هذا موعد حتمي (سقوط حق). هل أنت متأكد من إنجاز الإجراء القانوني بشكل نهائي؟
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
                        <button
                            type="button"
                            onClick={confirmFatalComplete}
                            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-colors"
                        >
                            تأكيد الإكمال
                        </button>
                        <button
                            type="button"
                            onClick={cancelFatalComplete}
                            className="px-4 py-2 rounded-lg border border-[#A67C52]/30 bg-[#0c0c0e]/40 hover:bg-[#0c0c0e]/60 text-[#E8F5F0] text-xs font-bold transition-colors"
                        >
                            إلغاء
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AnimatePresence>
                {open ? (
                    <motion.button
                        key="ft-backdrop"
                        type="button"
                        aria-label="إغلاق الستارة"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={CURTAIN_BACKDROP}
                        onClick={onClose}
                    />
                ) : null}
                {open ? (
                    <motion.div
                        key="ft-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="field-tasks-sheet-title"
                        initial={{ y: '105%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '105%' }}
                        transition={{ type: 'spring', damping: 32, stiffness: 380 }}
                        className={CURTAIN_SHEET}
                    >
                        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                            <div className="absolute -top-16 right-8 w-40 h-40 rounded-full bg-[#1A7059]/15 blur-3xl" />
                        </div>

                        <motion.div
                            className="shrink-0 flex flex-col items-center cursor-grab active:cursor-grabbing touch-pan-y pt-2.5 pb-1 relative z-[1]"
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 140 }}
                            dragElastic={0.12}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 48 || info.velocity.y > 420) onClose();
                            }}
                        >
                            <div className="w-12 h-1 rounded-full bg-[#A67C52]/40" />
                        </motion.div>

                        <div className="shrink-0 flex items-center justify-between gap-3 px-4 pb-3 border-b border-[#A67C52]/18 relative z-[1]">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-[#0c0c0e]/45 border border-[#A67C52]/25 flex items-center justify-center shrink-0">
                                    <ClipboardList size={18} className="text-[#B8956A]" />
                                </div>
                                <div className="min-w-0">
                                    <h2 id="field-tasks-sheet-title" className="text-[#E8F5F0] font-extrabold text-base truncate">
                                        مهام اليوم الميدانية
                                    </h2>
                                    <p className="text-[10px] text-[#6BC4A8]/60 font-bold">الستارة الذكية</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 w-10 h-10 rounded-xl border border-[#A67C52]/22 bg-[#0c0c0e]/40 flex items-center justify-center text-[#E8F5F0]/80 hover:bg-[#0c0c0e]/60 transition-colors"
                                aria-label="إغلاق"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div dir="rtl" className="flex-1 overflow-y-auto px-4 py-3 min-h-0 relative z-[1]">
                            {curtainTasks.length === 0 ? (
                                <div className={`${CURTAIN_GLASS_INNER} flex flex-col items-center py-12 px-4 text-center`}>
                                    <PanelBottom size={32} className="text-[#A67C52]/50 mb-3" />
                                    <p className="text-[#E8F5F0]/55 text-sm font-medium leading-relaxed max-w-xs">
                                        لا مهام مثبتة على الستارة. اضغط «ستارة الميدان» في مدير المهام لتثبيت مهمة هنا.
                                    </p>
                                    <div className={`mt-4 w-20 ${TASKS_BRONZE_LINE}`} />
                                </div>
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

                        <div className="shrink-0 p-4 pt-2 border-t border-[#A67C52]/18 bg-[#0c0c0e]/30 relative z-[1]">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onManageAll();
                                }}
                                className={CURTAIN_BTN_MANAGE}
                            >
                                عرض وإدارة جميع المهام ←
                            </button>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </>,
        document.body,
    );
};
