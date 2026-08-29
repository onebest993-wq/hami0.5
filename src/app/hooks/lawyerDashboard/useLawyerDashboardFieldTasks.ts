import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
import {
    FIELD_TASKS_SHELL_FEATURE,
    openFieldTasksFromShell,
} from '@/app/services/fieldTasks/fieldTasksShellNavigation';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import { FIELD_TASKS_PRIME_HOST_EVENT } from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksPrimeHost';
function loadFieldTasksIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/fieldTasksIntentWarm');
}
import { useLawyerDashboardTasksOverlayEscape } from '@/app/hooks/lawyerDashboard/useLawyerDashboardTasksOverlayEscape';
import { useKeepAliveIdleRelease } from '@/app/hooks/lawyerDashboard/useKeepAliveIdleRelease';
import {
    HAMI_OPEN_TASKS_HELP_INBOX_EVENT,
    persistFieldTasksSessionOpen,
    readInitialFieldTasksSession,
    type LawyerDashboardTab,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import {
    loadFieldTasksBootHydrator,
    loadFieldTasksHubLoader,
} from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports';
import {
    commitFieldTasksSheetOpen,
    commitTasksManagerOpen,
} from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksShellOpenFlow';
import {
    concealFieldTasksInstantLayer,
    useFieldTasksInstantPaintRef,
} from '@/app/hooks/lawyerDashboard/fieldTasks/useFieldTasksInstantPaint';
import {
    primeFieldTasksHostMount,
    useFieldTasksHostLifecycle,
} from '@/app/hooks/lawyerDashboard/fieldTasks/useFieldTasksHostLifecycle';
import {
    executeFieldTasksOverlayClose,
    executeTasksManagerOverlayClose,
} from '@/app/runtime/overlaySnapClose';
import { beginHubLayerExit } from '@/app/runtime/overlayHubLayerMotion';
import {
    FIELD_TASKS_HUB_LAYER,
    TASKS_MANAGER_HUB_LAYER,
} from '@/app/runtime/overlayHubLayerSpecs';
import {
    isFieldTasksShellSnappedOpen,
    isTasksManagerShellSnappedOpen,
    snapFieldTasksShellClose,
    snapFieldTasksShellOpen,
    snapTasksManagerShellClose,
    snapTasksManagerShellOpen,
} from '@/app/services/fieldTasks/fieldTasksShellSnap';
import { blurFocusWithin } from '@/app/utils/inertProps';
import { deferShellConcealAfterHandoff, isShellHandoffPending } from '@/app/runtime/sectionShellHandoff';

export type UseLawyerDashboardFieldTasksParams = {
    userId: string | null;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    closeCommunity?: () => void;
};

export function useLawyerDashboardFieldTasks({
    userId,
    setActiveTab,
    closeCommunity,
}: UseLawyerDashboardFieldTasksParams) {
    useState(() => readInitialFieldTasksSession());
    const [fieldTasksSheetSessionKey, setFieldTasksSheetSessionKey] = useState(0);
    const [fieldTasksHostMounted, setFieldTasksHostMounted] = useState(false);
    const [fieldTasksManagerHostMounted, setFieldTasksManagerHostMounted] = useState(false);
    const [fieldTasksSheetOpen, setFieldTasksSheetOpen] = useState(false);
    const [showTasksManager, setShowTasksManager] = useState(false);
    const [tasksManagerFocusTaskId, setTasksManagerFocusTaskId] = useState<string | undefined>();
    const [tasksManagerSessionKey, setTasksManagerSessionKey] = useState(0);
    const sheetOpenRef = useRef(false);
    const closingFieldRef = useRef(false);
    const closingManagerRef = useRef(false);
    sheetOpenRef.current = fieldTasksSheetOpen;

    const { instantPaintRef, withInstantPaint } = useFieldTasksInstantPaintRef();

    const closeFieldTasksSheet = useCallback(() => {
        if (closingFieldRef.current) return;
        closingFieldRef.current = true;
        beginHubLayerExit(FIELD_TASKS_HUB_LAYER, () => {
            sheetOpenRef.current = false;
            executeFieldTasksOverlayClose({
                conceal: () => {
                    if (typeof document !== 'undefined') {
                        const root = document.querySelector('[data-field-tasks-root]');
                        blurFocusWithin(root instanceof HTMLElement ? root : null);
                    }
                    concealFieldTasksInstantLayer(withInstantPaint);
                    snapFieldTasksShellClose();
                },
                commit: () => {
                    flushSync(() => {
                        setFieldTasksSheetOpen(false);
                        setFieldTasksHostMounted(false);
                        persistFieldTasksSessionOpen(false);
                    });
                    closingFieldRef.current = false;
                },
            });
        });
    }, [withInstantPaint]);

    const closeTasksManager = useCallback(() => {
        if (closingManagerRef.current) return;
        closingManagerRef.current = true;
        beginHubLayerExit(TASKS_MANAGER_HUB_LAYER, () => {
            executeTasksManagerOverlayClose({
                conceal: () => {
                    if (typeof document !== 'undefined') {
                        const overlay = document.querySelector('[data-testid="tasks-manager-overlay"]');
                        blurFocusWithin(overlay instanceof HTMLElement ? overlay : null);
                    }
                    concealFieldTasksInstantLayer(withInstantPaint);
                    snapTasksManagerShellClose();
                },
                commit: () => {
                    flushSync(() => {
                        setTasksManagerFocusTaskId(undefined);
                        setShowTasksManager(false);
                        setFieldTasksManagerHostMounted(false);
                        persistFieldTasksSessionOpen(false);
                    });
                    closingManagerRef.current = false;
                },
            });
        });
    }, [withInstantPaint]);

    const primeFieldTasksShellMount = useCallback(() => {
        primeFieldTasksHostMount();
        queueMicrotask(() => {
            void ensureDeferredFeatureStylesLoaded();
        });
    }, []);

    /** تسخين المقطع فور تسجيل الدخول — بلا تركيب Host حتى الفتح */
    useLayoutEffect(() => {
        if (!hasLocalAppSession(userId)) return;
        primeFieldTasksShellMount();
        void loadFieldTasksIntentWarm().then((m) => m.warmFieldTasksOnHover());
    }, [primeFieldTasksShellMount, userId]);

    useEffect(() => {
        if (!hasLocalAppSession(userId)) return;
        const warmAfterReveal = () => {
            void loadFieldTasksBootHydrator()
                .then((m) => m.prefetchFieldTasksAfterBootReveal())
                .catch(() => undefined);
        };
        if (isBootRevealDone()) {
            warmAfterReveal();
        } else {
            window.addEventListener(BOOT_REVEAL_DONE_EVENT, warmAfterReveal, { once: true });
        }
        const unbindInteractive = onDashboardInteractive(() => {
            void loadFieldTasksIntentWarm().then((m) => m.warmFieldTasksOnHover());
        });
        return () => {
            window.removeEventListener(BOOT_REVEAL_DONE_EVENT, warmAfterReveal);
            unbindInteractive();
        };
    }, [userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onPrime = () => {
            primeFieldTasksShellMount();
            void loadFieldTasksIntentWarm().then((m) => m.warmFieldTasksOnOpen());
        };
        window.addEventListener(FIELD_TASKS_PRIME_HOST_EVENT, onPrime);
        return () => window.removeEventListener(FIELD_TASKS_PRIME_HOST_EVENT, onPrime);
    }, [primeFieldTasksShellMount]);

    const armFieldTasksManagerHost = useCallback(() => {
        setFieldTasksManagerHostMounted(true);
    }, []);

    useEffect(() => {
        const unregField = registerDashboardOverlayCloser('field-tasks', closeFieldTasksSheet);
        const unregManager = registerDashboardOverlayCloser('tasks-manager', closeTasksManager);
        return () => {
            unregField();
            unregManager();
        };
    }, [closeFieldTasksSheet, closeTasksManager]);

    useLawyerDashboardTasksOverlayEscape({
        fieldTasksSheetOpen,
        showTasksManager,
        onCloseFieldTasksSheet: closeFieldTasksSheet,
        onCloseTasksManager: closeTasksManager,
    });

    /** جلسة مهام مفتوحة بلا هوية — أغلق وامسح الـ hosts (T2) */
    useEffect(() => {
        if (hasLocalAppSession(userId)) return;
        closingFieldRef.current = false;
        closingManagerRef.current = false;
        concealFieldTasksInstantLayer(withInstantPaint);
        sheetOpenRef.current = false;
        snapFieldTasksShellClose();
        snapTasksManagerShellClose();
        setFieldTasksSheetOpen(false);
        setShowTasksManager(false);
        setTasksManagerFocusTaskId(undefined);
        setFieldTasksHostMounted(false);
        setFieldTasksManagerHostMounted(false);
        persistFieldTasksSessionOpen(false);
    }, [userId, withInstantPaint]);

    useKeepAliveIdleRelease(fieldTasksSheetOpen, () => setFieldTasksHostMounted(false));
    useKeepAliveIdleRelease(showTasksManager, () => setFieldTasksManagerHostMounted(false));

    useFieldTasksHostLifecycle();

    useLayoutEffect(() => {
        if (fieldTasksSheetOpen) {
            snapFieldTasksShellOpen();
            return;
        }
        return deferShellConcealAfterHandoff(() => {
            if (isShellHandoffPending('field-tasks') || sheetOpenRef.current) return;
            if (isFieldTasksShellSnappedOpen()) {
                snapFieldTasksShellClose();
            }
        });
    }, [fieldTasksSheetOpen]);

    useLayoutEffect(() => {
        if (showTasksManager) {
            snapTasksManagerShellOpen();
            return;
        }
        return deferShellConcealAfterHandoff(() => {
            if (isShellHandoffPending('tasks-manager')) return;
            if (isTasksManagerShellSnappedOpen()) {
                snapTasksManagerShellClose();
            }
        });
    }, [showTasksManager]);

    useEffect(() => {
        if (showTasksManager) {
            persistFieldTasksSessionOpen(true, 'manager');
            return;
        }
        if (fieldTasksSheetOpen) {
            persistFieldTasksSessionOpen(true, 'sheet');
            return;
        }
        persistFieldTasksSessionOpen(false);
    }, [fieldTasksSheetOpen, showTasksManager]);

    const revealTasksManager = useCallback(
        (focusTaskId?: string) => {
            concealFieldTasksInstantLayer(withInstantPaint);
            sheetOpenRef.current = false;
            setFieldTasksSheetOpen(false);
            closeCommunity?.();
            setActiveTab('home');
            setTasksManagerFocusTaskId(focusTaskId);
            setShowTasksManager(true);
            persistFieldTasksSessionOpen(true, 'manager');
        },
        [closeCommunity, setActiveTab, withInstantPaint],
    );

    const openFieldTasksSheet = useCallback(() => {
        openFieldTasksFromShell({
            signedIn: hasLocalAppSession(userId),
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${FIELD_TASKS_SHELL_FEATURE}`),
            onOpen: () => {
                if (sheetOpenRef.current) return;
                sheetOpenRef.current = true;
                commitFieldTasksSheetOpen({
                    instantPaint: instantPaintRef.current,
                    setFieldTasksHostMounted,
                    setTasksManagerFocusTaskId,
                    setShowTasksManager,
                    setFieldTasksSheetOpen,
                    closeCommunity,
                    setActiveTab: () => setActiveTab('home'),
                });
            },
        });
    }, [closeCommunity, instantPaintRef, setActiveTab, userId]);

    const afterTasksManagerOpen = useCallback(() => {
        void loadFieldTasksHubLoader()
            .then((m) => m.loadTasksManagerModule())
            .catch(() => undefined);
    }, []);

    const openTasksManager = useCallback(
        (focusTaskId?: string) => {
            openFieldTasksFromShell({
                signedIn: hasLocalAppSession(userId),
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${FIELD_TASKS_SHELL_FEATURE}`),
                onOpen: () => {
                    commitTasksManagerOpen({
                        focusTaskId,
                        armFieldTasksManagerHost,
                        revealTasksManager,
                        afterOpen: afterTasksManagerOpen,
                    });
                },
            });
        },
        [afterTasksManagerOpen, armFieldTasksManagerHost, revealTasksManager, userId],
    );

    const switchToTasksManager = useCallback(() => {
        if (!hasLocalAppSession(userId)) {
            SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${FIELD_TASKS_SHELL_FEATURE}`);
            return;
        }
        commitTasksManagerOpen({
            armFieldTasksManagerHost,
            revealTasksManager,
            afterOpen: afterTasksManagerOpen,
        });
    }, [afterTasksManagerOpen, armFieldTasksManagerHost, revealTasksManager, userId]);

    useEffect(() => {
        const onOpenHelpInbox = () => openTasksManager();
        window.addEventListener(HAMI_OPEN_TASKS_HELP_INBOX_EVENT, onOpenHelpInbox);
        return () => window.removeEventListener(HAMI_OPEN_TASKS_HELP_INBOX_EVENT, onOpenHelpInbox);
    }, [openTasksManager]);

    const resetFieldTasksShell = useCallback(() => {
        withInstantPaint((m) => {
            m.concealFieldTasksWarmSheet();
            m.clearFieldTasksForceVisible();
        });
        setFieldTasksSheetSessionKey((k) => k + 1);
        setTasksManagerSessionKey((k) => k + 1);
        closingFieldRef.current = false;
        closingManagerRef.current = false;
        sheetOpenRef.current = false;
        snapFieldTasksShellClose();
        snapTasksManagerShellClose();
        setFieldTasksSheetOpen(false);
        setShowTasksManager(false);
        setTasksManagerFocusTaskId(undefined);
        setFieldTasksHostMounted(false);
        setFieldTasksManagerHostMounted(false);
        persistFieldTasksSessionOpen(false);
    }, [withInstantPaint]);

    return {
        fieldTasksSheetSessionKey,
        fieldTasksHostMounted,
        fieldTasksManagerHostMounted,
        fieldTasksSheetOpen,
        showTasksManager,
        tasksManagerFocusTaskId,
        tasksManagerSessionKey,
        primeFieldTasksShellMount,
        resetFieldTasksShell,
        openFieldTasksSheet,
        openTasksManager,
        switchToTasksManager,
        closeFieldTasksSheet,
        closeTasksManager,
    };
}
