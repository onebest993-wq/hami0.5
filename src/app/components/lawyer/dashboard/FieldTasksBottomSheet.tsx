import { lazy, memo, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { inertProps } from '@/app/utils/inertProps';
import './fieldTasks/fieldTasksChrome.css';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import type { LegalTask } from '@/app/types/TaskEngine';
import { useQuantumTasksActions } from '@/app/hooks/useQuantumTasksContext';
import { useFatalTaskComplete } from '@/app/hooks/useFatalTaskComplete';
import {
    CURTAIN_BTN_MANAGE,
    CURTAIN_FOOTER_ROW,
    CURTAIN_SHEET,
    CURTAIN_BACKDROP,
} from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';
import { FieldTasksSheetDragHandle } from '@/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetDragHandle';
import { useTasksLifecycle } from '@/app/components/lawyer/dashboard/fieldTasks/useTasksLifecycle';
import {
    blockTasksOverlayEscape,
    unblockTasksOverlayEscape,
} from '@/app/components/lawyer/dashboard/fieldTasks/tasksEscapeCoordinator';
import { isFieldTasksCloseSuppressed, isFieldTasksForceVisible, clearFieldTasksForceVisible, suppressFieldTasksClose, FIELD_TASKS_CLOSE_SUPPRESS_MS, removeFieldTasksInstantChrome, unlockFieldTasksLayerHits } from '@/app/runtime/fieldTasksInstantPaint';
import {
    drainFieldTasksInstantCompleteQueue,
    FIELD_TASKS_INSTANT_COMPLETE_EVENT,
} from '@/app/runtime/fieldTasksInstantActions';
import { getPendingFieldTasksCountSnapshot, getQuantumPendingSnapshot } from '@/app/utils/quantumTasksMetrics';
import { listFieldDaySheetTasks } from '@/app/services/tasks/fieldCurtainTasks';
import { FIELD_TASKS_CURTAIN_PEEK_READY_EVENT } from '@/app/utils/quantumTasksCurtainPeek';
import { isFieldTasksShellSnappedOpen } from '@/app/services/fieldTasks/fieldTasksShellSnap';
import { FieldTasksSheetOpenBody } from '@/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetChrome';
import { tearDownTasksFloatingState } from '@/app/components/lawyer/dashboard/tasksManager/tearDownTasksFloatingState';

const FieldTasksFatalDialog = lazy(() =>
    import('@/app/components/lawyer/dashboard/fieldTasks/FieldTasksFatalDialog').then((m) => ({
        default: m.FieldTasksFatalDialog,
    })),
);

type FieldTasksBottomSheetProps = {
    open: boolean;
    onClose: () => void;
    onManageAll: () => void;
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
};

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
    const layerRootRef = useRef<HTMLDivElement>(null);
    const [sheetVisible, setSheetVisible] = useState(
        () => open || isFieldTasksForceVisible() || isFieldTasksShellSnappedOpen(),
    );
    const [sheetHydrated, setSheetHydrated] = useState(false);
    const [sheetAnimating, setSheetAnimating] = useState(false);
    const [dragOffsetPx, setDragOffsetPx] = useState(0);
    const closeArmedRef = useRef(false);

    useLayoutEffect(() => {
        if (!open) {
            closeArmedRef.current = false;
            return;
        }
        closeArmedRef.current = false;
        suppressFieldTasksClose(FIELD_TASKS_CLOSE_SUPPRESS_MS);
        const timer = window.setTimeout(() => {
            closeArmedRef.current = true;
        }, FIELD_TASKS_CLOSE_SUPPRESS_MS);
        return () => window.clearTimeout(timer);
    }, [open]);

    useLayoutEffect(() => {
        if (!(open && !fatalOpen)) return;
        const unlock = () => {
            const root = layerRootRef.current;
            if (root) unlockFieldTasksLayerHits(root);
        };
        unlock();
        const frame = window.requestAnimationFrame(unlock);
        return () => window.cancelAnimationFrame(frame);
    }, [open, fatalOpen]);

    useEffect(() => {
        if (!open) setSheetHydrated(false);
    }, [open]);

    useEffect(() => {
        return () => {
            clearFieldTasksForceVisible();
        };
    }, []);

    useTasksLifecycle(open, sheetVisible, () => setSheetHydrated(true));

    useEffect(() => {
        if (!sheetHydrated) return;
        void import('@/app/components/lawyer/dashboard/fieldTasks/FieldTasksFatalDialog');
    }, [sheetHydrated]);

    useLayoutEffect(() => {
        if (!open) {
            setSheetVisible(false);
            setSheetAnimating(false);
            setDragOffsetPx(0);
            return;
        }
        const handover = isFieldTasksForceVisible() || isFieldTasksShellSnappedOpen();
        setSheetVisible(true);
        setSheetAnimating(!handover);
        if (handover) {
            sheetRef.current?.classList.add('hami-field-tasks-sheet--snap');
        } else {
            sheetRef.current?.classList.remove('hami-field-tasks-sheet--snap');
        }
    }, [open]);

    useLayoutEffect(() => {
        if (!open || !sheetHydrated) return;
        const releaseChrome = () => {
            removeFieldTasksInstantChrome();
            clearFieldTasksForceVisible();
        };
        const curtainReady =
            listFieldDaySheetTasks(getQuantumPendingSnapshot(), new Date()).length > 0 ||
            getPendingFieldTasksCountSnapshot() === 0;
        if (curtainReady) {
            releaseChrome();
            return;
        }
        const onPeekReady = () => releaseChrome();
        window.addEventListener(FIELD_TASKS_CURTAIN_PEEK_READY_EVENT, onPeekReady);
        const fallback = window.setTimeout(releaseChrome, 800);
        return () => {
            window.removeEventListener(FIELD_TASKS_CURTAIN_PEEK_READY_EVENT, onPeekReady);
            window.clearTimeout(fallback);
        };
    }, [open, sheetHydrated]);

    useBodyScrollLock(open);

    const handleClose = useCallback(() => {
        tearDownTasksFloatingState();
        onClose();
    }, [onClose]);

    const handleBackdropDismiss = useCallback(
        (event: { preventDefault: () => void; stopPropagation: () => void }) => {
            event.preventDefault();
            event.stopPropagation();
            /** نقرة الشبح من الدوك تصيب الخلفية فقط — الإغلاق والأزرار فورية */
            if (!closeArmedRef.current || isFieldTasksCloseSuppressed()) return;
            tearDownTasksFloatingState();
            onClose();
        },
        [onClose],
    );

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
        if (!open) return;
        const completeByIds = (ids: string[]) => {
            const unique = [...new Set(ids.filter(Boolean))];
            const pending = getQuantumPendingSnapshot();
            for (const id of unique) {
                const task = pending.find((item) => item.id === id);
                if (task) requestComplete(task);
            }
        };
        completeByIds(drainFieldTasksInstantCompleteQueue());
        const onInstantComplete = (event: Event) => {
            const id = (event as CustomEvent<{ taskId?: string }>).detail?.taskId;
            completeByIds(id ? [id, ...drainFieldTasksInstantCompleteQueue()] : drainFieldTasksInstantCompleteQueue());
        };
        window.addEventListener(FIELD_TASKS_INSTANT_COMPLETE_EVENT, onInstantComplete);
        return () => window.removeEventListener(FIELD_TASKS_INSTANT_COMPLETE_EVENT, onInstantComplete);
    }, [open, requestComplete]);

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
    /** لا تسرق نقرات الرئيسية إذا بقي كشف DOM عالقاً بينما React ما زال مغلقاً */
    const layerInteractive = open && !fatalOpen;

    return createPortal(
        <>
            {fatalOpen ? (
                <Suspense fallback={null}>
                    <FieldTasksFatalDialog
                        open={fatalOpen}
                        onConfirm={confirmFatalComplete}
                        onCancel={cancelFatalComplete}
                    />
                </Suspense>
            ) : null}

            <div
                ref={layerRootRef}
                data-field-tasks-root=""
                data-open={layerVisible ? 'true' : 'false'}
                data-interactive={layerInteractive ? 'true' : 'false'}
                aria-hidden={!layerInteractive}
                className={`hami-field-tasks-layer${layerVisible ? ' hami-field-tasks-layer--visible' : ''}`}
                style={{
                    opacity: layerVisible ? 1 : 0,
                    visibility: layerVisible ? 'visible' : 'hidden',
                    pointerEvents: layerInteractive ? 'auto' : 'none',
                }}
                {...inertProps(!layerInteractive)}
            >
                <button
                    type="button"
                    aria-label="إغلاق الستارة"
                    tabIndex={layerInteractive ? 0 : -1}
                    className={`${CURTAIN_BACKDROP} ${sheetVisible ? 'opacity-100' : 'opacity-0'}`}
                    onClick={handleBackdropDismiss}
                    onPointerUp={handleBackdropDismiss}
                />
                <div
                    ref={sheetRef}
                    role="dialog"
                    aria-modal={layerInteractive ? true : undefined}
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
                        marginBottom: keyboardInsetPx > 0 ? keyboardInsetPx : undefined,
                        transform: sheetVisible ? `translate3d(0, ${dragOffsetPx}px, 0)` : undefined,
                    }}
                >
                    <p id="field-tasks-sheet-swipe-hint" className="sr-only">
                        اسحب المقبض للأسفل أو استخدم زر الإغلاق لإغلاق الستارة.
                    </p>
                    <FieldTasksSheetDragHandle
                        enabled={layerInteractive}
                        onClose={handleClose}
                        onOffsetChange={handleDragOffset}
                    />

                    <FieldTasksSheetOpenBody
                        lawsuitFiles={lawsuitFiles}
                        executionFiles={executionFiles}
                        onCompleteRequest={requestComplete}
                        onReopenTask={handleReopenTask}
                        onToggleSubComplete={toggleSubTaskComplete}
                        layerVisible={layerVisible}
                        onClose={handleClose}
                    />

                    <div className={CURTAIN_FOOTER_ROW}>
                        <button
                            type="button"
                            data-testid="field-tasks-manage-all"
                            tabIndex={layerInteractive ? 0 : -1}
                            onPointerDown={() => {
                                void import('@/app/runtime/fieldTasksHubLoader')
                                    .then((m) => m.loadTasksManagerModule())
                                    .catch(() => undefined);
                            }}
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
