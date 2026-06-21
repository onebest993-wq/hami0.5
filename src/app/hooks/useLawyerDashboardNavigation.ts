import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { resolveAlertNavigation } from '@/app/services/alertNavigation';
import { parseWorkspaceRoute } from '@/app/workspace/workspaceRoutes';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { prefetchArchivePortal, prefetchExecutionDashboard } from '@/app/utils/lazyComponents';
import { markAlertSeenForPush } from '@/app/services/appAlertPushSync';
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

import type { LegalTask } from '@/app/types/TaskEngine';

export type UseLawyerDashboardNavigationParams = {
    files: FileData[];
    executionFiles: ExecutionFile[];
    quantumTasks: LegalTask[];
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    setShowCommunity: Dispatch<SetStateAction<boolean>>;
    setCommunityDeepLink: Dispatch<
        SetStateAction<{ postId?: string; openComments?: boolean } | null>
    >;
    setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;
    setActiveFile: Dispatch<SetStateAction<FileData | ExecutionFile | null>>;
    setShowNotifications: Dispatch<SetStateAction<boolean>>;
    setNotepadMode: Dispatch<SetStateAction<'list' | 'create'>>;
    setNotepadFocusNoteId: Dispatch<SetStateAction<string | undefined>>;
    setIsNotepadOpen: Dispatch<SetStateAction<boolean>>;
    setTransactionsFocusId: Dispatch<SetStateAction<string | undefined>>;
    setUrgentFocusCaseId: Dispatch<SetStateAction<string | undefined>>;
    setShowUrgentDashboard: Dispatch<SetStateAction<boolean>>;
    openVaultModal: (opts?: { scanner?: boolean }) => void;
    openTransactionsHub: (focusId?: string) => void;
    openCommunityTab: () => void;
    openFieldTasksSheet: () => void;
    openCriminalCase: (caseId: string, options?: OpenCriminalCaseOptions) => void;
    openTasksManager: (focusTaskId?: string) => void;
};

export function useLawyerDashboardNavigation({
    files,
    executionFiles,
    quantumTasks,
    setActiveTab,
    setShowCommunity,
    setCommunityDeepLink,
    setArchiveType,
    setActiveFile,
    setShowNotifications,
    setNotepadMode,
    setNotepadFocusNoteId,
    setIsNotepadOpen,
    setTransactionsFocusId,
    setUrgentFocusCaseId,
    setShowUrgentDashboard,
    openVaultModal,
    openTransactionsHub,
    openCommunityTab,
    openFieldTasksSheet,
    openCriminalCase,
    openTasksManager,
}: UseLawyerDashboardNavigationParams) {
    const handleNotificationRouting = useCallback(
        (path: string, payload: Record<string, unknown> | null) => {
            if (path === 'schedule') {
                setActiveTab('schedule');
                return;
            }
            if (path === 'case_details') {
                const caseId = payload && typeof payload.caseId === 'string' ? payload.caseId : null;
                if (caseId) {
                    const lawsuitTarget = files.find((f) => String(f.id) === caseId);
                    const executionTarget = executionFiles.find((f) => String(f.id) === caseId);
                    const target = lawsuitTarget || executionTarget;
                    if (target) {
                        if (isRecord(target) && target.type === 'execution') prefetchExecutionDashboard();
                        setActiveFile(coerceActiveFileTarget(target));
                        SmartToast.info(`جاري فتح القضية...`);
                    }
                } else {
                    setArchiveType('all');
                }
            } else if (path === 'ai_drafter') {
                setArchiveType('all');
                SmartToast.info('افتح الإضبارة من الأرشيف');
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
        ],
    );

    const openSecretaryAlert = useCallback(
        (a: SecretaryAlert) => {
            markAlertSeenForPush(a.id);
            setShowNotifications(false);
            const nav = resolveAlertNavigation(a, {
                lawsuitFiles: files,
                fieldTasks: quantumTasks,
            });

            switch (nav.kind) {
                case 'tab':
                    if (nav.tab === 'community') {
                        openCommunityTab();
                    } else {
                        setShowCommunity(false);
                        setActiveTab(nav.tab);
                    }
                    return;
                case 'notepad':
                    setNotepadMode('list');
                    if (nav.noteId) setNotepadFocusNoteId(nav.noteId);
                    else if (a.entityId) setNotepadFocusNoteId(String(a.entityId));
                    setIsNotepadOpen(true);
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
                        if (txFile && isFileData(txFile)) {
                            setActiveFile(txFile);
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
                case 'urgent_dashboard':
                    if (nav.entityId) setUrgentFocusCaseId(nav.entityId);
                    else if (a.entityId) setUrgentFocusCaseId(String(a.entityId));
                    setShowUrgentDashboard(true);
                    return;
                case 'open_lawsuit': {
                    const f = files.find((file) => String(file.id) === nav.entityId);
                    if (f && isFileData(f)) {
                        setActiveFile(f);
                        return;
                    }
                    SmartToast.info('لم يُعثر على إضبارة الدعوى — ربما نُقلت للأرشيف أو السلة');
                    return;
                }
                case 'open_execution': {
                    const ex = executionFiles.find((file) => String(file.id ?? '') === nav.entityId);
                    if (ex) {
                        setActiveFile(coerceExecutionFilePreserveId(ex));
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
            openTransactionsHub,
            quantumTasks,
            setActiveFile,
            setActiveTab,
            setArchiveType,
            setIsNotepadOpen,
            setNotepadFocusNoteId,
            setNotepadMode,
            setShowCommunity,
            setShowNotifications,
            setShowUrgentDashboard,
            setTransactionsFocusId,
            setUrgentFocusCaseId,
        ],
    );

    const navigateWorkspaceRoute = useCallback(
        (routePath: string) => {
            if (routePath === 'workspace:schedule:calendar') {
                setActiveTab('schedule');
                return;
            }
            const parsed = parseWorkspaceRoute(routePath);
            if (!parsed) return;
            switch (parsed.type) {
                case 'hub': {
                    const section = parsed.id as 'lawsuit' | 'execution' | 'transaction';
                    if (section === 'execution' || section === 'lawsuit' || section === 'transaction') {
                        prefetchArchivePortal();
                        if (section === 'execution') prefetchExecutionDashboard();
                        setArchiveType(section);
                    }
                    return;
                }
                case 'lawsuit': {
                    const f = files.find((file) => String(file.id) === parsed.id);
                    if (f && isFileData(f)) {
                        setActiveFile(f);
                        return;
                    }
                    SmartToast.info('لم يُعثر على إضبارة الدعوى');
                    return;
                }
                case 'execution': {
                    const ex = executionFiles.find((file) => String(file.id ?? '') === parsed.id);
                    if (ex) {
                        setActiveFile(coerceExecutionFilePreserveId(ex));
                        return;
                    }
                    SmartToast.info('لم يُعثر على إضبارة التنفيذ');
                    return;
                }
                case 'criminal':
                    openCriminalCase(parsed.id);
                    return;
                case 'urgent':
                    setUrgentFocusCaseId(parsed.id);
                    setShowUrgentDashboard(true);
                    return;
                case 'transaction': {
                    const f = files.find((file) => String(file.id) === parsed.id);
                    if (f && isFileData(f)) {
                        setActiveFile(f);
                        return;
                    }
                    SmartToast.info('لم يُعثر على ملف المعاملة');
                    return;
                }
                case 'threading':
                    openTransactionsHub(parsed.id);
                    return;
                case 'notepad':
                    setNotepadFocusNoteId(parsed.id);
                    setNotepadMode('list');
                    setIsNotepadOpen(true);
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
            openTasksManager,
            openTransactionsHub,
            setActiveFile,
            setActiveTab,
            setIsNotepadOpen,
            setNotepadFocusNoteId,
            setNotepadMode,
            setShowUrgentDashboard,
            setUrgentFocusCaseId,
        ],
    );

    return {
        handleNotificationRouting,
        openSecretaryAlert,
        navigateWorkspaceRoute,
    };
}
