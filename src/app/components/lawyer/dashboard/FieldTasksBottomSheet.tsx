import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Pin, X } from 'lucide-react';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildTaskWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import type { LegalTask } from '@/app/types/TaskEngine';
import { useQuantumTasksContext } from '@/app/hooks/useQuantumTasksContext';
import { useFatalTaskComplete } from '@/app/hooks/useFatalTaskComplete';
import { delegateLocationLines } from '@/app/utils/taskDelegation';
import { buildFieldGrouping, type FieldViewRow } from '@/app/utils/fieldViewGrouping';
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

function rowToLine(r: FieldViewRow): string {
    if (r.kind === 'parent') return r.task.title.trim();
    return `${r.task.title.trim()} ← فرع: ${r.subTask.title.trim()}`;
}

export const FieldTasksBottomSheet: React.FC<FieldTasksBottomSheetProps> = ({
    open,
    onClose,
    onManageAll,
    lawsuitFiles = [],
    executionFiles = [],
}) => {
    const { pendingTasks, completeTask } = useQuantumTasksContext();
    const { fatalOpen, requestComplete, confirmFatalComplete, cancelFatalComplete } =
        useFatalTaskComplete(completeTask);

    const pinnedToCurtain = useMemo(
        () => pendingTasks.filter((t) => t.pinnedToFieldCurtain && !t.isFatalDeadline),
        [pendingTasks],
    );

    const { locationEntries } = useMemo(() => {
        const fg = buildFieldGrouping(pendingTasks.filter((t) => !t.isFatalDeadline));
        const pairs = Object.entries(fg.byLocation)
            .map(
                ([loc, rows]) =>
                    [
                        loc,
                        rows.filter((r) => !(r.kind === 'parent' && r.task.pinnedToFieldCurtain)),
                    ] as const,
            )
            .filter(([, rows]) => rows.length > 0)
            .sort(([a], [b]) => a.localeCompare(b, 'ar'));
        return { locationEntries: pairs };
    }, [pendingTasks]);

    if (typeof document === 'undefined') return null;
    const hasAny = pinnedToCurtain.length > 0 || locationEntries.length > 0;

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

                        <div dir="rtl" className="flex-1 overflow-y-auto px-4 py-3 space-y-5 min-h-0">
                            {!hasAny ? (
                                <p className="text-white/45 text-sm text-center font-medium py-10 leading-relaxed">
                                    لا مهام على الستارة بعد. ثبّت مهمة أو عيّن موقعاً أو فرعاً ميدانياً من مدير المهام.
                                </p>
                            ) : (
                                <>
                                    {pinnedToCurtain.length > 0 ? (
                                        <section>
                                            <div className="flex items-center gap-2 mb-2 text-amber-200/95">
                                                <Pin size={16} className="shrink-0 text-amber-400" aria-hidden />
                                                <span className="text-sm font-extrabold">مثبتة على الستارة</span>
                                            </div>
                                            <ul className="space-y-2">
                                                {pinnedToCurtain.map((task) => {
                                                    const fatal = task.isFatalDeadline;
                                                    return (
                                                        <li
                                                            key={`pin-${task.id}`}
                                                            className={`rounded-xl border px-3 py-2.5 text-right transition-opacity ${
                                                                fatal
                                                                    ? 'border-red-500/45 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.18)]'
                                                                    : 'border-white/10 bg-white/[0.04]'
                                                            }`}
                                                        >
                                                            <div className="flex items-start gap-2">
                                                                <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={false}
                                                                    onChange={() => requestComplete(task)}
                                                                    className="mt-0.5 h-4 w-4 rounded border-white/25 bg-black/30 accent-amber-500 shrink-0"
                                                                />
                                                                <span className="min-w-0 flex-1 flex flex-col gap-1">
                                                                    <span className="text-white text-sm font-bold leading-snug">
                                                                        {task.title}
                                                                    </span>
                                                                    {task.location ? (
                                                                        <span className="text-[11px] text-emerald-300/90">
                                                                            📍 {task.location}
                                                                        </span>
                                                                    ) : null}
                                                                    {fatal ? (
                                                                        <span className="self-start text-[10px] font-extrabold text-red-200 bg-red-500/22 border border-red-400/35 px-2 py-0.5 rounded-full">
                                                                            ⚠️ موعد حتمي
                                                                        </span>
                                                                    ) : null}
                                                                </span>
                                                            </label>
                                                            {(() => {
                                                                const clusterPin = buildTaskWorkspacePin(task, lawsuitFiles, executionFiles);
                                                                return clusterPin ? (
                                                                    <WorkspacePinButton item={clusterPin} className="!w-7 !h-7 shrink-0" size={14} />
                                                                ) : null;
                                                            })()}
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </section>
                                    ) : null}

                                    {locationEntries.map(([location, rows]) => (
                                        <section key={location}>
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2 text-amber-200/95 min-w-0">
                                                    <MapPin size={16} className="shrink-0 text-amber-400" aria-hidden />
                                                    <span className="text-sm font-extrabold truncate">📍 {location}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        delegateLocationLines(
                                                            location,
                                                            rows.map((r) => rowToLine(r)),
                                                        )
                                                    }
                                                    className="shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-[#25D366]/50 text-[#6ee7a8] hover:bg-[#25D366]/15 transition-colors"
                                                >
                                                    واتساب
                                                </button>
                                            </div>
                                            <ul className="space-y-2">
                                                {rows.map((row) => {
                                                    if (row.kind === 'parent') {
                                                        const task = row.task;
                                                        const fatal = task.isFatalDeadline;
                                                        return (
                                                            <li
                                                                key={`p-${task.id}-${location}`}
                                                                className={`rounded-xl border px-3 py-2.5 text-right ${
                                                                    fatal
                                                                        ? 'border-red-500/45 bg-red-950/20'
                                                                        : 'border-white/10 bg-white/[0.04]'
                                                                }`}
                                                            >
                                                                <div className="flex items-start gap-2">
                                                                    <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={false}
                                                                        onChange={() => requestComplete(task)}
                                                                        className="mt-0.5 h-4 w-4 rounded border-white/25 bg-black/30 accent-amber-500 shrink-0"
                                                                    />
                                                                    <span className="min-w-0 flex-1 text-white text-sm font-bold leading-snug">
                                                                        {task.title}
                                                                    </span>
                                                                    </label>
                                                                    {(() => {
                                                                        const clusterPin = buildTaskWorkspacePin(task, lawsuitFiles, executionFiles);
                                                                        return clusterPin ? (
                                                                            <WorkspacePinButton item={clusterPin} className="!w-7 !h-7 shrink-0" size={14} />
                                                                        ) : null;
                                                                    })()}
                                                                </div>
                                                            </li>
                                                        );
                                                    }
                                                    const { task, subTask } = row;
                                                    return (
                                                        <li
                                                            key={`s-${task.id}-${subTask.id}-${location}`}
                                                            className="mr-2 border-r-2 border-emerald-400/50 pr-3 rounded-lg border border-white/10 bg-emerald-950/10 px-3 py-2.5"
                                                        >
                                                            <p className="text-[11px] text-white/55 font-medium mb-0.5">
                                                                فرع من: {task.title}
                                                            </p>
                                                            <p className="text-white text-sm font-bold">{subTask.title}</p>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </section>
                                    ))}
                                </>
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
