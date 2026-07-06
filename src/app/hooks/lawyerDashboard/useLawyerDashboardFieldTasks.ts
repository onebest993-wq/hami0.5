import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';

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
import { hydrateFieldTasksShellForInstantOpen } from '@/app/runtime/fieldTasksBootHydrator';
import {
    loadFieldTasksSheetModule,
    loadTasksManagerModule,
} from '@/app/runtime/fieldTasksHubLoader';
import { useLawyerDashboardTasksOverlayEscape } from '@/app/hooks/lawyerDashboard/useLawyerDashboardTasksOverlayEscape';
import { useKeepAliveIdleRelease } from '@/app/hooks/lawyerDashboard/useKeepAliveIdleRelease';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    dismissTransientOverlays,
} from '@/app/utils/bodyScrollLock';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';

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
    const [fieldTasksHostMounted, setFieldTasksHostMounted] = useState(false);
    const [fieldTasksManagerHostMounted, setFieldTasksManagerHostMounted] = useState(false);
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
        setFieldTasksHostMounted(true);
    }, []);

    const armFieldTasksManagerHost = useCallback(() => {
        setFieldTasksManagerHostMounted(true);
    }, []);

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
        const closeField = () => setFieldTasksSheetOpen(false);
        const closeManager = () => {
            setShowTasksManager(false);
            setTasksManagerFocusTaskId(undefined);
        };
        const unregField = registerDashboardOverlayCloser('field-tasks', closeField);
        const unregManager = registerDashboardOverlayCloser('tasks-manager', closeManager);
        return () => {
            unregField();
            unregManager();
        };
    }, []);

    useLawyerDashboardTasksOverlayEscape({
        fieldTasksSheetOpen,
        showTasksManager,
        onCloseFieldTasksSheet: closeFieldTasksSheet,
        onCloseTasksManager: closeTasksManager,
    });

    useKeepAliveIdleRelease(fieldTasksSheetOpen, () => setFieldTasksHostMounted(false));

    useKeepAliveIdleRelease(showTasksManager, () => setFieldTasksManagerHostMounted(false));

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
                flushSync(() => {
                    primeFieldTasksShellMount();
                    setTasksManagerFocusTaskId(undefined);
                    setShowTasksManager(false);
                    setFieldTasksSheetOpen(true);
                });

                warmFieldTasksOnOpen();
                void loadFieldTasksSheetModule().catch(() => undefined);
                void hydrateFieldTasksShellForInstantOpen(true).catch(() => undefined);

                queueMicrotask(() => {
                    dismissTransientOverlays('field-tasks');
                    closeCommunity?.();
                    setActiveTab('home');
                });
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
                    armFieldTasksManagerHost();
                    void hydrateFieldTasksShellForInstantOpen(true);
                    revealTasksManager(focusTaskId);
                    void loadTasksManagerModule().catch(() => undefined);
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
        armFieldTasksManagerHost();
        void hydrateFieldTasksShellForInstantOpen(true);
        revealTasksManager(undefined);
        void loadTasksManagerModule().catch(() => undefined);
    }, [armFieldTasksManagerHost, revealTasksManager, userId]);

    const resetFieldTasksShell = useCallback(() => {
        setFieldTasksSheetSessionKey((k) => k + 1);
        setTasksManagerSessionKey((k) => k + 1);
        setFieldTasksSheetOpen(false);
        setShowTasksManager(false);
        setTasksManagerFocusTaskId(undefined);
    }, []);

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
