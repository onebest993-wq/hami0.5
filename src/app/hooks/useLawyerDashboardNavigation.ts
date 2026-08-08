import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { resolveAlertNavigation } from '@/app/services/alertNavigation';
import { parseWorkspaceRoute } from '@/app/workspace/workspaceRoutes';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { OpenCriminalCaseOptions } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    coerceActiveFileTarget,
    coerceExecutionFilePreserveId,
    isFileData,
    isRecord,
} from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { openExecutionDossierWithContract } from '@/app/runtime/executionOpenContract';
import { openLawsuitDossierWithContract } from '@/app/runtime/lawsuitOpenContract';
import type { OpenRepositoryOptions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';
import {
    openRepositoryFromShell,
    REPOSITORY_SHELL_FEATURE,
} from '@/app/services/repository/repositoryShellNavigation';
import { SPARK_REPOSITORY_SESSION_ROUTE } from '@/app/spark/engine/homeSparkRoutes';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';

import { getQuantumPendingSnapshot } from '@/app/utils/quantumTasksMetrics';

import type { OpenNotepadOptions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';

function prefetchArchivePortalIntent() {
    void import('@/app/utils/lazyComponentsIntent')
        .then((m) => m.prefetchArchivePortal())
        .catch(() => undefined);
}

function warmExecutionWorkspaceIntent() {
    void import('@/app/utils/lazyComponentsIntent')
        .then((m) => m.warmExecutionWorkspace())
        .catch(() => undefined);
}

export type UseLawyerDashboardNavigationParams = {
    userId: string | null;
    files: FileData[];
    executionFiles: ExecutionFile[];
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    setShowCommunity: Dispatch<SetStateAction<boolean>>;
    setCommunityDeepLink: Dispatch<
        SetStateAction<{ postId?: string; openComments?: boolean } | null>
    >;
    setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;
    setActiveFile: Dispatch<SetStateAction<FileData | ExecutionFile | null>>;
    setShowNotifications: Dispatch<SetStateAction<boolean>>;
    openNotepad: (opts?: OpenNotepadOptions) => void;
    setTransactionsFocusId: Dispatch<SetStateAction<string | undefined>>;
    openUrgentInLawsuitsWorkspace: (caseId?: string) => void;
    openVaultModal: (opts?: { scanner?: boolean }) => void;
    openTransactionsHub: (focusId?: string) => void;
    openCommunityTab: () => void;
    openFieldTasksSheet: () => void;
    openScheduleTab: (opts?: { date?: string; eventId?: string }) => void;
    openCriminalCase: (caseId: string, options?: OpenCriminalCaseOptions) => void;
    openTasksManager: (focusTaskId?: string) => void;
    openRepository: (opts?: OpenRepositoryOptions) => void;
};

export function useLawyerDashboardNavigation({
    userId,
    files,
    executionFiles,
    setActiveTab,
    setShowCommunity,
    setCommunityDeepLink,
    setArchiveType,
    setActiveFile,
    setShowNotifications,
    openNotepad,
    setTransactionsFocusId,
    openUrgentInLawsuitsWorkspace,
    openVaultModal,
    openTransactionsHub,
    openCommunityTab,
    openFieldTasksSheet,
    openScheduleTab,
    openCriminalCase,
    openTasksManager,
    openRepository,
}: UseLawyerDashboardNavigationParams) {
    const handleNotificationRouting = useCallback(
        (path: string, payload: Record<string, unknown> | null) => {
            if (path === 'schedule') {
                openScheduleTab();
                return;
            }
            if (path === 'case_details') {
                const caseId = payload && typeof payload.caseId === 'string' ? payload.caseId : null;
                if (caseId) {
                    if (!isRealSignedIn(userId)) return;
                    const lawsuitTarget = files.find((f) => String(f.id) === caseId);
                    const executionTarget = executionFiles.find((f) => String(f.id) === caseId);
                    if (executionTarget) {
                        openExecutionDossierWithContract(() => {
                            setActiveFile(coerceExecutionFilePreserveId(executionTarget));
                        });
                        SmartToast.info(`جاري فتح القضية...`);
                    } else if (lawsuitTarget) {
                        openLawsuitDossierWithContract(() => {
                            setActiveFile(coerceActiveFileTarget(lawsuitTarget));
                        });
                        SmartToast.info(`جاري فتح القضية...`);
                    }
                } else {
                    setArchiveType('all');
                }
            } else if (path === 'community') {
                setShowCommunity(true);
                if (payload && typeof payload.postId === 'string') {
                    setCommunityDeepLink({ postId: payload.postId, openComments: false });
                }
            } else if (path === 'scan_document') {
                openVaultModal({ scanner: true });
            } else if (path === 'vault') {
                openVaultModal();
            }
        },
        [
            executionFiles,
            files,
            openVaultModal,
            setActiveFile,
            setActiveTab,
            setArchiveType,
            setCommunityDeepLink,
            setShowCommunity,
            userId,
        ],
    );

    const openSecretaryAlert = useCallback(
        (a: SecretaryAlert) => {
            void import('@/app/services/appAlertPushSync')
                .then((m) => m.markAlertSeenForPush(a.id))
                .catch(() => undefined);
            setShowNotifications(false);
            const nav = resolveAlertNavigation(a, {
                lawsuitFiles: files,
                fieldTasks: getQuantumPendingSnapshot(),
            });

            switch (nav.kind) {
                case 'tab':
                    if (nav.tab === 'community') {
                        openCommunityTab();
                    } else if (nav.tab === 'schedule') {
                        openScheduleTab();
                    } else {
                        setShowCommunity(false);
                        setActiveTab(nav.tab);
                    }
                    return;
                case 'notepad':
                    openNotepad({
                        mode: 'list',
                        focusNoteId:
                            nav.noteId ?? (a.entityId ? String(a.entityId) : undefined),
                    });
                    return;
                case 'client_requests':
                    setArchiveType('client_requests');
                    setActiveTab('home');
                    return;
                case 'transactions': {
                    const txId = nav.entityId ?? a.entityId;
                    if (txId) {
                        const txFile = files.find(
                            (file) => String(file.id) === String(txId) && file.type === 'transaction',
                        );
                        if (txFile && isFileData(txFile) && isRealSignedIn(userId)) {
                            openLawsuitDossierWithContract(() => setActiveFile(txFile));
                            return;
                        }
                        setTransactionsFocusId(String(txId));
                    }
                    openTransactionsHub();
                    return;
                }
                case 'threading_tx':
                    setActiveTab('home');
                    openTransactionsHub(nav.entityId);
                    return;
                case 'urgent_dashboard': {
                    const id = nav.entityId ?? (a.entityId != null ? String(a.entityId) : undefined);
                    openUrgentInLawsuitsWorkspace(id);
                    return;
                }
                case 'open_lawsuit': {
                    if (!isRealSignedIn(userId)) return;
                    const f = files.find((file) => String(file.id) === nav.entityId);
                    if (f && isFileData(f)) {
                        openLawsuitDossierWithContract(() => setActiveFile(f));
                        return;
                    }
                    SmartToast.info('لم يُعثر على إضبارة الدعوى — ربما نُقلت للأرشيف أو السلة');
                    return;
                }
                case 'open_execution': {
                    if (!isRealSignedIn(userId)) return;
                    const ex = executionFiles.find((file) => String(file.id ?? '') === nav.entityId);
                    if (ex) {
                        openExecutionDossierWithContract(() => {
                            setActiveFile(coerceExecutionFilePreserveId(ex));
                        });
                        return;
                    }
                    SmartToast.info('لم يُعثر على إضبارة التنفيذ');
                    return;
                }
                case 'open_criminal':
                    openCriminalCase(nav.entityId);
                    return;
                case 'open_field_tasks':
                    setActiveTab('home');
                    openFieldTasksSheet();
                    return;
                default:
                    return;
            }
        },
        [
            executionFiles,
            files,
            openCommunityTab,
            openCriminalCase,
            openFieldTasksSheet,
            openScheduleTab,
            openTransactionsHub,
            setActiveFile,
            setActiveTab,
            setArchiveType,
            openNotepad,
            setShowCommunity,
            setShowNotifications,
            setTransactionsFocusId,
            openUrgentInLawsuitsWorkspace,
            userId,
        ],
    );

    const navigateWorkspaceRoute = useCallback(
        (routePath: string) => {
            if (routePath === 'workspace:schedule:calendar') {
                openScheduleTab();
                return;
            }
            if (routePath === SPARK_REPOSITORY_SESSION_ROUTE) {
                openRepositoryFromShell({
                    signedIn: isRealSignedIn(userId),
                    onSignedOut: () =>
                        SmartToast.error(
                            `يرجى تسجيل الدخول أولاً لاستخدام ${REPOSITORY_SHELL_FEATURE}`,
                        ),
                    onOpen: () => openRepository(),
                });
                return;
            }
            const parsed = parseWorkspaceRoute(routePath);
            if (!parsed) return;
            switch (parsed.type) {
                case 'hub': {
                    const section = parsed.id as 'lawsuit' | 'execution' | 'transaction';
                    if (section === 'transaction') {
                        openTransactionsHub();
                        return;
                    }
                    if (section === 'execution' || section === 'lawsuit') {
                        prefetchArchivePortalIntent();
                        if (section === 'execution') warmExecutionWorkspaceIntent();
                        setArchiveType(section);
                    }
                    return;
                }
                case 'lawsuit': {
                    if (!isRealSignedIn(userId)) return;
                    const f = files.find((file) => String(file.id) === parsed.id);
                    if (f && isFileData(f)) {
                        openLawsuitDossierWithContract(() => setActiveFile(f));
                        return;
                    }
                    SmartToast.info('لم يُعثر على إضبارة الدعوى');
                    return;
                }
                case 'execution': {
                    if (!isRealSignedIn(userId)) return;
                    const ex = executionFiles.find((file) => String(file.id ?? '') === parsed.id);
                    if (ex) {
                        openExecutionDossierWithContract(() => {
                            setActiveFile(coerceExecutionFilePreserveId(ex));
                        });
                        return;
                    }
                    SmartToast.info('لم يُعثر على إضبارة التنفيذ');
                    return;
                }
                case 'criminal':
                    openCriminalCase(parsed.id);
                    return;
                case 'urgent':
                    openUrgentInLawsuitsWorkspace(parsed.id);
                    return;
                case 'transaction': {
                    if (!isRealSignedIn(userId)) return;
                    const f = files.find((file) => String(file.id) === parsed.id);
                    if (f && isFileData(f)) {
                        openLawsuitDossierWithContract(() => setActiveFile(f));
                        return;
                    }
                    SmartToast.info('لم يُعثر على ملف المعاملة');
                    return;
                }
                case 'threading':
                    openTransactionsHub(parsed.id);
                    return;
                case 'notepad':
                    openNotepad({ mode: 'list', focusNoteId: parsed.id });
                    return;
                case 'task':
                    openTasksManager(parsed.id);
                    return;
                default:
                    return;
            }
        },
        [
            executionFiles,
            files,
            openCriminalCase,
            openScheduleTab,
            openTasksManager,
            openTransactionsHub,
            setActiveFile,
            setActiveTab,
            setArchiveType,
            openNotepad,
            openUrgentInLawsuitsWorkspace,
            userId,
            openRepository,
        ],
    );

    return {
        handleNotificationRouting,
        openSecretaryAlert,
        navigateWorkspaceRoute,
    };
}
