import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { parseCommunityDeepLinkFromLocation } from '@/app/components/lawyer/CommunityScreen/communityDeepLink';
import {
    GLOBAL_SEARCH_SHELL_FEATURE,
    openGlobalSearchFromShell,
} from '@/app/services/search/globalSearchShellNavigation';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    openProfileFromShell,
    PROFILE_SHELL_FEATURE,
} from '@/app/services/profile/profileShellNavigation';
import {
    openSettingsFromShell,
    SETTINGS_SHELL_FEATURE,
} from '@/app/services/settings/settingsShellNavigation';
import {
    prefetchCommunityScreen,
    prefetchCriminalDashboard,
    prefetchGlobalSearchOverlay,
    prefetchHamiSettings,
    prefetchRoyalLawyerProfile,
} from '@/app/utils/lazyComponents';
import {
    dismissTransientOverlays,
    HAMI_DISMISS_OVERLAYS_EVENT,
    type TransientOverlayId,
} from '@/app/utils/bodyScrollLock';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import {
    LAWYER_COMMUNITY_OPEN_KEY,
    LAWYER_DASHBOARD_TAB_KEY,
    readInitialCommunityOpen,
    readInitialLawyerTab,
    type LawyerDashboardTab,
    type OpenCriminalCaseOptions,
} from './lawyerDashboard/lawyerDashboardNav';

export type UseLawyerDashboardOverlaysParams = {
    setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;
    userId?: string | null;
};

export function useLawyerDashboardOverlays({ setArchiveType, userId }: UseLawyerDashboardOverlaysParams) {
    const [showContractGenerator, setShowContractGenerator] = useState(false);
    const [vaultOpenScanner, setVaultOpenScanner] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [homeLayoutEditMode, setHomeLayoutEditMode] = useState(false);
    const [showGlobalSearch, setShowGlobalSearch] = useState(false);
    const [globalSearchInitialQuery, setGlobalSearchInitialQuery] = useState('');
    const [searchIndexVersion, setSearchIndexVersion] = useState(0);
    const [calendarSearchFocus, setCalendarSearchFocus] = useState<{
        date?: string;
        eventId?: string;
    } | null>(null);
    const [tasksManagerFocusTaskId, setTasksManagerFocusTaskId] = useState<string | undefined>();
    const [transactionsFocusId, setTransactionsFocusId] = useState<string | undefined>();
    const [showDocs, setShowDocs] = useState(false);
    const [fieldTasksSheetOpen, setFieldTasksSheetOpen] = useState(false);
    const [showTasksManager, setShowTasksManager] = useState(false);
    const [activeTab, setActiveTab] = useState<LawyerDashboardTab>(readInitialLawyerTab);
    const [showCommunity, setShowCommunity] = useState(readInitialCommunityOpen);
    const [communityDeepLink, setCommunityDeepLink] = useState<{
        postId?: string;
        openComments?: boolean;
    } | null>(() => {
        if (typeof window === 'undefined') return null;
        const target = parseCommunityDeepLinkFromLocation(window.location);
        return target
            ? { postId: target.postId, openComments: target.openComments }
            : null;
    });
    const [showTransactions, setShowTransactions] = useState(false);
    const [showLawsuitsWorkspace, setShowLawsuitsWorkspace] = useState(false);
    const [lawsuitsWorkspaceTab, setLawsuitsWorkspaceTab] = useState<'civil' | 'urgent'>('civil');
    const [lawsuitsDossierSection, setLawsuitsDossierSection] = useState<
        'all' | 'civil' | 'personal' | 'criminal'
    >('all');
    const [criminalDashboardCaseId, setCriminalDashboardCaseId] = useState<string | null>(null);
    const criminalReturnTargetRef = useRef<'lawsuits_workspace' | 'main'>('main');

    const isCriminalDossierOpen = Boolean(criminalDashboardCaseId);

    const openGlobalSearch = useCallback(
        (seed = '') => {
            openGlobalSearchFromShell({
                signedIn: isRealSignedIn(userId),
                seed,
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${GLOBAL_SEARCH_SHELL_FEATURE}`),
                onOpen: (querySeed) => {
                    dismissTransientOverlays();
                    prefetchGlobalSearchOverlay();
                    setGlobalSearchInitialQuery(querySeed);
                    setShowGlobalSearch(true);
                },
            });
        },
        [userId],
    );

    const openSettings = useCallback(() => {
        openSettingsFromShell({
            signedIn: isRealSignedIn(userId),
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${SETTINGS_SHELL_FEATURE}`),
            onOpen: () => {
                dismissTransientOverlays();
                prefetchHamiSettings();
                setShowSettings(true);
            },
        });
    }, [userId]);

    const openProfileTab = useCallback(() => {
        openProfileFromShell({
            signedIn: isRealSignedIn(userId),
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${PROFILE_SHELL_FEATURE}`),
            onOpen: () => {
                dismissTransientOverlays();
                prefetchRoyalLawyerProfile();
                setShowCommunity(false);
                setActiveTab('profile');
            },
        });
    }, [userId]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                openGlobalSearch();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [openGlobalSearch]);

    const openFieldTasksSheet = useCallback(() => {
        dismissTransientOverlays('field-tasks');
        setTasksManagerFocusTaskId(undefined);
        setShowTasksManager(false);
        setFieldTasksSheetOpen(true);
    }, []);

    const openTasksManager = useCallback((focusTaskId?: string) => {
        dismissTransientOverlays('tasks-manager');
        setTasksManagerFocusTaskId(focusTaskId);
        setShowTasksManager(true);
    }, []);

    const openVaultModal = useCallback((opts?: { scanner?: boolean }) => {
        dismissTransientOverlays('vault');
        setVaultOpenScanner(!!opts?.scanner);
        setShowDocs(true);
    }, []);

    const openTransactionsHub = useCallback((focusId?: string) => {
        dismissTransientOverlays('transactions');
        if (focusId !== undefined) setTransactionsFocusId(focusId);
        setShowTransactions(true);
    }, []);

    useEffect(() => {
        const onDismiss = (e: Event) => {
            const except = (e as CustomEvent<{ except?: TransientOverlayId }>).detail?.except;
            if (except !== 'field-tasks') setFieldTasksSheetOpen(false);
            if (except !== 'tasks-manager') {
                setShowTasksManager(false);
                setTasksManagerFocusTaskId(undefined);
            }
            if (except !== 'transactions') setShowTransactions(false);
            if (except !== 'vault') {
                setShowDocs(false);
                setVaultOpenScanner(false);
            }
        };
        window.addEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
        return () => window.removeEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
    }, []);

    useEffect(() => {
        try {
            if (showCommunity) {
                sessionStorage.setItem(LAWYER_COMMUNITY_OPEN_KEY, '1');
                return;
            }
            sessionStorage.removeItem(LAWYER_COMMUNITY_OPEN_KEY);
            if (activeTab === 'home') {
                sessionStorage.removeItem(LAWYER_DASHBOARD_TAB_KEY);
            } else {
                sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, activeTab);
            }
        } catch {
            /* ignore storage */
        }
    }, [activeTab, showCommunity]);

    const openCommunityTab = useCallback(() => {
        dismissTransientOverlays();
        prefetchCommunityScreen();
        setShowCommunity(true);
    }, []);

    const handleCommunityBack = useCallback(() => {
        setShowCommunity(false);
        setCommunityDeepLink(null);
        if (typeof window !== 'undefined' && window.location.hash.includes('community/post/')) {
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }
    }, []);

    const openCriminalCase = useCallback(
        (caseId: string, options?: OpenCriminalCaseOptions) => {
            const trimmed = String(caseId ?? '').trim();
            if (!trimmed) return;
            prefetchCriminalDashboard();

            if (options?.keepReturnTarget) {
                setCriminalDashboardCaseId(trimmed);
                return;
            }

            if (options?.fromLawsuitsWorkspace) {
                criminalReturnTargetRef.current = 'lawsuits_workspace';
            } else {
                criminalReturnTargetRef.current = 'main';
                setShowLawsuitsWorkspace(false);
                setArchiveType(null);
            }

            setCriminalDashboardCaseId(trimmed);
        },
        [setArchiveType],
    );

    const closeCriminalCase = useCallback(() => {
        const returnTarget = criminalReturnTargetRef.current;
        setCriminalDashboardCaseId(null);
        criminalReturnTargetRef.current = 'main';

        if (returnTarget === 'lawsuits_workspace') {
            setShowLawsuitsWorkspace(true);
        }
    }, []);

    // prefetch ثانوي — يُنسَّق من LawyerDashboardBackgroundServices بعد idle (تجنّب التكرار)
    useEffect(() => {
        const syncCommunityHash = () => {
            const target = parseCommunityDeepLinkFromLocation(window.location);
            if (target) {
                setCommunityDeepLink((prev) => ({
                    ...prev,
                    postId: target.postId,
                    openComments: target.openComments,
                }));
                openCommunityTab();
            }
        };
        syncCommunityHash();
        window.addEventListener('hashchange', syncCommunityHash);
        return () => window.removeEventListener('hashchange', syncCommunityHash);
    }, [openCommunityTab]);

    const enterHomeLayoutEdit = useCallback(() => {
        setShowSettings(false);
        setActiveTab('home');
        setHomeLayoutEditMode(true);
    }, []);

    const exitHomeLayoutEdit = useCallback(() => {
        setHomeLayoutEditMode(false);
    }, []);

    return {
        showContractGenerator,
        setShowContractGenerator,
        vaultOpenScanner,
        setVaultOpenScanner,
        showSettings,
        setShowSettings,
        openSettings,
        openProfileTab,
        homeLayoutEditMode,
        setHomeLayoutEditMode,
        enterHomeLayoutEdit,
        exitHomeLayoutEdit,
        showGlobalSearch,
        setShowGlobalSearch,
        globalSearchInitialQuery,
        setGlobalSearchInitialQuery,
        searchIndexVersion,
        setSearchIndexVersion,
        calendarSearchFocus,
        setCalendarSearchFocus,
        tasksManagerFocusTaskId,
        setTasksManagerFocusTaskId,
        transactionsFocusId,
        setTransactionsFocusId,
        showDocs,
        setShowDocs,
        fieldTasksSheetOpen,
        setFieldTasksSheetOpen,
        showTasksManager,
        setShowTasksManager,
        activeTab,
        setActiveTab,
        showCommunity,
        setShowCommunity,
        communityDeepLink,
        setCommunityDeepLink,
        showTransactions,
        setShowTransactions,
        showLawsuitsWorkspace,
        setShowLawsuitsWorkspace,
        lawsuitsWorkspaceTab,
        setLawsuitsWorkspaceTab,
        lawsuitsDossierSection,
        setLawsuitsDossierSection,
        criminalDashboardCaseId,
        setCriminalDashboardCaseId,
        isCriminalDossierOpen,
        openGlobalSearch,
        openFieldTasksSheet,
        openTasksManager,
        openVaultModal,
        openTransactionsHub,
        openCommunityTab,
        handleCommunityBack,
        openCriminalCase,
        closeCriminalCase,
    };
}
