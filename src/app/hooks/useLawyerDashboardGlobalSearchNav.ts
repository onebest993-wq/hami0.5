import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { OpenCriminalCaseOptions } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { GlobalSearchNavigate } from '@/app/services/globalSearchIndex';
import { dispatchGlobalSearchNavigate } from '@/app/hooks/globalSearchNavDispatch';
import type { OpenNotepadOptions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';
import type { OpenScheduleTabOptions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab';

export type UseLawyerDashboardGlobalSearchNavParams = {
    userId: string | null;
    files: FileData[];
    executionFiles: ExecutionFile[];
    /** إغلاق موحّد من bag — sessionKey + persist + scroll */
    closeGlobalSearch: () => void;
    openNotifications: () => void;
    openProfileTab: () => void;
    openScheduleTab: (opts?: OpenScheduleTabOptions) => void;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    openCommunityTab: () => void;
    setCommunityDeepLink: Dispatch<
        SetStateAction<{ postId?: string; openComments?: boolean } | null>
    >;
    openUrgentInLawsuitsWorkspace: (caseId?: string) => void;
    openCriminalCase: (caseId: string, options?: OpenCriminalCaseOptions) => void;
    openTransactionsHub: (focusId?: string) => void;
    openTasksManager: (focusTaskId?: string) => void;
    openNotepad: (opts?: OpenNotepadOptions) => void;
    openVaultModal: (opts?: { scanner?: boolean }) => void;
    setActiveFile: Dispatch<SetStateAction<FileData | ExecutionFile | null>>;
    selectCase: (caseId: string) => void;
    onNavigateToCase?: (caseId: string) => void;
};

export function useLawyerDashboardGlobalSearchNav(params: UseLawyerDashboardGlobalSearchNavParams) {
    const filesRef = useRef(params.files);
    filesRef.current = params.files;
    const executionFilesRef = useRef(params.executionFiles);
    executionFilesRef.current = params.executionFiles;
    const onNavigateToCaseRef = useRef(params.onNavigateToCase);
    onNavigateToCaseRef.current = params.onNavigateToCase;
    const userIdRef = useRef(params.userId);
    userIdRef.current = params.userId;

    const {
        closeGlobalSearch,
        openCommunityTab,
        openCriminalCase,
        openNotifications,
        openProfileTab,
        openScheduleTab,
        openTasksManager,
        openTransactionsHub,
        openVaultModal,
        openNotepad,
        selectCase,
        setActiveFile,
        setActiveTab,
        setCommunityDeepLink,
        openUrgentInLawsuitsWorkspace,
    } = params;

    const handleGlobalSearchNavigate = useCallback(
        (nav: GlobalSearchNavigate) => {
            dispatchGlobalSearchNavigate(nav, {
                userId: userIdRef.current,
                files: filesRef.current,
                executionFiles: executionFilesRef.current,
                closeGlobalSearch,
                openNotifications,
                openProfileTab,
                openScheduleTab,
                setActiveTab,
                openCommunityTab,
                setCommunityDeepLink,
                openUrgentInLawsuitsWorkspace,
                openCriminalCase,
                openTransactionsHub,
                openTasksManager,
                openNotepad,
                openVaultModal,
                setActiveFile,
                selectCase,
                onNavigateToCase: onNavigateToCaseRef.current,
            });
        },
        [
            closeGlobalSearch,
            openCommunityTab,
            openCriminalCase,
            openNotifications,
            openProfileTab,
            openScheduleTab,
            openTasksManager,
            openTransactionsHub,
            openVaultModal,
            openNotepad,
            selectCase,
            setActiveFile,
            setActiveTab,
            setCommunityDeepLink,
            openUrgentInLawsuitsWorkspace,
        ],
    );

    return { handleGlobalSearchNavigate, closeGlobalSearch };
}
