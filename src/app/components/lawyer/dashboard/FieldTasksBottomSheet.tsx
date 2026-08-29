import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { inertProps } from '@/app/utils/inertProps';
import './fieldTasks/fieldTasksChrome.css';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import type { LegalTask } from '@/app/types/TaskEngine';
import { listFieldDaySheetTasks } from '@/app/services/tasks/fieldCurtainTasks';
import { useQuantumTasksActions, useQuantumTasksData } from '@/app/hooks/useQuantumTasksContext';
import { useFatalTaskComplete } from '@/app/hooks/useFatalTaskComplete';
import { buildLinkedCaseLookup } from '@/app/workspace/resolveLinkedCaseMeta';
import {
    CURTAIN_BTN_MANAGE,
    CURTAIN_CLOSE_BTN,
    CURTAIN_FATAL_DIALOG,
    CURTAIN_FOOTER_ROW,
    CURTAIN_GLASS_INNER,
    CURTAIN_HEADER_ROW,
    CURTAIN_SHEET,
    CURTAIN_BACKDROP,
    TASKS_BRONZE_LINE,
} from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';
import { FieldCurtainTaskCard } from '@/app/components/lawyer/dashboard/fieldTasks/FieldCurtainTaskCard';
import { FieldTasksSheetDragHandle } from '@/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetDragHandle';
import { useTasksLifecycle } from '@/app/components/lawyer/dashboard/fieldTasks/useTasksLifecycle';
import { useLiveNow } from '@/app/components/lawyer/dashboard/fieldTasks/useLiveNow';
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
import { isFieldTasksCloseSuppressed, isFieldTasksForceVisible } from '@/app/runtime/fieldTasksInstantPaint';

const CURTAIN_SHEET_Z = 215;

type FieldTasksBottomSheetProps = {
    open: boolean;
    onClose: () => void;
    onManageAll: () => void;
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
};

type SheetListProps = {
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    onCompleteRequest: (task: LegalTask) => void;
    onReopenTask: (task: LegalTask) => void;
    onToggleSubComplete: (parentId: string, subId: string) => void;
    layerVisible: boolean;
    onClose: () => void;
};

const FieldTasksEmptyHint = memo(function FieldTasksEmptyHint() {
    return (
        <div
            className={`${CURTAIN_GLASS_INNER} flex flex-col items-center py-12 px-4 text-center`}
            data-testid="field-tasks-empty"
            role="status"
        >
            <p className="text-[#F4F4F5]/55 text-sm font-medium leading-relaxed max-w-xs">
                لا مهام ميدانية ظاهرة الآن. أضف مهمة من مدير المهام، أو ثبّتها على الستارة، أو اجعل موعدها اليوم أو متأخراً ضمن الأسبوع.
            </p>
            <div className={`mt-4 w-20 ${TASKS_BRONZE_LINE}`} />
        </div>
    );
});

const FIELD_TASKS_SCROLLER_CLASS =
    'hami-field-tasks-scroller flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 min-h-0 relative z-[1]';

const FieldTasksSheetHeader = memo(function FieldTasksSheetHeader({
    count = 0,
    closeTabIndex,
    onClose,
}: {
    count?: number;
    closeTabIndex: number;
    onClose: () => void;
}) {
    return (
        <div className={CURTAIN_HEADER_ROW}>
            <div className="min-w-0 text-right">
                <h2 id="field-tasks-sheet-title" className="text-[#F4F4F5] font-semibold text-base truncate">
                    مهام اليوم الميدانية
                </h2>
                {count > 0 ? (
                    <p className="text-[11px] text-white/45 font-medium">{count} مهمة</p>
                ) : null}
            </div>
            <button
                type="button"
                onClick={onClose}
                data-testid="field-tasks-close"
                tabIndex={closeTabIndex}
                className={CURTAIN_CLOSE_BTN}
                aria-label="إغلاق مهام اليوم الميدانية"
            >
                <X size={20} />
            </button>
        </div>
    );
});

/** يُركَّب فقط والستارة مفتوحة — لا يشترك في سياق المهام وهو مغلق (keep-alive) */
const FieldTasksSheetOpenBody = memo(function FieldTasksSheetOpenBody({
    lawsuitFiles,
    executionFiles,
    onCompleteRequest,
    onReopenTask,
    onToggleSubComplete,
    layerVisible,
    onClose,
}: SheetListProps) {
    const { pendingTasks } = useQuantumTasksData();
    const now = useLiveNow(true);
    const curtainTasks = useMemo(
        () => listFieldDaySheetTasks(pendingTasks, now),
        [pendingTasks, now],
    );
    const pinLookup = useMemo(
        () => buildLinkedCaseLookup(lawsuitFiles, executionFiles),
        [lawsuitFiles, executionFiles],
    );

    return (
        <>
            <FieldTasksSheetHeader
                count={curtainTasks.length}
                closeTabIndex={layerVisible ? 0 : -1}
                onClose={onClose}
            />
            <div dir="rtl" className={FIELD_TASKS_SCROLLER_CLASS}>
                {curtainTasks.length === 0 ? (
                    <FieldTasksEmptyHint />
                ) : (
                    <ul className="space-y-2.5">
                        {curtainTasks.map((task, i) => (
                            <FieldCurtainTaskCard
                                key={task.id}
                                task={task}
                                listOrdinal={{ index: i, total: curtainTasks.length }}
                                now={now}
                                pinLookup={pinLookup}
                                onCompleteRequest={onCompleteRequest}
                                onReopenTask={onReopenTask}
                                onToggleSubComplete={onToggleSubComplete}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
});

export const FieldTasksBottomSheet = memo(function FieldTasksBottomSheet({
    open,
    onClose,
    onManageAll,
    lawsuitFiles = [],
    executionFiles = [],
}: FieldTasksBottomSheetProps) {
    const { completeTask, reopenTask, toggleSubTaskComplete } = useQuantumTasksActions();
    const keyboardInsetPx = useMobileKeyboardInset(open);
    const { fatalOpen, requestComplete, confirmFatalComplete, cancelFatalComplete } =
        useFatalTaskComplete(completeTask);

    const sheetRef = useRef<HTMLDivElement>(null);
    const [sheetVisible, setSheetVisible] = useState(open);
    const [sheetHydrated, setSheetHydrated] = useState(false);
    const [sheetAnimating, setSheetAnimating] = useState(false);
    const [dragOffsetPx, setDragOffsetPx] = useState(0);

    useEffect(() => {
        if (!open) setSheetHydrated(false);
    }, [open]);

    useTasksLifecycle(open, sheetVisible, () => setSheetHydrated(true));

    useLayoutEffect(() => {
        if (!open) {
            setSheetVisible(false);
            setSheetAnimating(false);
            setDragOffsetPx(0);
            return;
        }
        setSheetVisible(true);
        setSheetAnimating(true);
        sheetRef.current?.classList.remove('hami-field-tasks-sheet--snap');
    }, [open]);

    useBodyScrollLock(open);

    const handleClose = useCallback(() => {
        if (isFieldTasksCloseSuppressed()) return;
        onClose();
    }, [onClose]);

    const handleDragOffset = useCallback((px: number) => {
        setDragOffsetPx(px);
    }, []);

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

    if (typeof document === 'undefined') return null;

    const layerVisible = open || isFieldTasksForceVisible();

    return createPortal(
        <>
            {fatalOpen ? (
                <Dialog
                    open={fatalOpen}
                    onOpenChange={(o) => {
                        if (!o) cancelFatalComplete();
                    }}
                >
                    <DialogContent className={CURTAIN_FATAL_DIALOG}>
                        <DialogHeader className="text-right sm:text-right space-y-2">
                            <DialogTitle className="text-[#E6C673] text-base font-semibold leading-relaxed">
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
                                className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold touch-manipulation"
                            >
                                تأكيد الإكمال
                            </button>
                            <button
                                type="button"
                                onClick={cancelFatalComplete}
                                className="min-h-[44px] px-4 py-2 rounded-xl border border-white/[0.1] bg-transparent text-[#F4F4F5] text-xs font-semibold touch-manipulation"
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
                className={`hami-field-tasks-layer${layerVisible ? ' hami-field-tasks-layer--visible' : ''}`}
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
                    className={`${CURTAIN_BACKDROP} ${sheetVisible ? 'opacity-100' : 'opacity-0'}`}
                    onClick={handleClose}
                />
                <div
                    ref={sheetRef}
                    role="dialog"
                    aria-modal={layerVisible ? true : undefined}
                    aria-labelledby="field-tasks-sheet-title"
                    aria-describedby="field-tasks-sheet-swipe-hint"
                    data-testid="field-tasks-sheet"
                    data-field-tasks-hydrated={sheetHydrated && sheetVisible ? 'true' : 'false'}
                    onTransitionEnd={(e) => {
                        if (e.target === sheetRef.current) setSheetAnimating(false);
                    }}
                    className={`${CURTAIN_SHEET} hami-field-tasks-sheet-motion pb-[max(0px,env(safe-area-inset-bottom))] ${
                        sheetAnimating ? 'hami-field-tasks-sheet--animating' : ''
                    } ${
                        sheetVisible && dragOffsetPx > 0 ? 'hami-field-tasks-sheet--dragging' : ''
                    } ${
                        sheetVisible ? 'translate-y-0' : 'translate-y-full'
                    }`}
                    style={{
                        zIndex: CURTAIN_SHEET_Z,
                        marginBottom: keyboardInsetPx > 0 ? keyboardInsetPx : undefined,
                        transform: sheetVisible ? `translate3d(0, ${dragOffsetPx}px, 0)` : undefined,
                    }}
                >
                    <p id="field-tasks-sheet-swipe-hint" className="sr-only">
                        اسحب المقبض للأسفل أو استخدم زر الإغلاق لإغلاق الستارة.
                    </p>
                    <FieldTasksSheetDragHandle
                        enabled={layerVisible && !fatalOpen}
                        onClose={handleClose}
                        onOffsetChange={handleDragOffset}
                    />

                    {layerVisible ? (
                        <FieldTasksSheetOpenBody
                            lawsuitFiles={lawsuitFiles}
                            executionFiles={executionFiles}
                            onCompleteRequest={requestComplete}
                            onReopenTask={handleReopenTask}
                            onToggleSubComplete={toggleSubTaskComplete}
                            layerVisible={layerVisible}
                            onClose={handleClose}
                        />
                    ) : (
                        <>
                            <FieldTasksSheetHeader closeTabIndex={-1} onClose={handleClose} />
                            <div dir="rtl" className={FIELD_TASKS_SCROLLER_CLASS}>
                                <FieldTasksEmptyHint />
                            </div>
                        </>
                    )}

                    <div className={CURTAIN_FOOTER_ROW}>
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
                            إدارة جميع المهام
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body,
    );
});
