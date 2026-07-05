import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, MapPin, PanelBottom, X, ClipboardList } from 'lucide-react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildTaskWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import type { LegalTask } from '@/app/types/TaskEngine';
import { listFieldDaySheetTasks } from '@/app/services/tasks/fieldCurtainTasks';
import { useQuantumTasksActions, useQuantumTasksData } from '@/app/hooks/useQuantumTasksContext';
import { useFatalTaskComplete } from '@/app/hooks/useFatalTaskComplete';
import { isTaskAgendaReadOnly, isTaskMarkedDone } from '@/app/components/lawyer/dashboard/tasksManager/utils';
import { TaskSubTasksCollapsible } from '@/app/components/lawyer/dashboard/tasksManager/TaskSubTasksCollapsible';
import { TaskVoicePlayback } from '@/app/components/lawyer/dashboard/tasksManager/TaskVoicePlayback';
import {
    CURTAIN_BTN_MANAGE,
    CURTAIN_GLASS_INNER,
    CURTAIN_SHEET,
    TASKS_BRONZE_LINE,
} from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';
import { TaskListOrdinalBadge, taskListStripeToneClass, type TaskListOrdinal } from '@/app/components/lawyer/dashboard/tasksManager/TaskListOrdinalBadge';
import { useTasksLifecycle } from '@/app/components/lawyer/dashboard/fieldTasks/useTasksLifecycle';
import {
    blockTasksOverlayEscape,
    unblockTasksOverlayEscape,
} from '@/app/components/lawyer/dashboard/fieldTasks/tasksEscapeCoordinator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';

const CURTAIN_LAYER_Z = 214;
const CURTAIN_SHEET_Z = 215;

type FieldTasksBottomSheetProps = {
    open: boolean;
    onClose: () => void;
    onManageAll: () => void;
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
};

type FieldCurtainTaskCardProps = {
    task: LegalTask;
    listOrdinal?: TaskListOrdinal;
    now: Date;
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    onCompleteRequest: (task: LegalTask) => void;
    onReopenTask: (task: LegalTask) => void;
    onToggleSubComplete: (parentId: string, subId: string) => void;
};

function taskCardSignature(task: LegalTask): string {
    return [
        task.id,
        task.title,
        task.location ?? '',
        task.isFatalDeadline ? '1' : '0',
        task.pinnedToFieldCurtain ? '1' : '0',
        task.completedAt?.getTime() ?? '',
        task.subTasks.map((st) => `${st.id}:${st.isCompleted}:${st.title}`).join('|'),
        task.voiceRef ?? '',
    ].join('~');
}

const FieldCurtainTaskCard = memo(function FieldCurtainTaskCard({
    task,
    listOrdinal,
    now,
    lawsuitFiles,
    executionFiles,
    onCompleteRequest,
    onReopenTask,
    onToggleSubComplete,
}: FieldCurtainTaskCardProps) {
    const markedDone = isTaskMarkedDone(task);
    const readOnly = isTaskAgendaReadOnly(task, now);
    const fatal = task.isFatalDeadline;
    const hasSubs = task.subTasks.length > 0;
    const clusterPin = useMemo(
        () => buildTaskWorkspacePin(task, lawsuitFiles, executionFiles),
        [task, lawsuitFiles, executionFiles],
    );

    return (
        <li
            data-testid={`field-tasks-curtain-card-${task.id}`}
            className={`relative ${CURTAIN_GLASS_INNER} px-3 py-2.5 text-right ${
                (listOrdinal?.total ?? 0) > 1 ? 'overflow-visible' : ''
            } ${
                fatal
                    ? 'border-rose-500/40 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                    : markedDone
                      ? 'border-[#1A7059]/35'
                      : ''
            }`}
        >
            {(listOrdinal?.total ?? 0) > 1 ? (
                <TaskListOrdinalBadge
                    ordinal={listOrdinal!}
                    compact
                    placement="edge"
                    testId={`field-tasks-ordinal-${task.id}`}
                />
            ) : null}
            <div className={`absolute top-0 right-0 bottom-0 w-0.5 bg-gradient-to-b ${taskListStripeToneClass(listOrdinal)} to-transparent rounded-r-xl pointer-events-none`} />

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
                    {task.voiceRef ? (
                        <div className="mt-2">
                            <TaskVoicePlayback voiceRef={task.voiceRef} compact />
                        </div>
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
                            data-testid={`field-tasks-complete-${task.id}`}
                            onClick={() => onCompleteRequest(task)}
                            className="min-h-[44px] px-2.5 py-1 rounded-lg bg-[#1A7059]/70 hover:bg-[#1A7059] border border-[#1A7059]/50 text-[#E8F5F0] text-[10px] font-extrabold whitespace-nowrap touch-manipulation"
                        >
                            إنهاء المهمة
                        </button>
                    )}
                </div>
            </div>

            {hasSubs ? (
                <TaskSubTasksCollapsible
                    subTasks={task.subTasks}
                    readOnly={readOnly}
                    onToggleSubComplete={(subId) => onToggleSubComplete(task.id, subId)}
                    compactActions
                    testIdPrefix={`field-tasks-curtain-card-${task.id}`}
                />
            ) : null}
        </li>
    );
}, (prev, next) => {
    if (prev.listOrdinal?.index !== next.listOrdinal?.index || prev.listOrdinal?.total !== next.listOrdinal?.total) {
        return false;
    }
    if (prev.now.toDateString() !== next.now.toDateString()) return false;
    if (prev.lawsuitFiles !== next.lawsuitFiles || prev.executionFiles !== next.executionFiles) return false;
    if (taskCardSignature(prev.task) !== taskCardSignature(next.task)) return false;
    return true;
});

export const FieldTasksBottomSheet = memo(function FieldTasksBottomSheet({
    open,
    onClose,
    onManageAll,
    lawsuitFiles = [],
    executionFiles = [],
}: FieldTasksBottomSheetProps) {
    const { pendingTasks } = useQuantumTasksData();
    const { completeTask, reopenTask, toggleSubTaskComplete } = useQuantumTasksActions();
    const keyboardInsetPx = useMobileKeyboardInset();
    const { fatalOpen, requestComplete, confirmFatalComplete, cancelFatalComplete } =
        useFatalTaskComplete(completeTask);

    const now = useMemo(() => new Date(), [open]);
    const curtainTasks = useMemo(
        () => listFieldDaySheetTasks(pendingTasks, now),
        [pendingTasks, now],
    );

    const [sheetVisible, setSheetVisible] = useState(open);
    const [sheetHydrated, setSheetHydrated] = useState(false);

    useEffect(() => {
        if (!open) setSheetHydrated(false);
    }, [open]);

    useTasksLifecycle(open, sheetVisible, () => setSheetHydrated(true));

    useLayoutEffect(() => {
        if (!open) {
            setSheetVisible(false);
            return;
        }
        setSheetVisible(true);
    }, [open]);

    useBodyScrollLock(open);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    const handleReopenTask = useCallback(
        (task: LegalTask) => {
            reopenTask(task.id);
        },
        [reopenTask],
    );

    useEffect(() => {
        if (!open && fatalOpen) {
            cancelFatalComplete();
        }
    }, [open, fatalOpen, cancelFatalComplete]);

    useEffect(() => {
        if (!fatalOpen) return;
        blockTasksOverlayEscape('field-fatal');
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            cancelFatalComplete();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            unblockTasksOverlayEscape('field-fatal');
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }, [fatalOpen, cancelFatalComplete]);

    if (typeof document === 'undefined' || (!open && !fatalOpen)) return null;

    return createPortal(
        <>
            <Dialog
                open={fatalOpen}
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
                            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold"
                        >
                            تأكيد الإكمال
                        </button>
                        <button
                            type="button"
                            onClick={cancelFatalComplete}
                            className="px-4 py-2 rounded-lg border border-[#A67C52]/30 bg-[#0c0c0e]/40 hover:bg-[#0c0c0e]/60 text-[#E8F5F0] text-xs font-bold"
                        >
                            إلغاء
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {open ? (
                <>
                    <button
                        type="button"
                        aria-label="إغلاق الستارة"
                        className={`fixed inset-0 bg-[#051410]/75 border-0 cursor-default transition-opacity duration-150 ${
                            sheetVisible ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ zIndex: CURTAIN_LAYER_Z }}
                        onClick={handleClose}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="field-tasks-sheet-title"
                        data-testid="field-tasks-sheet"
                        data-field-tasks-hydrated={sheetHydrated && sheetVisible ? 'true' : 'false'}
                        className={`${CURTAIN_SHEET} pb-[max(0px,env(safe-area-inset-bottom))] transition-transform duration-200 ease-out will-change-transform ${
                            sheetVisible ? 'translate-y-0' : 'translate-y-full'
                        }`}
                        style={{
                            zIndex: CURTAIN_SHEET_Z,
                            marginBottom: keyboardInsetPx > 0 ? keyboardInsetPx : undefined,
                        }}
                    >
                        <div className="shrink-0 flex flex-col items-center pt-2.5 pb-1 relative z-[1]">
                            <div className="w-12 h-1 rounded-full bg-[#A67C52]/40" />
                        </div>

                        <div className="shrink-0 flex items-center justify-between gap-3 px-4 pb-3 border-b border-[#A67C52]/18 relative z-[1]">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-[#0c0c0e]/45 border border-[#A67C52]/25 flex items-center justify-center shrink-0">
                                    <ClipboardList size={18} className="text-[#B8956A]" />
                                </div>
                                <div className="min-w-0">
                                    <h2 id="field-tasks-sheet-title" className="text-[#E8F5F0] font-extrabold text-base truncate">
                                        مهام اليوم الميدانية
                                    </h2>
                                    <p className="text-[10px] text-[#6BC4A8]/60 font-bold">
                                        {curtainTasks.length > 0
                                            ? `${curtainTasks.length} مهمة — الستارة الذكية`
                                            : 'الستارة الذكية'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
                                data-testid="field-tasks-close"
                                className="shrink-0 w-11 h-11 rounded-xl border border-[#A67C52]/22 bg-[#0c0c0e]/40 flex items-center justify-center text-[#E8F5F0]/80 hover:bg-[#0c0c0e]/60 touch-manipulation"
                                aria-label="إغلاق"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div
                            dir="rtl"
                            className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 min-h-0 relative z-[1]"
                        >
                            {curtainTasks.length === 0 ? (
                                <div
                                    className={`${CURTAIN_GLASS_INNER} flex flex-col items-center py-12 px-4 text-center`}
                                    data-testid="field-tasks-empty"
                                >
                                    <PanelBottom size={32} className="text-[#A67C52]/50 mb-3" />
                                    <p className="text-[#E8F5F0]/55 text-sm font-medium leading-relaxed max-w-xs">
                                        لا مهام ميدانية لليوم. أضف مهمة من مدير المهام أو ثبّتها على الستارة للوصول السريع.
                                    </p>
                                    <div className={`mt-4 w-20 ${TASKS_BRONZE_LINE}`} />
                                </div>
                            ) : (
                                <ul className="space-y-2.5">
                                    {curtainTasks.map((task, i) => (
                                        <FieldCurtainTaskCard
                                            key={task.id}
                                            task={task}
                                            listOrdinal={{ index: i, total: curtainTasks.length }}
                                            now={now}
                                            lawsuitFiles={lawsuitFiles}
                                            executionFiles={executionFiles}
                                            onCompleteRequest={requestComplete}
                                            onReopenTask={handleReopenTask}
                                            onToggleSubComplete={toggleSubTaskComplete}
                                        />
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="shrink-0 p-4 pt-2 border-t border-[#A67C52]/18 bg-[#0c0c0e]/30 relative z-[1]">
                            <button
                                type="button"
                                data-testid="field-tasks-manage-all"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onManageAll();
                                }}
                                className={CURTAIN_BTN_MANAGE}
                            >
                                عرض وإدارة جميع المهام ←
                            </button>
                        </div>
                    </div>
                </>
            ) : null}
        </>,
        document.body,
    );
});
