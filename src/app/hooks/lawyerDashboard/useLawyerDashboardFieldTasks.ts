import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    FIELD_TASKS_SHELL_FEATURE,
    openFieldTasksFromShell,
} from '@/app/services/fieldTasks/fieldTasksShellNavigation';
import { warmFieldTasksOnOpen } from '@/app/hooks/lawyerDashboard/fieldTasksIntentWarm';
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
    warmQuantumTasksDiskRead,
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
    const [initialSession] = useState(() => readInitialFieldTasksSession());
    const [fieldTasksSheetSessionKey, setFieldTasksSheetSessionKey] = useState(0);
    const [fieldTasksHostMounted, setFieldTasksHostMounted] = useState(
        () => initialSession.open && initialSession.surface === 'sheet',
    );
    const [fieldTasksManagerHostMounted, setFieldTasksManagerHostMounted] = useState(
        () => initialSession.open && initialSession.surface === 'manager',
    );
    const [fieldTasksSheetOpen, setFieldTasksSheetOpen] = useState(() => {
        const open = initialSession.open && initialSession.surface === 'sheet';
        if (open) warmQuantumTasksDiskRead();
        return open;
    });
    const [showTasksManager, setShowTasksManager] = useState(
        () => initialSession.open && initialSession.surface === 'manager',
    );
    const [tasksManagerFocusTaskId, setTasksManagerFocusTaskId] = useState<string | undefined>();
    const [tasksManagerSessionKey, setTasksManagerSessionKey] = useState(0);
    const sheetOpenRef = useRef(false);
    sheetOpenRef.current = fieldTasksSheetOpen;

    const { instantPaintRef, withInstantPaint } = useFieldTasksInstantPaintRef();

    const closeFieldTasksSheet = useCallback(() => {
        concealFieldTasksInstantLayer(withInstantPaint);
        sheetOpenRef.current = false;
        setFieldTasksSheetOpen(false);
        persistFieldTasksSessionOpen(false);
    }, [withInstantPaint]);

    const closeTasksManager = useCallback(() => {
        concealFieldTasksInstantLayer(withInstantPaint);
        setTasksManagerFocusTaskId(undefined);
        setShowTasksManager(false);
        persistFieldTasksSessionOpen(false);
    }, [withInstantPaint]);

    const primeFieldTasksShellMount = useCallback(() => {
        primeFieldTasksHostMount(setFieldTasksHostMounted);
    }, []);

    const armFieldTasksManagerHost = useCallback(() => {
        setFieldTasksManagerHostMounted(true);
    }, []);

    useEffect(() => {
        const closeField = () => {
            concealFieldTasksInstantLayer(withInstantPaint);
            sheetOpenRef.current = false;
            setFieldTasksSheetOpen(false);
            persistFieldTasksSessionOpen(false);
        };
        const closeManager = () => {
            concealFieldTasksInstantLayer(withInstantPaint);
            setShowTasksManager(false);
            setTasksManagerFocusTaskId(undefined);
            persistFieldTasksSessionOpen(false);
        };
        const unregField = registerDashboardOverlayCloser('field-tasks', closeField);
        const unregManager = registerDashboardOverlayCloser('tasks-manager', closeManager);
        return () => {
            unregField();
            unregManager();
        };
    }, [withInstantPaint]);

    useLawyerDashboardTasksOverlayEscape({
        fieldTasksSheetOpen,
        showTasksManager,
        onCloseFieldTasksSheet: closeFieldTasksSheet,
        onCloseTasksManager: closeTasksManager,
    });

    /** جلسة مهام مفتوحة بلا هوية — أغلق وامسح الـ hosts (T2) */
    useEffect(() => {
        if (isRealSignedIn(userId)) return;
        concealFieldTasksInstantLayer(withInstantPaint);
        sheetOpenRef.current = false;
        setFieldTasksSheetOpen(false);
        setShowTasksManager(false);
        setTasksManagerFocusTaskId(undefined);
        setFieldTasksHostMounted(false);
        setFieldTasksManagerHostMounted(false);
        persistFieldTasksSessionOpen(false);
    }, [userId, withInstantPaint]);

    useKeepAliveIdleRelease(fieldTasksSheetOpen, () => setFieldTasksHostMounted(false));
    useKeepAliveIdleRelease(showTasksManager, () => setFieldTasksManagerHostMounted(false));

    useFieldTasksHostLifecycle({
        initialSessionOpen: initialSession.open,
        initialSessionSurface: initialSession.surface,
        fieldTasksSheetOpen,
        armFieldTasksManagerHost,
    });

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
            signedIn: isRealSignedIn(userId),
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${FIELD_TASKS_SHELL_FEATURE}`),
            onOpen: () => {
                if (sheetOpenRef.current) return;
                sheetOpenRef.current = true;
                commitFieldTasksSheetOpen({
                    sheetOpenRef,
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
        warmFieldTasksOnOpen();
        void loadFieldTasksBootHydrator()
            .then((m) => m.hydrateFieldTasksShellForInstantOpen(true))
            .catch(() => undefined);
        void loadFieldTasksHubLoader()
            .then((m) => m.loadTasksManagerModule())
            .catch(() => undefined);
    }, []);

    const openTasksManager = useCallback(
        (focusTaskId?: string) => {
            openFieldTasksFromShell({
                signedIn: isRealSignedIn(userId),
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
        if (!isRealSignedIn(userId)) {
            SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${FIELD_TASKS_SHELL_FEATURE}`);
            return;
        }
        commitTasksManagerOpen({
            armFieldTasksManagerHost,
            revealTasksManager,
            afterOpen: () => {
                void loadFieldTasksBootHydrator()
                    .then((m) => m.hydrateFieldTasksShellForInstantOpen(true))
                    .catch(() => undefined);
                void loadFieldTasksHubLoader()
                    .then((m) => m.loadTasksManagerModule())
                    .catch(() => undefined);
            },
        });
    }, [armFieldTasksManagerHost, revealTasksManager, userId]);

    useEffect(() => {
        const onOpenHelpInbox = () => openTasksManager();
        window.addEventListener(HAMI_OPEN_TASKS_HELP_INBOX_EVENT, onOpenHelpInbox);
        return () => window.removeEventListener(HAMI_OPEN_TASKS_HELP_INBOX_EVENT, onOpenHelpInbox);
    }, [openTasksManager]);

    const resetFieldTasksShell = useCallback(() => {
        withInstantPaint((m) => {
            m.concealFieldTasksWarmSheet();
            m.clearFieldTasksForceVisible();
            m.clearFieldTasksInstantPaint();
        });
        setFieldTasksSheetSessionKey((k) => k + 1);
        setTasksManagerSessionKey((k) => k + 1);
        sheetOpenRef.current = false;
        setFieldTasksSheetOpen(false);
        setShowTasksManager(false);
        setTasksManagerFocusTaskId(undefined);
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
