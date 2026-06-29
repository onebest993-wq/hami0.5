import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    FIELD_TASKS_SHELL_FEATURE,
    openFieldTasksFromShell,
} from '@/app/services/fieldTasks/fieldTasksShellNavigation';
import {
    warmFieldTasksOnHover,
    warmFieldTasksOnOpen,
} from '@/app/hooks/lawyerDashboard/fieldTasksIntentWarm';
import { loadFieldTasksHubModule, prefetchFieldTasksHubModule } from '@/app/runtime/fieldTasksHubLoader';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { useLawyerDashboardTasksOverlayEscape } from '@/app/hooks/lawyerDashboard/useLawyerDashboardTasksOverlayEscape';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    dismissTransientOverlays,
    HAMI_DISMISS_OVERLAYS_EVENT,
    releaseBodyScrollLock,
    type TransientOverlayId,
} from '@/app/utils/bodyScrollLock';

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
    const [fieldTasksSheetSessionKey, setFieldTasksSheetSessionKey] = useState(0);
    const [fieldTasksSheetOpen, setFieldTasksSheetOpen] = useState(false);
    const [showTasksManager, setShowTasksManager] = useState(false);
    const [tasksManagerFocusTaskId, setTasksManagerFocusTaskId] = useState<string | undefined>();
    const [tasksManagerSessionKey, setTasksManagerSessionKey] = useState(0);

    const closeFieldTasksSheet = useCallback(() => {
        setFieldTasksSheetOpen(false);
    }, []);

    const closeTasksManager = useCallback(() => {
        setTasksManagerFocusTaskId(undefined);
        setShowTasksManager(false);
    }, []);

    const primeFieldTasksShellMount = useCallback(() => {
        warmFieldTasksOnHover();
    }, []);

    useEffect(() => {
        if (!isRealSignedIn(userId)) return;
        return scheduleIdleWork(
            () => {
                prefetchFieldTasksHubModule();
            },
            { minDelayMs: 4_000, timeoutMs: 12_000 },
        );
    }, [userId]);

    useEffect(() => {
        const onPageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                setFieldTasksSheetOpen(false);
                setShowTasksManager(false);
            }
        };
        window.addEventListener('pageshow', onPageShow);
        return () => window.removeEventListener('pageshow', onPageShow);
    }, []);

    useEffect(() => {
        const onDismiss = (e: Event) => {
            const except = (e as CustomEvent<{ except?: TransientOverlayId }>).detail?.except;
            if (except !== 'field-tasks') {
                setFieldTasksSheetOpen(false);
            }
            if (except !== 'tasks-manager') {
                setShowTasksManager(false);
                setTasksManagerFocusTaskId(undefined);
            }
            if (except == null) {
                releaseBodyScrollLock();
            }
        };
        window.addEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
        return () => window.removeEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
    }, []);

    useLawyerDashboardTasksOverlayEscape({
        fieldTasksSheetOpen,
        showTasksManager,
        onCloseFieldTasksSheet: closeFieldTasksSheet,
        onCloseTasksManager: closeTasksManager,
    });

    const revealTasksManager = useCallback(
        (focusTaskId?: string) => {
            setFieldTasksSheetOpen(false);
            closeCommunity?.();
            setActiveTab('home');
            setTasksManagerFocusTaskId(focusTaskId);
            setShowTasksManager(true);
        },
        [closeCommunity, setActiveTab],
    );

    const openFieldTasksSheet = useCallback(() => {
        openFieldTasksFromShell({
            signedIn: isRealSignedIn(userId),
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${FIELD_TASKS_SHELL_FEATURE}`),
            onOpen: () => {
                dismissTransientOverlays('field-tasks');
                warmFieldTasksOnOpen();
                primeFieldTasksShellMount();
                setTasksManagerFocusTaskId(undefined);
                setShowTasksManager(false);
                closeCommunity?.();
                setActiveTab('home');
                setFieldTasksSheetOpen(true);
                void loadFieldTasksHubModule().catch(() => undefined);
            },
        });
    }, [closeCommunity, primeFieldTasksShellMount, setActiveTab, userId]);

    const openTasksManager = useCallback(
        (focusTaskId?: string) => {
            openFieldTasksFromShell({
                signedIn: isRealSignedIn(userId),
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${FIELD_TASKS_SHELL_FEATURE}`),
                onOpen: () => {
                    dismissTransientOverlays('tasks-manager');
                    warmFieldTasksOnOpen();
                    primeFieldTasksShellMount();
                    revealTasksManager(focusTaskId);
                    void loadFieldTasksHubModule().catch(() => undefined);
                },
            });
        },
        [primeFieldTasksShellMount, revealTasksManager, userId],
    );

    const switchToTasksManager = useCallback(() => {
        if (!isRealSignedIn(userId)) {
            SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${FIELD_TASKS_SHELL_FEATURE}`);
            return;
        }
        dismissTransientOverlays('tasks-manager');
        revealTasksManager(undefined);
        void loadFieldTasksHubModule().catch(() => undefined);
    }, [revealTasksManager, userId]);

    const resetFieldTasksShell = useCallback(() => {
        setFieldTasksSheetSessionKey((k) => k + 1);
        setTasksManagerSessionKey((k) => k + 1);
        setFieldTasksSheetOpen(false);
        setShowTasksManager(false);
        setTasksManagerFocusTaskId(undefined);
    }, []);

    return {
        fieldTasksSheetSessionKey,
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
