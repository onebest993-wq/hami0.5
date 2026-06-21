import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
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

export type UseLawyerDashboardGlobalSearchNavParams = {
    files: FileData[];
    executionFiles: ExecutionFile[];
    setShowGlobalSearch: Dispatch<SetStateAction<boolean>>;
    setGlobalSearchInitialQuery: Dispatch<SetStateAction<string>>;
    openNotifications: () => void;
    openProfileTab: () => void;
    setCalendarSearchFocus: Dispatch<SetStateAction<{ date?: string; eventId?: string } | null>>;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    openCommunityTab: () => void;
    setCommunityDeepLink: Dispatch<
        SetStateAction<{ postId?: string; openComments?: boolean } | null>
    >;
    setUrgentFocusCaseId: Dispatch<SetStateAction<string | undefined>>;
    setShowUrgentDashboard: Dispatch<SetStateAction<boolean>>;
    openCriminalCase: (caseId: string, options?: OpenCriminalCaseOptions) => void;
    openTransactionsHub: (focusId?: string) => void;
    openTasksManager: (focusTaskId?: string) => void;
    setNotepadMode: Dispatch<SetStateAction<'list' | 'create'>>;
    setNotepadFocusNoteId: Dispatch<SetStateAction<string | undefined>>;
    setIsNotepadOpen: Dispatch<SetStateAction<boolean>>;
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
    setCalendarSearchFocus,
    setActiveTab,
    openCommunityTab,
    setCommunityDeepLink,
    setUrgentFocusCaseId,
    setShowUrgentDashboard,
    openCriminalCase,
    openTransactionsHub,
    openTasksManager,
    setNotepadMode,
    setNotepadFocusNoteId,
    setIsNotepadOpen,
    openVaultModal,
    setActiveFile,
    selectCase,
    onNavigateToCase,
}: UseLawyerDashboardGlobalSearchNavParams) {
    const closeGlobalSearch = useCallback(() => {
        setShowGlobalSearch(false);
        setGlobalSearchInitialQuery('');
    }, [setGlobalSearchInitialQuery, setShowGlobalSearch]);

    const handleGlobalSearchNavigate = useCallback(
        (nav: GlobalSearchNav) => {
            closeGlobalSearch();
            if (nav.type === 'notifications') {
                openNotifications();
                return;
            }
            if (nav.type === 'calendar') {
                setCalendarSearchFocus({
                    date: nav.date,
                    eventId: nav.eventId,
                });
                setActiveTab('schedule');
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
                setUrgentFocusCaseId(nav.urgentId);
                setShowUrgentDashboard(true);
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
                setNotepadMode('list');
                setNotepadFocusNoteId(nav.noteId);
                setIsNotepadOpen(true);
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
            openTasksManager,
            openTransactionsHub,
            openVaultModal,
            selectCase,
            setActiveFile,
            setActiveTab,
            setCalendarSearchFocus,
            setCommunityDeepLink,
            setIsNotepadOpen,
            setNotepadFocusNoteId,
            setNotepadMode,
            openNotifications,
            setShowUrgentDashboard,
            setUrgentFocusCaseId,
        ],
    );

    return { handleGlobalSearchNavigate, closeGlobalSearch };
}
