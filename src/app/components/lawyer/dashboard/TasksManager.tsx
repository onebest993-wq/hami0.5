import React, { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import {
    blockTasksOverlayEscape,
    unblockTasksOverlayEscape,
} from '@/app/components/lawyer/dashboard/fieldTasks/tasksEscapeCoordinator';
import { TasksManagerHeader } from './tasksManager/TasksManagerHeader';
import { useTasksLifecycle } from '@/app/components/lawyer/dashboard/fieldTasks/useTasksLifecycle';
import { useQuantumTasksActions } from '@/app/hooks/useQuantumTasksContext';
import { useAuthSafe } from '@/app/context/authHooks';
import { WeeklyAgendaSection } from './tasksManager/WeeklyAgendaSection';
import { useTasksManagerController } from './tasksManager/useTasksManagerController';
import { TASKS_PAGE, TASKS_BODY } from './tasksManager/tasksBoucleTheme';
import type { ShareScope } from '@/app/types/taskHelpTypes';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import type { TaskHelpRequest } from '@/app/types/taskHelpTypes';
import { TasksManagerOverlays } from './tasksManager/TasksManagerOverlays';
import { tearDownTasksFloatingState } from './tasksManager/tearDownTasksFloatingState';
import {
    clearTasksManagerPerfMarks,
    markTasksManagerPerfPhase,
    reportTasksManagerPerf,
} from '@/app/services/tasks/tasksManagerPerfMetrics';
import { blurFocusWithin } from '@/app/utils/inertProps';
import { sanitizeProfilePlainText } from '@/app/services/profile/profileUrlSanitize';
import { redactPiiText } from '@/app/services/tasks/taskSanitizer';

const LazyCompletedTasksArchiveSection = lazyWithRetry(() =>
    import('./tasksManager/CompletedTasksArchiveSection').then((m) => ({
        default: m.CompletedTasksArchiveSection as LazyComponent,
    })),
);
const LazyFatalDeadlinesSection = lazyWithRetry(() =>
    import('./tasksManager/FatalDeadlinesSection').then((m) => ({
        default: m.FatalDeadlinesSection as unknown as LazyComponent,
    })),
);
const LazyDistantTasksSection = lazyWithRetry(() =>
    import('./tasksManager/DistantTasksSection').then((m) => ({
        default: m.DistantTasksSection as unknown as LazyComponent,
    })),
);

export type TasksManagerProps = {
    onClose: () => void;
    focusTaskId?: string;
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
    keyboardInsetPx?: number;
    surfaceOpen?: boolean;
    onPaintReady?: () => void;
};

export const TasksManager: React.FC<TasksManagerProps> = ({
    onClose,
    focusTaskId,
    lawsuitFiles = [],
    executionFiles = [],
    keyboardInsetPx = 0,
    surfaceOpen = true,
    onPaintReady,
}) => {
    const ctrl = useTasksManagerController({ focusTaskId, lawsuitFiles, executionFiles });
    const { flushPersist } = useQuantumTasksActions();
    const auth = useAuthSafe();
    const userId = auth.user?.id ?? null;
    const userName =
        (auth.user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
        auth.user?.email ||
        'محامٍ';
    const [managerHydrated, setManagerHydrated] = useState(false);
    const handlePaintReady = useCallback(() => {
        setManagerHydrated(true);
        markTasksManagerPerfPhase('first-paint');
        markTasksManagerPerfPhase('interactive');
        reportTasksManagerPerf({ surface: 'manager' });
        onPaintReady?.();
    }, [onPaintReady]);
    /** رفع القشرة عند أول تخطيط — لا انتظار storageHydrated ولا احتياطي 1200ms */
    useLayoutEffect(() => {
        if (!surfaceOpen) return;
        markTasksManagerPerfPhase('open-request');
        handlePaintReady();
        return () => {
            clearTasksManagerPerfMarks();
        };
    }, [surfaceOpen, handlePaintReady]);
    /** ثانوي (حتمي/بعيد/حوار) بعد أول طلاء — لا ينافس مقطع Overlay/TasksManager */
    useEffect(() => {
        if (!surfaceOpen || !managerHydrated) return;
        let idleId: number | null = null;
        let timeoutId: number | null = null;
        /** AbortController #2: cancel secondary surface prefetch on manager close */
        const warmAbort = new AbortController();
        const warmSecondary = () => {
            if (warmAbort.signal.aborted) return;
            void Promise.race([
                import('@/app/runtime/fieldTasksHubLoader'),
                new Promise<never>((_, reject) => {
                    warmAbort.signal.addEventListener('abort', () => reject(new Error('ABORTED')), { once: true });
                }),
            ])
                .then((m) => {
                    if (warmAbort.signal.aborted) return;
                    m.prefetchTasksManagerSecondarySurfaces();
                })
                .catch((err) => {
                    if (err?.message === 'ABORTED') return;
                    /* ignore */
                });
        };
        if (typeof requestIdleCallback === 'function') {
            idleId = requestIdleCallback(warmSecondary, { timeout: 2200 });
        } else {
            timeoutId = window.setTimeout(warmSecondary, 400);
        }
        return () => {
            warmAbort.abort();
            if (idleId != null && typeof cancelIdleCallback === 'function') {
                cancelIdleCallback(idleId);
            }
            if (timeoutId != null) window.clearTimeout(timeoutId);
        };
    }, [surfaceOpen, managerHydrated]);
    useTasksLifecycle(surfaceOpen, surfaceOpen);

    useEffect(() => {
        return () => {
            tearDownTasksFloatingState();
        };
    }, []);

    const handleClose = useCallback(() => {
        tearDownTasksFloatingState();
        onClose();
        queueMicrotask(() => {
            void flushPersist();
        });
    }, [flushPersist, onClose]);

    const reduceMotion = useReduceMotion();
    const scrollToTaskCard = useCallback((taskId: string) => {
        const node = document.querySelector(`[data-testid="tasks-task-card-${taskId}"]`);
        if (!(node instanceof HTMLElement)) return;
        node.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        node.focus({ preventScroll: true });
    }, [reduceMotion]);

    const requestTaskHelp = ctrl.requestTaskHelp;
    const updateTask = ctrl.updateTask;

    const handleRequestHelpSubmit = useCallback(
        async (params: {
            taskId: string;
            scope: ShareScope;
            targetColleagueId?: string;
            targetColleagueName?: string;
            note?: string;
        }) => {
            if (!userId) {
                SmartToast.error('يجب تسجيل الدخول لطلب المساعدة');
                throw new Error('[tasks:submit] NO_USER');
            }
            /** L4: outbound sanitize before any network/storage — applies to both PUBLIC_FORUM and Colleague scopes */
            const safeNote = params.note
                ? redactPiiText(
                      sanitizeProfilePlainText(params.note, params.scope === 'PUBLIC_FORUM' ? 1800 : 2000),
                  )
                : undefined;
            const safeTargetName = params.targetColleagueName
                ? sanitizeProfilePlainText(params.targetColleagueName, 120)
                : undefined;
            const created = await requestTaskHelp({
                taskId: params.taskId,
                scope: params.scope,
                requesterId: userId,
                requesterName: userName,
                targetColleagueId: params.targetColleagueId,
                targetColleagueName: safeTargetName,
                note: safeNote,
            });
            if (!created) {
                SmartToast.error('تعذر إنشاء طلب المساعدة');
                throw new Error('[tasks:submit] CREATE_FAILED');
            }
            SmartToast.success(
                params.scope === 'PUBLIC_FORUM'
                    ? 'تم نشر طلب المساعدة العام (بعد التصفية)'
                    : 'تم إرسال طلب المساعدة للزميل',
            );
        },
        [userId, userName, requestTaskHelp],
    );

    const syncHelpLocal = useCallback(
        (req: TaskHelpRequest) => {
            void import('@/app/services/taskHelp/quantumTaskHelpActions').then((m) => {
                updateTask(req.sourceTaskId, m.helpFieldsPatchFromRequest(req));
            });
        },
        [updateTask],
    );

    useEffect(() => {
        if (!surfaceOpen || (!ctrl.helpInboxOpen && ctrl.helpTarget === null)) return;
        blockTasksOverlayEscape('manager-help');
        return () => unblockTasksOverlayEscape('manager-help');
    }, [surfaceOpen, ctrl.helpInboxOpen, ctrl.helpTarget]);

    /**
     * الحوارات تُنقل إلى hami-tasks-modal-root؛ Radix يخفي #hami-overlay-portal.
     * لا تُخفَ الأجندة نفسها بـ aria-hidden (الأزرار ما زالت داخلها) — فقط أزل التركيز قبل الإخفاء.
     */
    const pageRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (!ctrl.nestedModalOpen) return;
        blurFocusWithin(pageRef.current);
    }, [ctrl.nestedModalOpen]);

    const bodyStyle =
        keyboardInsetPx > 0
            ? ({ paddingBottom: `${64 + keyboardInsetPx}px` } as React.CSSProperties)
            : undefined;

    const pageStyle =
        keyboardInsetPx > 0
            ? ({ paddingBottom: `${keyboardInsetPx}px` } as React.CSSProperties)
            : undefined;

    return (
        <div
            ref={pageRef}
            className={TASKS_PAGE}
            role="dialog"
            aria-modal={ctrl.nestedModalOpen ? undefined : true}
            aria-label="أجندة المهام"
            data-testid="tasks-manager"
            data-tasks-manager-hydrated={managerHydrated ? 'true' : 'false'}
            style={pageStyle}
        >
            <TasksManagerOverlays
                ctrl={ctrl}
                userId={userId}
                userName={userName}
                onRequestHelpSubmit={handleRequestHelpSubmit}
                syncHelpLocal={syncHelpLocal}
            />

            <TasksManagerHeader
                showCompletedArchive={ctrl.showCompletedArchive}
                onOpenHelpInbox={ctrl.openHelpInbox}
                onToggleCompletedArchive={ctrl.toggleCompletedArchive}
                onClose={handleClose}
            />

            <div className={`${TASKS_BODY} relative z-[1]`} style={bodyStyle}>
                {ctrl.showCompletedArchive ? (
                    <Suspense fallback={null}>
                        <LazyCompletedTasksArchiveSection
                            tasks={ctrl.tasks}
                            now={ctrl.now}
                            onBack={ctrl.hideCompletedArchive}
                            onReopen={ctrl.reopenArchivedTask}
                        />
                    </Suspense>
                ) : (
                    <>
                        <Suspense fallback={null}>
                            <LazyFatalDeadlinesSection
                                fatalTasks={ctrl.fatalTasks}
                                onSelectFatalTask={scrollToTaskCard}
                            />
                        </Suspense>

                        <WeeklyAgendaSection
                            weeklyDayBlocks={ctrl.weeklyDayBlocks}
                            weekAdd={ctrl.weekAdd}
                            setWeekAdd={ctrl.setWeekAdd}
                            openWeekAdd={ctrl.openWeekAdd}
                            saveWeekBundle={ctrl.saveWeekBundle}
                            renderTaskCard={ctrl.renderTaskCard}
                            now={ctrl.now}
                        />

                        <Suspense fallback={null}>
                            <LazyDistantTasksSection
                                distantTasks={ctrl.distantTasks}
                                snoozePanelOpen={ctrl.snoozePanelOpen}
                                setSnoozePanelOpen={ctrl.setSnoozePanelOpen}
                                saveSnoozedTask={ctrl.saveSnoozedTask}
                                minSnoozeIso={ctrl.minSnoozeIso}
                                renderTaskCard={ctrl.renderTaskCard}
                                now={ctrl.now}
                            />
                        </Suspense>
                    </>
                )}
            </div>
        </div>
    );
};
