import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { releaseBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { persistCommunitySection } from '@/app/components/lawyer/CommunityScreen/communitySectionState';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { OpenCriminalCaseOptions } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

type GlobalSearchNav =
    | { type: 'notifications' }
    | { type: 'calendar'; date?: string; eventId?: string }
    | { type: 'repository' }
    | { type: 'community'; postId?: string }
    | { type: 'profile' }
    | { type: 'urgent'; urgentId?: string }
    | { type: 'criminal'; criminalId: string }
    | { type: 'transactions'; transactionId?: string }
    | { type: 'tasks_manager'; taskId?: string }
    | { type: 'note' | 'voice'; noteId: string }
    | { type: 'vault' }
    | {
          type: 'file';
          fileId: string | number;
          stageIndex?: number;
          eventId?: string;
      }
    | { type: 'case'; caseId: string };

import type { OpenNotepadOptions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';
import type { OpenScheduleTabOptions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab';

export type UseLawyerDashboardGlobalSearchNavParams = {
    files: FileData[];
    executionFiles: ExecutionFile[];
    setShowGlobalSearch: Dispatch<SetStateAction<boolean>>;
    setGlobalSearchInitialQuery: Dispatch<SetStateAction<string>>;
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

export function useLawyerDashboardGlobalSearchNav({
    files,
    executionFiles,
    setShowGlobalSearch,
    setGlobalSearchInitialQuery,
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
    onNavigateToCase,
}: UseLawyerDashboardGlobalSearchNavParams) {
    const closeGlobalSearch = useCallback(() => {
        setShowGlobalSearch(false);
        setGlobalSearchInitialQuery('');
        releaseBodyScrollLock();
    }, [setGlobalSearchInitialQuery, setShowGlobalSearch]);

    const handleGlobalSearchNavigate = useCallback(
        (nav: GlobalSearchNav) => {
            closeGlobalSearch();
            if (nav.type === 'notifications') {
                openNotifications();
                return;
            }
            if (nav.type === 'calendar') {
                openScheduleTab({ date: nav.date, eventId: nav.eventId });
                return;
            }
            if (nav.type === 'repository') {
                persistCommunitySection('repository');
                openCommunityTab();
                return;
            }
            if (nav.type === 'community') {
                openCommunityTab();
                if (nav.postId) {
                    setCommunityDeepLink({ postId: nav.postId, openComments: false });
                }
                return;
            }
            if (nav.type === 'profile') {
                openProfileTab();
                return;
            }
            if (nav.type === 'urgent') {
                setActiveTab('home');
                openUrgentInLawsuitsWorkspace(nav.urgentId);
                return;
            }
            if (nav.type === 'criminal') {
                openCriminalCase(nav.criminalId);
                return;
            }
            if (nav.type === 'transactions') {
                setActiveTab('home');
                openTransactionsHub(nav.transactionId);
                return;
            }
            if (nav.type === 'tasks_manager') {
                setActiveTab('home');
                openTasksManager(nav.taskId);
                return;
            }
            if (nav.type === 'note' || nav.type === 'voice') {
                setActiveTab('home');
                openNotepad({ mode: 'list', focusNoteId: nav.noteId });
                return;
            }
            if (nav.type === 'vault') {
                setActiveTab('home');
                openVaultModal();
                return;
            }
            setActiveTab('home');
            if (nav.type === 'file') {
                const id = String(nav.fileId);
                const target =
                    files.find((f) => String(f.id) === id) ||
                    executionFiles.find((f) => String(f.id) === id);
                if (target) {
                    if (typeof nav.stageIndex === 'number' || typeof nav.eventId === 'string') {
                        const enriched = {
                            ...(target as unknown as Record<string, unknown>),
                            ...(typeof nav.stageIndex === 'number'
                                ? { activeStageIndex: nav.stageIndex }
                                : {}),
                            ...(typeof nav.eventId === 'string'
                                ? { __searchFocusEventId: nav.eventId }
                                : {}),
                        } as unknown as FileData;
                        setActiveFile(enriched);
                    } else {
                        setActiveFile(target as FileData);
                    }
                }
                return;
            }
            if (nav.type === 'case') {
                selectCase(nav.caseId);
                const target =
                    files.find((f) => String(f.id) === nav.caseId) ||
                    executionFiles.find((f) => String(f.id) === nav.caseId);
                if (target) setActiveFile(target as FileData);
                onNavigateToCase?.(nav.caseId);
            }
        },
        [
            closeGlobalSearch,
            executionFiles,
            files,
            onNavigateToCase,
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
