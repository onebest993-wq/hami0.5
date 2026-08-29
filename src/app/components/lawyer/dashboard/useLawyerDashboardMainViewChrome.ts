import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { markDashboardInteractiveOnce, markBootPhase } from '@/app/bootstrap/bootMetrics';
import {
    scheduleBootContentReadyAfterStyles,
    isDemoShellAuthBuild,
    DASHBOARD_SHELL_PAINTED_EVENT,
} from '@/app/bootstrap/bootReveal';
import { ensureDeferredAppStylesLoaded } from '@/app/runtime/deferredAppStyles';
import { bindFramePacingGuard } from '@/app/runtime/framePacingGuard';
import { bindBodyScrollLockReconcile, useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { blurFocusWithin } from '@/app/utils/inertProps';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import {
    EXECUTION_DOSSIER_PRIME_HOST_EVENT,
    type ExecutionDossierPrimeHostDetail,
} from '@/app/runtime/executionDossierPrimeHost';
import { useLawyerExecutionOverlayEscape } from '@/app/hooks/lawyerDashboard/useLawyerExecutionOverlayEscape';
import { useLawyerNonExecArchiveEscape } from '@/app/hooks/lawyerDashboard/useLawyerNonExecArchiveEscape';
import { isProfileShellSnappedOpen } from '@/app/services/profile/profileShellSnap';
import { isNotificationShellSnappedOpen } from '@/app/services/notifications/notificationShellSnap';
import { isSettingsShellSnappedOpen } from '@/app/services/settings/settingsShellSnap';
import { isGlobalSearchShellSnappedOpen } from '@/app/services/search/globalSearchShellSnap';
import { executeOverlaySnapClose } from '@/app/runtime/overlaySnapClose';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';
import {
    EXECUTION_CREATE_CLOSE_GUARD_MS,
    armExecutionCreateCloseGuard,
    clearExecutionCreateCloseGuard,
    isExecutionCreateCloseGuardArmed,
} from '@/app/components/lawyer/dashboard/executionCreateCloseGuard';

type ChromeOverlays = Pick<
    LawyerDashboardOverlaysBundleProps,
    'archive' | 'dossier' | 'executionCreate' | 'overlays' | 'nav'
>;

type ChromeNotificationPanel = {
    isOpen: boolean;
};

/**
 * قفل تمرير الجسم، inert للـ underlay، إغلاق Escape للأرشيف/التنفيذ، وتسخين إضبارة التنفيذ.
 */
export function useLawyerDashboardMainViewChrome({
    overlaysBundle,
    notificationPanel,
    profileActive,
    executionArchiveOpen,
    executionDossierLive,
    executionCreateLive,
    nonExecArchiveLive,
}: {
    overlaysBundle: ChromeOverlays;
    notificationPanel: ChromeNotificationPanel;
    profileActive: boolean;
    executionArchiveOpen: boolean;
    executionDossierLive: FileData | null;
    executionCreateLive: boolean;
    nonExecArchiveLive: boolean;
}) {
    const unbindFrameGuardRef = useRef<(() => void) | null>(null);
    const tabStackInertRef = useRef<HTMLDivElement | null>(null);
    const createCloseGuardUntilRef = useRef(0);
    const createCloseGuardTimerRef = useRef<number>(0);
    const [executionCreateCloseGuard, setExecutionCreateCloseGuard] = useState(false);

    useEffect(() => {
        const onPrime = (event: Event) => {
            const detail = (event as CustomEvent<ExecutionDossierPrimeHostDetail>).detail;
            const raw = detail?.file;
            if (!raw || typeof raw !== 'object') return;
            if ((raw as { type?: unknown }).type !== 'execution') return;
            void import('@/app/runtime/executionWorkspaceWarm')
                .then((m) => m.warmExecutionDossier('intent'))
                .catch(() => undefined);
        };
        window.addEventListener(EXECUTION_DOSSIER_PRIME_HOST_EVENT, onPrime);
        return () => window.removeEventListener(EXECUTION_DOSSIER_PRIME_HOST_EVENT, onPrime);
    }, []);

    useEffect(() => {
        return () => window.clearTimeout(createCloseGuardTimerRef.current);
    }, []);

    useLayoutEffect(() => {
        if (!executionCreateCloseGuard && !isExecutionCreateCloseGuardArmed()) return;
        if (overlaysBundle.archive.archiveType === 'execution') return;
        overlaysBundle.archive.setArchiveType('execution');
    }, [
        executionCreateCloseGuard,
        overlaysBundle.archive,
        overlaysBundle.archive.archiveType,
    ]);

    const closeExecutionArchive = useCallback(() => {
        if (
            executionCreateCloseGuard ||
            overlaysBundle.executionCreate.isExecutionModalOpen ||
            isExecutionCreateCloseGuardArmed() ||
            performance.now() < createCloseGuardUntilRef.current
        ) {
            overlaysBundle.archive.setArchiveType('execution');
            return;
        }
        executeOverlaySnapClose({
            commit: () => overlaysBundle.archive.setArchiveType(null),
        });
    }, [executionCreateCloseGuard, overlaysBundle.archive, overlaysBundle.executionCreate]);
    const closeExecutionDossier = useCallback(
        () =>
            executeOverlaySnapClose({
                commit: () => overlaysBundle.dossier.setActiveFile(null),
            }),
        [overlaysBundle.dossier],
    );
    const closeExecutionCreate = useCallback(() => {
        armExecutionCreateCloseGuard();
        createCloseGuardUntilRef.current = performance.now() + EXECUTION_CREATE_CLOSE_GUARD_MS;
        setExecutionCreateCloseGuard(true);
        executeOverlaySnapClose({
            commit: () => {
                overlaysBundle.executionCreate.setIsExecutionModalOpen(false);
                overlaysBundle.archive.setArchiveType('execution');
            },
        });
        window.clearTimeout(createCloseGuardTimerRef.current);
        createCloseGuardTimerRef.current = window.setTimeout(() => {
            clearExecutionCreateCloseGuard();
            setExecutionCreateCloseGuard(false);
        }, EXECUTION_CREATE_CLOSE_GUARD_MS + 20);
    }, [overlaysBundle.archive, overlaysBundle.executionCreate]);

    useLawyerExecutionOverlayEscape({
        archiveOpen: executionArchiveOpen,
        executionFileOpen: Boolean(executionDossierLive),
        executionCreateOpen: executionCreateLive,
        onCloseArchive: closeExecutionArchive,
        onCloseExecutionFile: closeExecutionDossier,
        onCloseExecutionCreate: closeExecutionCreate,
    });

    const closeNonExecArchive = useCallback(
        () =>
            executeOverlaySnapClose({
                commit: () => overlaysBundle.archive.setArchiveType(null),
            }),
        [overlaysBundle.archive],
    );
    useLawyerNonExecArchiveEscape({
        archiveOpen: nonExecArchiveLive,
        onCloseArchive: closeNonExecArchive,
    });

    useBodyScrollLock(true);

    useLayoutEffect(() => {
        markBootPhase('dashboard-main-view');
        try {
            window.dispatchEvent(new Event(DASHBOARD_SHELL_PAINTED_EVENT));
        } catch {
            /* ignore */
        }

        markDashboardInteractiveOnce();
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        unbindFrameGuardRef.current = bindFramePacingGuard();
        const unbindScrollReconcile = bindBodyScrollLockReconcile();

        const cancelReady = scheduleBootContentReadyAfterStyles(ensureDeferredAppStylesLoaded, {
            maxWaitMs: isDemoShellAuthBuild() ? 800 : 8_000,
            stylesDeferMs: 0,
        });

        return () => {
            cancelReady();
            unbindFrameGuardRef.current?.();
            unbindFrameGuardRef.current = null;
            unbindScrollReconcile();
        };
    }, []);

    const settingsOpen =
        Boolean(overlaysBundle.overlays.showSettings) && isSettingsShellSnappedOpen();
    const notificationsOpen =
        Boolean(notificationPanel.isOpen) && isNotificationShellSnappedOpen();
    const globalSearchOpen =
        Boolean(overlaysBundle.overlays.showGlobalSearch) && isGlobalSearchShellSnappedOpen();
    const profileSurfaceActive =
        profileActive || (typeof document !== 'undefined' && isProfileShellSnappedOpen());
    const underlayInert =
        (settingsOpen || notificationsOpen || globalSearchOpen) && !profileSurfaceActive;

    useLayoutEffect(() => {
        const el = tabStackInertRef.current;
        if (!el) return;
        if (underlayInert) {
            blurFocusWithin(el);
            el.setAttribute('inert', '');
        } else {
            el.removeAttribute('inert');
        }
    }, [underlayInert]);

    return {
        tabStackInertRef,
        underlayInert,
        globalSearchOpen,
        closeExecutionArchive,
        closeExecutionDossier,
        closeExecutionCreate,
        executionCreateCloseGuard,
        closeNonExecArchive,
    };
}
