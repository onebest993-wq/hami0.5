import React, { memo, useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ClipboardList, MapPin, X } from '@/app/components/ui/lucideIcons';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { inertProps } from '@/app/utils/inertProps';
import { useQuantumTasksActions, useQuantumTasksData } from '@/app/hooks/useQuantumTasksContext';
import { useFatalTaskComplete } from '@/app/hooks/useFatalTaskComplete';
import { listFieldDaySheetTasks } from '@/app/services/tasks/fieldCurtainTasks';
import { isTaskAgendaReadOnly, isTaskMarkedDone } from '@/app/components/lawyer/dashboard/tasksManager/utils';
import {
    CURTAIN_BTN_MANAGE,
    CURTAIN_GLASS_INNER,
    CURTAIN_SHEET,
    TASKS_BRONZE_LINE,
} from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';
import {
    isFieldTasksCloseSuppressed,
    isFieldTasksForceVisible,
} from '@/app/runtime/fieldTasksInstantPaint';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';
import './fieldTasksChrome.css';

const CURTAIN_LAYER_Z = 214;
const CURTAIN_SHEET_Z = 215;

export type FieldTasksWarmSheetBridgeProps = {
    open: boolean;
    onClose: () => void;
    onManageAll: () => void;
};

type WarmCurtainCardProps = {
    task: import('@/app/types/TaskEngine').LegalTask;
    now: Date;
    onCompleteRequest: (task: import('@/app/types/TaskEngine').LegalTask) => void;
};

const WarmCurtainCard = memo(function WarmCurtainCard({
    task,
    now,
    onCompleteRequest,
}: WarmCurtainCardProps) {
    const markedDone = isTaskMarkedDone(task);
    const readOnly = isTaskAgendaReadOnly(task, now);
    const fatal = task.isFatalDeadline;

    return (
        <li
            data-testid={`field-tasks-curtain-card-${task.id}`}
            className={`relative ${CURTAIN_GLASS_INNER} px-3 py-2.5 text-right ${
                fatal ? 'border-rose-500/40' : markedDone ? 'border-[#059669]/35' : ''
            }`}
        >
            <div className="flex flex-row items-start gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-[#F4F4F5] text-base font-extrabold leading-snug break-words">
                        {task.title}
                    </p>
                    {task.location ? (
                        <p
                            className="mt-1 text-[11px] font-bold text-[#34D399]/90 flex flex-row-reverse items-center gap-1 justify-end"
                        >
                            <MapPin className="size-3 shrink-0 opacity-80" aria-hidden />
                            {task.location}
                        </p>
                    ) : null}
                </div>
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                    {markedDone ? (
                        <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-extrabold whitespace-nowrap ${
                                readOnly
                                    ? 'bg-[#12182B]/40 border-[#E6C673]/20 text-[#E6C673]/70'
                                    : 'bg-[#059669]/25 border-[#059669]/40 text-[#F4F4F5]'
                            }`}
                        >
                            <CheckCircle2 className="size-3" aria-hidden />
                            {readOnly ? 'للمعاينة' : 'تم'}
                        </span>
                    ) : (
                        <button
                            type="button"
                            data-testid={`field-tasks-complete-${task.id}`}
                            onClick={() => onCompleteRequest(task)}
                            className="min-h-[44px] px-2.5 py-1 rounded-lg bg-[#059669]/70 hover:bg-[#059669] border border-[#059669]/50 text-[#F4F4F5] text-[10px] font-extrabold whitespace-nowrap touch-manipulation"
                        >
                            إنهاء المهمة
                        </button>
                    )}
                </div>
            </div>
        </li>
    );
});

/**
 * ستارة فورية بمهام حقيقية من QuantumTasks — بلا skeleton أثناء تحميل chunk الستارة الكاملة.
 */
export function FieldTasksWarmSheetBridge({
    open,
    onClose,
    onManageAll,
}: FieldTasksWarmSheetBridgeProps): React.ReactElement | null {
    const { pendingTasks } = useQuantumTasksData();
    const { completeTask } = useQuantumTasksActions();
    const { fatalOpen, requestComplete, confirmFatalComplete, cancelFatalComplete } =
        useFatalTaskComplete(completeTask);

    const now = useMemo(() => new Date(), [open]);
    const curtainTasks = useMemo(
        () => (open ? listFieldDaySheetTasks(pendingTasks, now) : []),
        [open, pendingTasks, now],
    );

    const [sheetVisible, setSheetVisible] = useState(open);

    useLayoutEffect(() => {
        if (!open) {
            setSheetVisible(false);
            return;
        }
        setSheetVisible(true);
    }, [open]);

    useBodyScrollLock(open);

    const handleClose = useCallback(() => {
        if (isFieldTasksCloseSuppressed()) return;
        onClose();
    }, [onClose]);

    if (typeof document === 'undefined' || !open) {
        return null;
    }

    const layerVisible = open || isFieldTasksForceVisible();
    const snapSheetOpen = open && isFieldTasksForceVisible();

    return createPortal(
        <>
            {fatalOpen ? (
                <Dialog
                    open={fatalOpen}
                    onOpenChange={(o) => {
                        if (!o) cancelFatalComplete();
                    }}
                >
                    <DialogContent className="border-[#E6C673]/35 bg-[#12182B] text-[#F4F4F5] sm:max-w-md [&]:translate-x-[-50%] [&]:translate-y-[-50%]">
                        <DialogHeader className="text-right sm:text-right space-y-2">
                            <DialogTitle className="text-[#E6C673] text-base font-extrabold leading-relaxed">
                                تحذير — موعد حتمي
                            </DialogTitle>
                            <DialogDescription className="text-[#F4F4F5]/80 text-sm leading-relaxed">
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
                                className="px-4 py-2 rounded-lg border border-[#E6C673]/30 bg-[#12182B]/40 hover:bg-[#12182B]/60 text-[#F4F4F5] text-xs font-bold"
                            >
                                إلغاء
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            ) : null}

            <div
                data-field-tasks-root=""
                data-open={layerVisible ? 'true' : 'false'}
                aria-hidden={!layerVisible}
                className={layerVisible ? 'hami-field-tasks-layer--visible' : undefined}
                style={{
                    opacity: layerVisible ? 1 : 0,
                    visibility: layerVisible ? 'visible' : 'hidden',
                    pointerEvents: layerVisible ? 'auto' : 'none',
                }}
                {...inertProps(!layerVisible)}
            >
                <button
                    type="button"
                    aria-label="إغلاق الستارة"
                    tabIndex={layerVisible ? 0 : -1}
                    className={`fixed inset-0 bg-[#05060D]/75 border-0 cursor-default transition-opacity duration-150 ${
                        sheetVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ zIndex: CURTAIN_LAYER_Z }}
                    onClick={handleClose}
                />
                <div
                    role="dialog"
                    aria-modal={layerVisible ? true : undefined}
                    aria-labelledby="field-tasks-sheet-title"
                    data-testid="field-tasks-sheet"
                    data-field-tasks-warm-bridge="true"
                    className={`${CURTAIN_SHEET} pb-[max(0px,env(safe-area-inset-bottom))] ${
                        snapSheetOpen
                            ? 'hami-field-tasks-sheet--snap'
                            : 'transition-transform duration-200 ease-out will-change-transform'
                    } ${sheetVisible ? 'translate-y-0' : 'translate-y-full'}`}
                    style={{ zIndex: CURTAIN_SHEET_Z }}
                >
                    <div className="shrink-0 flex flex-col items-center pt-2.5 pb-1 relative z-[1]">
                        <div className="w-12 h-1 rounded-full bg-[#E6C673]/40" />
                    </div>

                    <div className="shrink-0 flex items-center justify-between gap-3 px-4 pb-3 border-b border-[#E6C673]/18 relative z-[1]">
                        <div className="flex items-center gap-2 min-w-0">
                            <div
                                className="w-9 h-9 rounded-xl bg-[#12182B]/45 border border-[#E6C673]/25 flex items-center justify-center shrink-0"
                            >
                                <ClipboardList size={18} className="text-[#C9A85C]" />
                            </div>
                            <div className="min-w-0">
                                <h2
                                    id="field-tasks-sheet-title"
                                    className="text-[#F4F4F5] font-extrabold text-base truncate"
                                >
                                    مهام اليوم الميدانية
                                </h2>
                                {curtainTasks.length > 0 ? (
                                    <p className="text-[10px] text-[#34D399]/60 font-bold">
                                        {curtainTasks.length} مهمة
                                    </p>
                                ) : null}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            data-testid="field-tasks-close"
                            tabIndex={layerVisible ? 0 : -1}
                            className="shrink-0 w-11 h-11 rounded-xl border border-[#E6C673]/22 bg-[#12182B]/40 flex items-center justify-center text-[#F4F4F5]/80 hover:bg-[#12182B]/60 touch-manipulation"
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
                                <p className="text-[#F4F4F5]/55 text-sm font-medium leading-relaxed max-w-xs">
                                    لا مهام ميدانية لليوم. أضف مهمة من مدير المهام أو ثبّتها على الستارة للوصول
                                    السريع.
                                </p>
                                <div className={`mt-4 w-20 ${TASKS_BRONZE_LINE}`} />
                            </div>
                        ) : (
                            <ul className="space-y-2.5">
                                {curtainTasks.map((task) => (
                                    <WarmCurtainCard
                                        key={task.id}
                                        task={task}
                                        now={now}
                                        onCompleteRequest={requestComplete}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="shrink-0 p-4 pt-2 border-t border-[#E6C673]/18 bg-[#12182B]/30 relative z-[1]">
                        <button
                            type="button"
                            data-testid="field-tasks-manage-all"
                            tabIndex={layerVisible ? 0 : -1}
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
            </div>
        </>,
        document.body,
    );
}
