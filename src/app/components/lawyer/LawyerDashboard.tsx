// ✅ SECURITY FIX: Using persistenceRepository.load() instead of .get() - v2.0.2-20260306
import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Session, User } from '@supabase/supabase-js';
import { 
    Plus, Scale, FileText, Hammer,
    ChevronRight, Settings, X, 
    Search, Bell, UserCircle, MessageCircle, Home, Calendar, Clock
} from 'lucide-react';
import { useAppTheme } from '@/app/context/AppContext';
import { debug } from '@/app/utils/debug';
import { TIMING, PERFORMANCE, STORAGE_KEYS } from '@/app/utils/constants';
import logger from '@/app/utils/logger';

import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { CALENDAR_SOURCE_PATCHED_EVENT } from '@/app/services/calendarBridge.types';
import type { CalendarSourcePatchDetail } from '@/app/services/calendarBridgePersistence';
import { loadLawsuitFilesRaw, saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import {
    syncExecutionFileToCalendar,
    syncLawsuitFileToCalendar,
} from '@/app/services/calendarDossierSync';
import { SafeView } from '@/app/components/shared/SafeView';
import type { CommandCenterNote as Note } from './commandCenterTypes';
import { notesVault } from '@/app/data/NotesVault';
import {
    bidirectionalMerge,
    NOTES_VAULT_CHANGED,
    linkGlobalToVault,
    vaultIdForGlobal,
    unlinkGlobal,
} from '@/app/services/notesSyncBridge';
import { normalizeNotesList, dashboardNoteToCloudPayload } from '@/app/services/notesCloudAdapter';
import { SmartToast } from '@/app/components/ui/SmartToast';

import { supabase } from '../../lib/supabase-client';
import { useAuth } from '@/app/context/AuthContext';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { useDismissedAlertIds } from '@/app/hooks/useDismissedAlertIds';
import { filterVisibleAlerts } from '@/app/services/appAlertDismiss';
import { PushNotificationService } from '@/app/services/PushNotificationService';
import { markAlertSeenForPush } from '@/app/services/appAlertPushSync';
import { resolveAlertNavigation } from '@/app/services/alertNavigation';
import { parseWorkspaceRoute } from '@/app/workspace/workspaceRoutes';
import { unpinWorkspaceForDeletedFile, unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
import { parseCommunityDeepLinkFromLocation } from '@/app/components/lawyer/CommunityScreen/communityDeepLink';
// Removed: AlternativePrivacyProtocol (deleted in refactoring)
// LawyerNewCase — استيراد مباشر (تجنّب lazy/HMR الذي يسبب ReferenceError)
import { useCaseStore, type LegalCase } from '@/app/stores/caseStore';
import { consumeOpenCriminalCasesListRequest } from './criminal-system/criminalDevEntry';
import { LazyLawyerNewCase } from '@/app/utils/lazy/lawyerNewCaseModal';
import {
    LazyArchivePortal,
    LazyBackendTestingPanel,
    LazyClientRequestsHub,
    LazyCommunityScreen,
    LazyExecutionCreationView,
    LazyExecutionDashboard,
    LazyGlobalSearchOverlay,
    LazyHamiSettings,
    LazyLawyerAuth,
    LazyLegalCommandCenterDock,
    LazyLawsuitsWorkspace,
    LazyLawyerHomeHubCard,
    LazyNotepadModal,
    LazyNotificationPanel,
    LazyRoyalLawyerProfile,
    LazyScannerModal,
    LazySmartContractGenerator,
    LazySmartCriminalLibrary,
    LazyCriminalDashboard,
    prefetchCriminalDashboard,
    prefetchDossierShells,
    prefetchSmartFileModal,
    LazySmartFileModal,
    LazySmartLegalRadar,
    LazySmartVaultModal,
    LazyTransactionsSystem,
    LazyUnifiedCommandHub,
    LazyTasksManager,
    LazyViewUrgentAndOrdersDashboard,
} from '@/app/utils/lazyComponents';
import { HamiShieldLogoPlaceholder } from '../../assets/logo-placeholders';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { useAutoSave } from '@/app/hooks/useAutoSave';
import { useAutoSync } from '@/app/hooks/useAutoSync';
import { SupabaseService } from '@/app/services/SupabaseService';
import { EXECUTION_FILES_STORAGE_KEY, loadExecutionFilesRaw, saveExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
// CacheService removed — unused (415 lines of dead code)

// --- SHARED & REFACTORED COMPONENTS ---
import { 
    normalizeArabic, HighlightedText, THEMES, SHAPES, useThemeStyles, 
    CaseType, ThemeKey, ShapeKey, FileData, Party 
} from './LawyerShared';
// مركز الممارسة: تنبيهات + رادار 48س (التثبيت عبر أزرار الأقسام فقط)
// 🆕 V10.5: Enhanced Utilities
import { storageCache } from '@/app/utils/storageCache';
import { removeExecutionStorageBundle } from '@/app/utils/executionStorageKeys';
import { isBackgroundPhase, useRuntimePhase } from '@/app/runtime/runtimePhase';
import {
    CriminalDashboardBridgeProvider,
    useCriminalDashboardBridge,
} from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import { purgeExpiredExecutionsFromTrash, stripExecutionTrashFields } from '@/app/utils/executionTrash';
import {
    purgeExpiredLawsuitsFromTrash,
    shouldAutoPurgeLawsuitFromTrash,
} from '@/app/utils/lawsuitTrash';
import {
    cleanupCalendarForUser,
    pruneOrphanedBridgeEvents,
    removeAllBridgedEventsForEntity,
} from '@/app/services/calendarDossierSync';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import {
    QUANTUM_TASKS_CHANGED_EVENT,
    useIncrementalCalendarSync,
} from '@/app/hooks/useIncrementalCalendarSync';
import { useClusterScanSources } from '@/app/workspace/useClusterScanSources';
import { useWorkspacePinMaintenance } from '@/app/workspace/useWorkspacePinMaintenance';
import ControlMenu from './LawyerDashboardParts/components/ControlMenu';
import DossierOpeningFallbackComponent from './LawyerDashboardParts/components/DossierOpeningFallback';
import AddClientModal from './LawyerDashboardParts/components/AddClientModal';
import { Header } from './LawyerDashboardParts/components/Header';
import { FieldTasksBottomSheet } from './dashboard/FieldTasksBottomSheet';
import {
    QuantumTasksContext,
    type QuantumTasksContextValue,
} from '@/app/context/QuantumTasksContext';
import { useQuantumTasks } from '@/app/hooks/useQuantumTasks';
import {
    deserializeQuantumTasks,
    QUANTUM_TASKS_STORAGE_KEY,
    serializeQuantumTasks,
} from '@/app/utils/quantumTasksStorage';
import { LawyerSettingsProvider, useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import { resolveThemeMode, loadPersistedWallpaper } from '@/app/services/settings';
import { useAppLock } from '@/app/hooks/useAppLock';
import { AppLockOverlay } from '@/app/components/lawyer/AppLockOverlay';
import { maybeShowWeeklyBackupReminder } from '@/app/services/settings/backupReminder';
import { countPendingFieldTasks } from '@/app/utils/quantumTasksStorage';
import { buildFileDataFromNewCaseSave } from '@/app/domain/lawsuit/lawsuitFileFactory';
import { CAIRO_FONT_STYLE, HEADER_BTN_BG_STYLE, LAWYER_LAZY_FALLBACK } from './LawyerDashboardParts/constants';
import type { ArchiveType, ClientRequest, ThemeConfig } from '@/app/types/common';
import { mapFileStatusToCaseStatus, isFileData, isRecord, coerceExecutionFilePreserveId, coerceExecutionFile, coerceLawsuitStage, getNavUnderlayStyle, lawyerOverlayToArchivePortalType } from './LawyerDashboardParts/utils';
import type { GlobalNote, WizardNoteSeed, WizardInitialData, ExecutionFile } from './LawyerDashboardParts/types';

const EXECUTION_FILES_KEY = EXECUTION_FILES_STORAGE_KEY;
const DOSSIER_OPENING_FALLBACK = <DossierOpeningFallbackComponent />;

const LazyLawyerDashboardBackgroundServices = React.lazy(
    () => import('@/app/components/lawyer/dashboard/LawyerDashboardBackgroundServices'),
);

type LawyerArchiveOverlay =
    | 'client_requests'
    | 'all'
    | 'deleted'
    | 'lawsuit'
    | 'transaction'
    | 'execution'
    | null;

// --- GEMINI AI COMPONENTS ---

// --- MAIN DASHBOARD ---
type LawyerDashboardProps = {
    onLogout: () => void;
    onOpenProfile?: () => void;
    onNavigateToCase?: (caseId: string) => void;
    onAppNavigate?: (target: 'privacy' | 'support' | 'settings') => void;
};

type LawyerDashboardInnerProps = LawyerDashboardProps & {
    quantum: QuantumTasksContextValue;
};

function LawyerDashboardQuantumShell(props: LawyerDashboardProps) {
    const initial = useMemo(() => {
        const blob = persistenceRepository.load<unknown>(QUANTUM_TASKS_STORAGE_KEY);
        return deserializeQuantumTasks(blob);
    }, []);

    const quantum = useQuantumTasks(initial);

    useEffect(() => {
        persistenceRepository.save(QUANTUM_TASKS_STORAGE_KEY, serializeQuantumTasks(quantum.tasks));
        try {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent(QUANTUM_TASKS_CHANGED_EVENT));
            }
        } catch {
            /* ignore */
        }
    }, [quantum.tasks]);

    return (
        <QuantumTasksContext.Provider value={quantum}>
            <LawyerDashboardInner {...props} quantum={quantum} />
        </QuantumTasksContext.Provider>
    );
}

const LawyerDashboardInner = (props: LawyerDashboardInnerProps) => {
    const runtimePhase = useRuntimePhase();
    const backgroundRuntimeEnabled = isBackgroundPhase(runtimePhase);
    const { user: authUser } = useAuth();
    const bridgeLawyerId = resolveCalendarUserId(authUser?.id ?? null);

    return (
        <CriminalDashboardBridgeProvider enabled={backgroundRuntimeEnabled} lawyerId={bridgeLawyerId}>
            <LawyerDashboardCore {...props} backgroundRuntimeEnabled={backgroundRuntimeEnabled} />
        </CriminalDashboardBridgeProvider>
    );
};

type LawyerDashboardCoreProps = LawyerDashboardInnerProps & {
    backgroundRuntimeEnabled: boolean;
};

const LawyerDashboardCore = ({
    onLogout,
    onOpenProfile,
    onNavigateToCase,
    onAppNavigate,
    quantum,
    backgroundRuntimeEnabled,
}: LawyerDashboardCoreProps) => {
    const criminalBridge = useCriminalDashboardBridge();
    const { settings, currentTheme, currentShape, pushAllowed } = useLawyerSettings();
    const {
        locked: appLocked,
        unlocking: appUnlocking,
        requiresBiometricToUnlock,
        unlockWithBiometric,
        unlockContinue,
    } = useAppLock(settings.security);
    const localAutoSave = settings.data.autoSave;
    const syncNotesOn = settings.data.cloudSync && settings.data.syncNotes;
    const syncFilesOn = settings.data.cloudSync && settings.data.syncFiles;
    const syncExecutionOn = settings.data.cloudSync && settings.data.syncExecution;

    // --- AUTH & CLOUD STATE ---
    const [user, setUser] = useState<User | null>(null);
    const { user: authUser } = useAuth();
    const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
    const notifications = useNotificationStore((s) => s.notifications);
    const setNotificationUserId = useNotificationStore((s) => s.setUserId);
    const [showNotifications, setShowNotifications] = useState(false);

    // 🔑 سجّل الـ userId مبكراً في الـ notificationStore حتى تتمكن AuditLog من حفظ الإشعارات
    // محلياً حتى قبل أن يفتح المستخدم لوحة الإشعارات.
    useEffect(() => {
        const uid = user?.id || authUser?.id || 'demo_user';
        setNotificationUserId(uid);
    }, [user?.id, authUser?.id, setNotificationUserId]);

    // افتح fetch فور التشغيل (لا ننتظر فتح اللوحة) حتى يدمج النظام الإشعارات الفورية مع المخزّنة.
    useEffect(() => {
        const uid = user?.id || authUser?.id;
        if (!uid) return;
        void fetchNotifications(uid);
    }, [user?.id, authUser?.id, fetchNotifications]);
    const [notificationPanelMounted, setNotificationPanelMounted] = useState(false);
    const [showUrgentDashboard, setShowUrgentDashboard] = useState(false);
    const [urgentFocusCaseId, setUrgentFocusCaseId] = useState<string | undefined>();
    const [showAddClientModal, setShowAddClientModal] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const calendarCleanedOnceRef = useRef(false);

    useEffect(() => {
        if (showNotifications) setNotificationPanelMounted(true);
    }, [showNotifications]);

    useEffect(() => {
        if (calendarCleanedOnceRef.current) return;
        const uid = resolveCalendarUserId(user?.id ?? authUser?.id ?? null);
        calendarCleanedOnceRef.current = true;
        void cleanupCalendarForUser(uid);
    }, [user?.id, authUser?.id]);

    const resolveNotesUserId = useCallback(
        () => user?.id ?? authUser?.id ?? null,
        [user?.id, authUser?.id],
    );

    const mergeNotesStores = useCallback((rawNotes?: unknown) => {
        const uid = resolveNotesUserId();
        if (!uid) return;
        notesVault.setUserScope(uid);
        setGlobalNotes((prev) => {
            const base = rawNotes !== undefined ? normalizeNotesList(rawNotes) : prev;
            const { mergedGlobal, mergedVault } = bidirectionalMerge(uid, base, notesVault.getNotes());
            notesVault.replaceAll(mergedVault);
            return mergedGlobal;
        });
    }, [resolveNotesUserId]);

    useEffect(() => {
        notesVault.setUserScope(resolveNotesUserId());
    }, [resolveNotesUserId]);

    useEffect(() => {
        const uid = resolveNotesUserId();
        if (!uid) return;
        mergeNotesStores();
    }, [resolveNotesUserId, mergeNotesStores]);

    useEffect(() => {
        const onVaultChanged = () => {
            mergeNotesStores();
            setSearchIndexVersion((v) => v + 1);
        };
        window.addEventListener(NOTES_VAULT_CHANGED, onVaultChanged);
        return () => window.removeEventListener(NOTES_VAULT_CHANGED, onVaultChanged);
    }, [mergeNotesStores]);

    // Initial Fetch
    useEffect(() => {
        if (user?.id) {
            fetchNotifications(user.id);
        }
    }, [user?.id]);

    // Router Handler (Bridge from Notifications to App)
    const handleNotificationRouting = (path: string, payload: Record<string, unknown> | null) => {
        if (path === 'schedule') {
            setActiveTab('schedule');
            return;
        }
        if (path === 'case_details') {
            const caseId = payload && typeof payload.caseId === 'string' ? payload.caseId : null;
            if (caseId) {
                // Internal Routing - search both lawsuit files and execution files
                const lawsuitTarget = files.find((f) => String(f.id) === caseId);
                const executionTarget = executionFiles.find((f) => String(f.id) === caseId);
                const target = lawsuitTarget || executionTarget;
                if (target) {
                    setActiveFile(target);
                    SmartToast.info(`جاري فتح القضية...`);
                }
            } else {
                setArchiveType('all');
            }
        } else if (path === 'ai_drafter') {
            setArchiveType('all');
            SmartToast.info('افتح الإضبارة من الأرشيف');
        } else if (path === 'scan_document') {
            setShowScanner(true);
        } else if (path === 'vault') {
            setShowDocs(true);
        }
    };
    const [authLoading, setAuthLoading] = useState(true);
    const [appAlerts, setAppAlerts] = useState<SecretaryAlert[]>([]);
    const [appAlertsLoading, setAppAlertsLoading] = useState(false);
    const [appAlertsError, setAppAlertsError] = useState<string | null>(null);
    const refreshAppAlertsRef = useRef<() => void>(() => {});
    const syncExecutionFilesNowRef = useRef<() => void>(() => {});
    const syncLawsuitFilesNowRef = useRef<() => void>(() => {});
    const syncNotesNowRef = useRef<() => void>(() => {});
    const refreshAppAlerts = useCallback(() => {
        refreshAppAlertsRef.current();
    }, []);
    const handleAlertsFromBackground = useCallback(
        (payload: {
            alerts: SecretaryAlert[];
            loading: boolean;
            error: string | null;
            refresh: () => void;
        }) => {
            setAppAlerts(payload.alerts);
            setAppAlertsLoading(payload.loading);
            setAppAlertsError(payload.error);
            refreshAppAlertsRef.current = payload.refresh;
        },
        [],
    );

    // --- CHECK AUTH & DEADLINES ON MOUNT ---
    useEffect(() => {
        if (authUser && !user) {
            setUser(authUser);
            setAuthLoading(false);
            return;
        }
        const AUTH_TIMEOUT_MS = 8000; // 8s max wait - never block UI forever
        const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), AUTH_TIMEOUT_MS)
        );
        const initCloud = async () => {
            try {
                const result = (await Promise.race([
                    supabase.auth.getSession(),
                    timeoutPromise.then(() => ({ data: { session: null } }))
                ])) as { data: { session: Session | null } };
                const session = result.data.session;
                
                if (session?.user) {
                    setUser(session.user);
                    setAuthLoading(false);
                    const runDeadlineCheck = () => {
                        void import('../../services/lawyer-cloud')
                            .then(({ LawyerDB }) =>
                                LawyerDB.checkUpcomingDeadlines(session.user.id),
                            )
                            .then((due) => {
                                if (due && due.length > 0) {
                                    SmartToast.warning(
                                        `⚠️ تنبيه قضائي: لديك ${due.length} مواعيد تنتهي غداً!`,
                                        8000,
                                    );
                                }
                            })
                            .catch(debug.error);
                    };
                    if (typeof requestIdleCallback !== 'undefined') {
                        requestIdleCallback(runDeadlineCheck, { timeout: 8_000 });
                    } else {
                        window.setTimeout(runDeadlineCheck, 2_000);
                    }
                } else {
                    setAuthLoading(false);
                }
            } catch {
                setAuthLoading(false); // Always unblock on error/timeout
            }
        };
        initCloud();
    }, [authUser]);

    useEffect(() => {
        if (authLoading || !user) return;
        maybeShowWeeklyBackupReminder(settings.data.weeklyBackupReminder);
    }, [authLoading, user, settings.data.weeklyBackupReminder]);

    // New Action Modals State
    const [showScanner, setShowScanner] = useState(false);
    const [showContractGenerator, setShowContractGenerator] = useState(false);

    // New Settings State
    const [showControlMenu, setShowControlMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showSmartLib, setShowSmartLib] = useState(false); // NEW STATE FOR SMART LIBRARY
    const [showGlobalSearch, setShowGlobalSearch] = useState(false);
    const [globalSearchInitialQuery, setGlobalSearchInitialQuery] = useState('');
    const [searchIndexVersion, setSearchIndexVersion] = useState(0);
    const [calendarSearchFocus, setCalendarSearchFocus] = useState<{ date?: string; eventId?: string } | null>(null);
    const [tasksManagerFocusTaskId, setTasksManagerFocusTaskId] = useState<string | undefined>();
    const [transactionsFocusId, setTransactionsFocusId] = useState<string | undefined>();
    const [notepadFocusNoteId, setNotepadFocusNoteId] = useState<string | undefined>();

    const openGlobalSearch = useCallback((seed = '') => {
        setGlobalSearchInitialQuery(seed);
        setShowGlobalSearch(true);
    }, []);

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

    const searchNotifications = useMemo(
        () =>
            notifications.map((n) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type,
            })),
        [notifications],
    );
    const [showDocs, setShowDocs] = useState(false); // NEW STATE FOR DOCS VAULT
    /** Phase 28 — ستارة المهام الميدانية (بديل الويدجت الأفقي) */
    const [fieldTasksSheetOpen, setFieldTasksSheetOpen] = useState(false);
    const [showTasksManager, setShowTasksManager] = useState(false);
    const [showTestingPanel, setShowTestingPanel] = useState(false); // ✅ Backend Testing Panel
    
    // 🔐 SECURITY: Check Alternative Privacy Mode (must be defined early)
    const [isAlternativeMode, setIsAlternativeMode] = useState(false);
    
    useEffect(() => {
        setIsAlternativeMode(settings.security.decoyMode);
    }, [settings.security.decoyMode]);

    // New Feature States (Refactored for Tab Navigation)
    const [activeTab, setActiveTab] = useState<'home' | 'notifications' | 'profile' | 'schedule' | 'community'>('home');
    const [communityDeepLink, setCommunityDeepLink] = useState<{
        postId?: string;
        openComments?: boolean;
        section?: 'forum' | 'repository';
    } | null>(() => {
        if (typeof window === 'undefined') return null;
        const target = parseCommunityDeepLinkFromLocation(window.location);
        return target
            ? { postId: target.postId, openComments: target.openComments, section: 'forum' as const }
            : null;
    });
    const [showTransactions, setShowTransactions] = useState(false); // NEW: Transactions System
    const [showLawsuitsWorkspace, setShowLawsuitsWorkspace] = useState(false);
    const [lawsuitsWorkspaceTab, setLawsuitsWorkspaceTab] = useState<'civil' | 'urgent'>('civil');
    const [lawsuitsDossierSection, setLawsuitsDossierSection] = useState<
        'all' | 'civil' | 'personal' | 'criminal'
    >('all');
    const [criminalDashboardCaseId, setCriminalDashboardCaseId] = useState<string | null>(null);
    const isCriminalDossierOpen = Boolean(criminalDashboardCaseId);
    type CriminalReturnTarget = 'lawsuits_workspace' | 'main';
    type OpenCriminalCaseOptions = {
        /** فتح من مخزن الإضابير — الرجوع يعيد المخزن */
        fromLawsuitsWorkspace?: boolean;
        /** تبديل إضبارة داخل اللوحة دون تغيير وجهة الرجوع */
        keepReturnTarget?: boolean;
    };
    const criminalReturnTargetRef = useRef<CriminalReturnTarget>('main');
    const openCriminalCase = useCallback((caseId: string, options?: OpenCriminalCaseOptions) => {
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
    }, []);
    const closeCriminalCase = useCallback(() => {
        const returnTarget = criminalReturnTargetRef.current;
        setCriminalDashboardCaseId(null);
        criminalReturnTargetRef.current = 'main';

        if (returnTarget === 'lawsuits_workspace') {
            setShowLawsuitsWorkspace(true);
        }
    }, []);

    useEffect(() => {
        const syncCommunityHash = () => {
            const target = parseCommunityDeepLinkFromLocation(window.location);
            if (target) {
                setCommunityDeepLink({ postId: target.postId, openComments: target.openComments });
                setActiveTab('community');
            }
        };
        syncCommunityHash();
        window.addEventListener('hashchange', syncCommunityHash);
        return () => window.removeEventListener('hashchange', syncCommunityHash);
    }, []);
    
    // THEME AND SHAPE
    const { theme, shapeClass } = useThemeStyles(currentTheme, currentShape);

    // --- NEW SETTINGS STATE ---
    const [isEditMode, setIsEditMode] = useState(false);
    
    const [activeFile, setActiveFile] = useState<FileData | ExecutionFile | null>(null);
    const [archiveType, setArchiveType] = useState<LawyerArchiveOverlay>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [subFileBase, setSubFileBase] = useState<FileData | null>(null); 
    const [wizardInitialData, setWizardInitialData] = useState<WizardInitialData | null>(null);

    // --- GLOBAL NOTEPAD STATE ---
    const [isNotepadOpen, setIsNotepadOpen] = useState(false);
    const [notepadMode, setNotepadMode] = useState<'list' | 'create' | 'voice'>('list');
    
    // NEW: Smart Tools State
    const [showUtilities, setShowUtilities] = useState(false);
    const [showNotebook, setShowNotebook] = useState(false);
    const [showReferences, setShowReferences] = useState(false);
    const [isDemoScenario, setIsDemoScenario] = useState(false); // For the specific "Al-Amal" demo flow

    const [globalNotes, setGlobalNotes] = useState<GlobalNote[]>(
        () => persistenceRepository.load<GlobalNote[]>(STORAGE_KEYS.LAWYER_NOTES) || [],
    );
    useAutoSave(STORAGE_KEYS.LAWYER_NOTES, globalNotes, 2_000, localAutoSave);
    
    const [files, setFiles] = useState<FileData[]>(() => {
        const loaded = persistenceRepository.load<FileData[]>(STORAGE_KEYS.LAWYER_FILES) || [];
        // Clean up known stale mock case from previous sessions
        if (loaded.length === 1 && loaded[0]?.id === 1 && loaded[0]?.caseNo === '2025/ب/522') {
            persistenceRepository.save(STORAGE_KEYS.LAWYER_FILES, []);
            return [];
        }
        return loaded;
    });
    useAutoSave(STORAGE_KEYS.LAWYER_FILES, files, 2_000, localAutoSave);

    useEffect(() => {
        const handler = (ev: Event) => {
            const detail = (ev as CustomEvent<CalendarSourcePatchDetail>).detail;
            if (!detail?.sourceModule) return;
            if (detail.sourceModule === 'lawsuit') {
                const merged = loadLawsuitFilesRaw() as FileData[];
                if (!Array.isArray(merged)) return;
                setFiles(merged);
                try {
                    persistenceRepository.save(STORAGE_KEYS.LAWYER_FILES, merged);
                } catch {
                    /* ignore in tests */
                }
                return;
            }
            if (detail.sourceModule === 'execution') {
                const merged = loadExecutionFilesRaw();
                if (!Array.isArray(merged)) return;
                setExecutionFiles(merged);
                try {
                    saveExecutionFilesRaw(merged);
                } catch {
                    /* ignore in tests */
                }
            }
        };
        window.addEventListener(CALENDAR_SOURCE_PATCHED_EVENT, handler);
        return () => window.removeEventListener(CALENDAR_SOURCE_PATCHED_EVENT, handler);
    }, []);

    // 🛡️ Auto-Sync للحماية من فقدان البيانات (Local storage only - Cloud disabled)
    const { syncNow: syncFiles, isSyncing: isSyncingFiles, lastSyncTime: filesLastSync } = useAutoSync('lawyer-files', files, {
        enabled: false,
        interval: 30 * 60 * 1000,
        saveOnChange: false,
        onSyncSuccess: (timestamp) => {
            // Silently save - no console logs needed
        }
        // إزالة onSyncError لتجنب الرسائل المزعجة - البيانات محفوظة محلياً
    });

    // --- EXECUTION FILES STATE (PROMPT 1) ---
    const [executionFiles, setExecutionFiles] = useState<ExecutionFile[]>([]);  // RESET: Start with empty array
    useAutoSave(EXECUTION_FILES_KEY, executionFiles, 2_000, localAutoSave);

    const calendarUserId = resolveCalendarUserId(user?.id ?? authUser?.id ?? null);
    const { pendingTasks: quantumPendingForField, tasks: quantumTasks } = quantum;
    const criminalCasesForCluster = criminalBridge.ready ? criminalBridge.criminalCases : [];
    useIncrementalCalendarSync(
        calendarUserId,
        files,
        executionFiles,
        globalNotes,
        quantumTasks,
        criminalCasesForCluster,
    );
    const clusterScanSources = useClusterScanSources({
        lawyerId: calendarUserId,
        lawsuitFiles: files,
        executionFiles,
        criminalCases: criminalCasesForCluster,
        notes: globalNotes,
        fieldTasks: quantumTasks,
    });
    useWorkspacePinMaintenance({ clusterScanSources });
    const homeHubClusterInput = useMemo(
        () => ({
            lawsuitFiles: clusterScanSources.lawsuitFiles,
            executionFiles: clusterScanSources.executionFiles,
            criminalCases: clusterScanSources.criminalCases,
            urgentCases: clusterScanSources.urgentCases,
            threadingTransactions: clusterScanSources.threadingTransactions,
            notes: clusterScanSources.notes,
            fieldTasks: clusterScanSources.fieldTasks,
            pinnedItems: [],
        }),
        [clusterScanSources],
    );

    const { dismissedIds, dismiss: dismissAppAlertBase } = useDismissedAlertIds();
    const markAsReadNotification = useNotificationStore((s) => s.markAsRead);

    const dismissAppAlert = useCallback(
        (alertId: string) => {
            dismissAppAlertBase(alertId);
            markAlertSeenForPush(alertId);
            if (alertId.startsWith('notif:') && user?.id) {
                const notifId = alertId.slice('notif:'.length);
                void markAsReadNotification(user.id, notifId);
            }
        },
        [dismissAppAlertBase, markAsReadNotification, user?.id, calendarUserId],
    );

    const visibleAppAlerts = useMemo(
        () => filterVisibleAlerts(appAlerts, dismissedIds),
        [appAlerts, dismissedIds],
    );

    // الجرس مستقل تماماً عن SecretaryAlerts (تلك مسؤولية البطاقة العامة).
    // headerUnreadCount = عدد إشعارات NotificationDB غير المقروءة فقط.
    const notificationsUnreadCount = useNotificationStore((s) => s.unreadCount);
    const headerUnreadCount = notificationsUnreadCount;

    const handleAlertResolved = useCallback(
        (alert: SecretaryAlert) => {
            dismissAppAlert(alert.id);
            void refreshAppAlerts();
        },
        [dismissAppAlert, refreshAppAlerts],
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
                    setActiveTab(nav.tab);
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
                            void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                                AuditLog.dossier.opened({
                                    module: 'threading',
                                    entityId: String(txFile.id),
                                    caseNo: (txFile as { caseNo?: string }).caseNo,
                                });
                            }).catch(() => {});
                            return;
                        }
                        setTransactionsFocusId(String(txId));
                    }
                    setShowTransactions(true);
                    return;
                }
                case 'threading_tx':
                    setActiveTab('home');
                    setTransactionsFocusId(nav.entityId);
                    setShowTransactions(true);
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
                        void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                            void import('@/app/domain/lawsuit/lawsuitJurisdiction').then(({ resolveLawsuitJurisdiction }) => {
                                const j = resolveLawsuitJurisdiction(f as Record<string, unknown>);
                                const module = j === 'personal' ? 'personal' : 'civil';
                                AuditLog.dossier.opened({ module, entityId: String(f.id), caseNo: (f as { caseNo?: string }).caseNo });
                            }).catch(() => {});
                        }).catch(() => {});
                        return;
                    }
                    SmartToast.info('لم يُعثر على إضبارة الدعوى — ربما نُقلت للأرشيف أو السلة');
                    return;
                }
                case 'open_execution': {
                    const ex = executionFiles.find((file) => String(file.id ?? '') === nav.entityId);
                    if (ex) {
                        setActiveFile(coerceExecutionFilePreserveId(ex));
                        void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                            AuditLog.dossier.opened({ module: 'execution', entityId: String(ex.id ?? ''), caseNo: (ex as { caseNo?: string }).caseNo });
                        }).catch(() => {});
                        return;
                    }
                    SmartToast.info('لم يُعثر على إضبارة التنفيذ');
                    return;
                }
                case 'open_criminal':
                    openCriminalCase(nav.entityId);
                    void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                        AuditLog.dossier.opened({ module: 'criminal', entityId: nav.entityId });
                    }).catch(() => {});
                    return;
                case 'open_field_tasks':
                    setActiveTab('home');
                    setFieldTasksSheetOpen(true);
                    return;
                default:
                    return;
            }
        },
        [files, executionFiles, quantumTasks, user?.id, calendarUserId],
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
                case 'lawsuit': {
                    const f = files.find((file) => String(file.id) === parsed.id);
                    if (f && isFileData(f)) {
                        setActiveFile(f);
                        void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                            void import('@/app/domain/lawsuit/lawsuitJurisdiction').then(({ resolveLawsuitJurisdiction }) => {
                                const j = resolveLawsuitJurisdiction(f as Record<string, unknown>);
                                const module = j === 'personal' ? 'personal' : 'civil';
                                AuditLog.dossier.opened({ module, entityId: String(f.id), caseNo: (f as { caseNo?: string }).caseNo });
                            }).catch(() => {});
                        }).catch(() => {});
                        return;
                    }
                    SmartToast.info('لم يُعثر على إضبارة الدعوى');
                    return;
                }
                case 'execution': {
                    const ex = executionFiles.find((file) => String(file.id ?? '') === parsed.id);
                    if (ex) {
                        setActiveFile(coerceExecutionFilePreserveId(ex));
                        void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                            AuditLog.dossier.opened({ module: 'execution', entityId: String(ex.id ?? ''), caseNo: (ex as { caseNo?: string }).caseNo });
                        }).catch(() => {});
                        return;
                    }
                    SmartToast.info('لم يُعثر على إضبارة التنفيذ');
                    return;
                }
                case 'criminal':
                    openCriminalCase(parsed.id);
                    void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                        AuditLog.dossier.opened({ module: 'criminal', entityId: parsed.id });
                    }).catch(() => {});
                    return;
                case 'urgent':
                    setUrgentFocusCaseId(parsed.id);
                    setShowUrgentDashboard(true);
                    return;
                case 'transaction': {
                    const f = files.find((file) => String(file.id) === parsed.id);
                    if (f && isFileData(f)) {
                        setActiveFile(f);
                        void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                            AuditLog.dossier.opened({ module: 'threading', entityId: String(f.id), caseNo: (f as { caseNo?: string }).caseNo });
                        }).catch(() => {});
                        return;
                    }
                    SmartToast.info('لم يُعثر على ملف المعاملة');
                    return;
                }
                case 'threading':
                    setTransactionsFocusId(parsed.id);
                    setShowTransactions(true);
                    return;
                case 'notepad':
                    setNotepadFocusNoteId(parsed.id);
                    setNotepadMode('list');
                    setIsNotepadOpen(true);
                    return;
                case 'task':
                    setTasksManagerFocusTaskId(parsed.id);
                    setShowTasksManager(true);
                    return;
                default:
                    return;
            }
        },
        [files, executionFiles, openCriminalCase],
    );

    useEffect(() => {
        const checkPrivacyMode = () => {
            // 🆕 V10.5: استخدام storageCache بدلاً من persistenceRepository
            const primary = storageCache.get(EXECUTION_FILES_KEY);
            const rawList: unknown[] = Array.isArray(primary) ? primary : loadExecutionFilesRaw();
            if (!Array.isArray(primary) && rawList.length > 0) {
                storageCache.set(EXECUTION_FILES_KEY, rawList);
            }

            const coerced = rawList.map(coerceExecutionFilePreserveId);
            const validFiles = purgeExpiredExecutionsFromTrash(
                coerced.filter((file) => file && (String(file.fileNumber || '').trim() || String(file.caseNo || '').trim()))
            );

            if (validFiles.length !== coerced.length) {
                logger.info(`🔧 [LawyerDashboard] Cleaned ${coerced.length - validFiles.length} invalid files from storage`);
            }

            storageCache.set(EXECUTION_FILES_KEY, validFiles);
            setExecutionFiles(validFiles);
        };
        
        checkPrivacyMode();
    }, []);

    useEffect(() => {
        const reloadFromStorage = (opts?: { clear?: boolean }) => {
            const mergedLawsuits = loadLawsuitFilesRaw() as FileData[];
            if (Array.isArray(mergedLawsuits)) {
                setFiles(mergedLawsuits);
                try {
                    persistenceRepository.save(STORAGE_KEYS.LAWYER_FILES, mergedLawsuits);
                } catch {
                }
            } else {
                setFiles([]);
            }

            const nextNotes = persistenceRepository.load<GlobalNote[]>(STORAGE_KEYS.LAWYER_NOTES) || [];
            setGlobalNotes(Array.isArray(nextNotes) ? nextNotes : []);

            const rawList: unknown[] = loadExecutionFilesRaw();
            const coerced = rawList.map(coerceExecutionFilePreserveId);
            const validFiles = purgeExpiredExecutionsFromTrash(
                coerced.filter((file) => file && (String(file.fileNumber || '').trim() || String(file.caseNo || '').trim())),
            );
            storageCache.set(EXECUTION_FILES_KEY, validFiles);
            setExecutionFiles(validFiles);

            if (opts?.clear) {
                setActiveFile(null);
                setArchiveType(null);
            }

            void refreshAppAlerts();
        };

        const onImported = () => reloadFromStorage();
        const onCleared = () => reloadFromStorage({ clear: true });
        window.addEventListener('hami:data-imported', onImported);
        window.addEventListener('hami:data-cleared', onCleared);
        return () => {
            window.removeEventListener('hami:data-imported', onImported);
            window.removeEventListener('hami:data-cleared', onCleared);
        };
    }, [refreshAppAlerts]);
    
    // 🛡️ Auto-Sync لملفات التنفيذ (Local storage only - Cloud disabled)
    const { syncNow: syncExecutionFiles, isSyncing: isSyncingExecution } = useAutoSync('execution-files', executionFiles, {
        enabled: !isAlternativeMode, // Disable sync in alternative mode
        interval: 30 * 60 * 1000, // 30 دقائق (فقط للحفظ المحلي)
        saveOnChange: true // تمكين الحفظ التلقائي المحلي
    });

    useEffect(() => {
        if (archiveType !== 'execution') return;
        setExecutionFiles((prev) => {
            const next = purgeExpiredExecutionsFromTrash(prev);
            return next.length < prev.length ? next : prev;
        });
    }, [archiveType]);

    const moveExecutionToTrash = useCallback(
        (fileId: string | number) => {
            const idStr = String(fileId);
            setExecutionFiles((prev) => {
                const next = prev.map((f) => {
                    const fId = String(f.id ?? '');
                    return fId === idStr
                        ? { ...f, executionTrashDeletedAt: new Date().toISOString() }
                        : f;
                });
                saveExecutionFilesRaw(next);
                storageCache.set(EXECUTION_FILES_KEY, next);
                return next;
            });
            setActiveFile((cur) => {
                if (!cur) return null;
                return String(cur.id ?? '') === idStr ? null : cur;
            });
            void removeAllBridgedEventsForEntity(
                'execution',
                fileId,
                resolveCalendarUserId(user?.id ?? authUser?.id ?? null),
            );
            void pruneOrphanedBridgeEvents(resolveCalendarUserId(user?.id ?? authUser?.id ?? null));
            unpinWorkspaceItem(fileId, 'execution');
            void refreshAppAlerts();
        },
        [user?.id, authUser?.id, refreshAppAlerts],
    );

    const restoreExecutionFromTrash = useCallback(
        (fileId: string | number) => {
            const idStr = String(fileId);
            setExecutionFiles((prev) => {
                const next = prev.map((f) => (String(f.id) !== idStr ? f : stripExecutionTrashFields(f)));
                saveExecutionFilesRaw(next);
                storageCache.set(EXECUTION_FILES_KEY, next);
                const restored = next.find((f) => String(f.id) === idStr);
                if (restored) {
                    syncExecutionFileToCalendar(restored as unknown as Record<string, unknown>, user?.id);
                }
                return next;
            });
        },
        [user?.id],
    );

    const permanentlyDeleteExecutions = useCallback(
        (ids: Array<string | number>) => {
            const idSet = new Set(ids.map(String));
            idSet.forEach((id) => {
                removeExecutionStorageBundle(id);
                void removeAllBridgedEventsForEntity('execution', id, user?.id);
            });
            setExecutionFiles((prev) => {
                const next = prev.filter((f) => !idSet.has(String(f.id)));
                saveExecutionFilesRaw(next);
                storageCache.set(EXECUTION_FILES_KEY, next);
                return next;
            });
            setActiveFile((cur) => (cur && idSet.has(String(cur?.id)) ? null : cur));
            void pruneOrphanedBridgeEvents(user?.id);
        },
        [user?.id],
    );

    const moveLawsuitToTrash = useCallback(
        (fileId: string | number) => {
            const idStr = String(fileId);
            const calendarUid = resolveCalendarUserId(user?.id ?? authUser?.id ?? null);
            setFiles((prev) => {
                const next = prev.map((f) =>
                    String(f.id) === idStr
                        ? { ...f, status: 'deleted' as const, deletedAt: Date.now() }
                        : f,
                );
                saveLawsuitFilesRaw(next as unknown[]);
                try {
                    persistenceRepository.save(STORAGE_KEYS.LAWYER_FILES, next);
                } catch {
                    /* ignore in tests */
                }
                return next;
            });
            setActiveFile((cur) => (cur && String(cur.id) === idStr ? null : cur));
            void removeAllBridgedEventsForEntity('lawsuit', fileId, calendarUid);
            void pruneOrphanedBridgeEvents(calendarUid);
            void refreshAppAlerts();
        },
        [user?.id, authUser?.id, refreshAppAlerts],
    );

    const restoreLawsuitFromTrash = useCallback(
        (fileId: string | number) => {
            const idStr = String(fileId);
            setFiles((prev) => {
                const next = prev.map((f) =>
                    String(f.id) === idStr
                        ? { ...f, status: 'active' as const, deletedAt: undefined }
                        : f,
                );
                const restored = next.find((f) => String(f.id) === idStr);
                if (restored) {
                    syncLawsuitFileToCalendar(restored as unknown as Record<string, unknown>, user?.id);
                }
                return next;
            });
        },
        [user?.id],
    );

    const archiveLawsuit = useCallback(
        (fileId: string | number) => {
            const idStr = String(fileId);
            const calendarUid = resolveCalendarUserId(user?.id ?? authUser?.id ?? null);
            setFiles((prev) => {
                const next = prev.map((f) =>
                    String(f.id) === idStr ? { ...f, status: 'archived' as const } : f,
                );
                saveLawsuitFilesRaw(next as unknown[]);
                try {
                    persistenceRepository.save(STORAGE_KEYS.LAWYER_FILES, next);
                } catch {
                    /* ignore in tests */
                }
                return next;
            });
            setActiveFile((cur) => (cur && String(cur.id) === idStr ? null : cur));
            void removeAllBridgedEventsForEntity('lawsuit', fileId, calendarUid);
            void pruneOrphanedBridgeEvents(calendarUid);
            void refreshAppAlerts();
        },
        [user?.id, authUser?.id, refreshAppAlerts],
    );

    const restoreArchivedLawsuit = useCallback(
        (fileId: string | number) => {
            const idStr = String(fileId);
            setFiles((prev) => {
                const next = prev.map((f) =>
                    String(f.id) === idStr ? { ...f, status: 'active' as const } : f,
                );
                const restored = next.find((f) => String(f.id) === idStr);
                if (restored) {
                    syncLawsuitFileToCalendar(restored as unknown as Record<string, unknown>, user?.id);
                }
                return next;
            });
        },
        [user?.id],
    );

    const permanentlyDeleteLawsuits = useCallback(
        (ids: Array<string | number>) => {
            const idSet = new Set(ids.map(String));
            idSet.forEach((id) => {
                void removeAllBridgedEventsForEntity('lawsuit', id, user?.id);
            });
            setFiles((prev) => {
                const next = prev.filter((f) => !idSet.has(String(f.id)));
                saveLawsuitFilesRaw(next as unknown[]);
                try {
                    persistenceRepository.save(STORAGE_KEYS.LAWYER_FILES, next);
                } catch {
                    /* ignore in tests */
                }
                return next;
            });
            setActiveFile((cur) => (cur && idSet.has(String(cur?.id)) ? null : cur));
            void pruneOrphanedBridgeEvents(user?.id);
        },
        [user?.id],
    );

    useEffect(() => {
        if (archiveType !== 'lawsuit') return;
        setArchiveType(null);
        setShowLawsuitsWorkspace(true);
    }, [archiveType]);

    useEffect(() => {
        if (!showLawsuitsWorkspace) return;
        setFiles((prev) => {
            const purged = purgeExpiredLawsuitsFromTrash(prev);
            const expiredIds = prev
                .filter((f) => shouldAutoPurgeLawsuitFromTrash(f))
                .map((f) => f.id);
            if (purged.length === prev.length && expiredIds.length === 0) return prev;
            expiredIds.forEach((id) => {
                void removeAllBridgedEventsForEntity('lawsuit', id, user?.id);
            });
            if (expiredIds.length > 0) {
                void pruneOrphanedBridgeEvents(user?.id);
            }
            return purged;
        });
    }, [showLawsuitsWorkspace, user?.id]);
    
    const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
    
    // DEBUG: Track isExecutionModalOpen changes
    useEffect(() => {
        debug.log('🔴 [LawyerDashboard] isExecutionModalOpen changed to:', isExecutionModalOpen);
    }, [isExecutionModalOpen]);

    // PERFORMANCE FIX: useCallback to prevent re-creating function on every render
    const handleAddExecutionFile = useCallback((newFile: Record<string, unknown>) => {
        // 🔐 SECURITY: Block file creation in alternative mode
        if (isAlternativeMode) {
            logger.warn('👻 [LawyerDashboard] Alternative Mode - File creation blocked');
            SmartToast.info('📋 تم حفظ الملف (وضع العرض)');
            setIsExecutionModalOpen(false);
            setArchiveType(null);
            return;
        }
        
        debug.log('📥 [LawyerDashboard] Received Execution File:', newFile);
        const fileWithId = coerceExecutionFile(newFile, Date.now());
        debug.log('✅ [LawyerDashboard] File with ID assigned:', fileWithId);
        setExecutionFiles(prev => [fileWithId, ...prev]);
        
        // CRITICAL FIX: Close modals FIRST before opening new view
        debug.log('🔴 [LawyerDashboard] Closing ExecutionCreationView and ArchivePortal...');
        setIsExecutionModalOpen(false);
        setArchiveType(null);
        
        // CRITICAL: Open ExecutionDashboard immediately after creation
        debug.log('🚀 [LawyerDashboard] Opening ExecutionDashboard with file:', fileWithId);
        setActiveFile(fileWithId);
        
        // Optionally save to cloud if needed
        if (user) {
            // LawyerDB.saveExecutionFile(user.id, fileWithId).catch(debug.error); // Assuming API exists or will exist
        }
    }, [user, isAlternativeMode]);

    // PERFORMANCE FIX: useCallback to prevent re-creating function on every render
    const handleUpdateExecutionFile = useCallback((updatedFile: ExecutionFile) => {
        setExecutionFiles((prev) =>
            prev.map((f) => {
                if (String(f.id) !== String(updatedFile.id)) return f;
                const merged: ExecutionFile = { ...f, ...updatedFile };
                if (
                    f.executionTrashDeletedAt != null &&
                    !Object.prototype.hasOwnProperty.call(updatedFile, 'executionTrashDeletedAt')
                ) {
                    merged.executionTrashDeletedAt = f.executionTrashDeletedAt;
                }
                if (
                    f.debtor_absence_badge_dismissed === true &&
                    !Object.prototype.hasOwnProperty.call(updatedFile, 'debtor_absence_badge_dismissed')
                ) {
                    merged.debtor_absence_badge_dismissed = f.debtor_absence_badge_dismissed;
                }
                if (
                    f.debtor_absence_badge_dismissed_by_debtor != null &&
                    !Object.prototype.hasOwnProperty.call(updatedFile, 'debtor_absence_badge_dismissed_by_debtor')
                ) {
                    merged.debtor_absence_badge_dismissed_by_debtor =
                        f.debtor_absence_badge_dismissed_by_debtor;
                }
                return merged;
            })
        );
        setActiveFile((prev) => (prev && String(prev.id) === String(updatedFile.id) ? ({ ...prev, ...updatedFile } as ExecutionFile) : prev));
        if (user) {
            // LawyerDB.saveExecutionFile(user.id, updatedFile).catch(debug.error);
        }
        syncExecutionFileToCalendar(updatedFile as unknown as Record<string, unknown>, user?.id);
        void refreshAppAlerts();
    }, [user, refreshAppAlerts]);


    // --- SMART FILES PROTOCOL INTEGRATION ---
    const addCase = useCaseStore((s) => s.addCase);
    const selectCase = useCaseStore((s) => s.selectCase);
    const storeCases = useCaseStore((s) => s.cases);
    const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
    /** علم انتقال «تفريق الدعوى» — يفتح شاشة «إضبارة جديدة» مع تخطّي اختيار النوع. */
    const [isCriminalSeveranceRedirect, setIsCriminalSeveranceRedirect] = useState(false);
    const openNormalNewCaseModal = useCallback(() => {
        criminalBridge.prepareNormalCriminalCaseForm();
        setIsCriminalSeveranceRedirect(false);
        setIsNewCaseModalOpen(true);
    }, [criminalBridge]);

    const openSeveranceNewCaseModal = useCallback(() => {
        if (!criminalBridge.resumePendingSeveranceForm()) return;
        setIsCriminalSeveranceRedirect(true);
        setIsNewCaseModalOpen(true);
    }, [criminalBridge]);

    useEffect(() => {
        if (consumeOpenCriminalCasesListRequest()) {
            prefetchCriminalDashboard();
            setLawsuitsDossierSection('criminal');
            setLawsuitsWorkspaceTab('civil');
            setShowLawsuitsWorkspace(true);
        }
    }, []);

    useEffect(() => {
        if (showLawsuitsWorkspace) {
            prefetchDossierShells();
        }
    }, [showLawsuitsWorkspace]);

    // Sync initial files to store once
    useEffect(() => {
        if (files.length > 0 && storeCases.length === 0) {
            files.forEach(f => {
                const clientName = f.parties?.find((p: Party) => p.isClient)?.name || 'Unknown';
                const opponentName = f.parties?.find((p: Party) => !p.isClient)?.name || 'Unknown';
                const mappedCase: LegalCase = {
                    id: f.id.toString(),
                    caseNo: f.caseNo,
                    title: f.docType || f.caseNo,
                    type: f.type,
                    court: f.court,
                    clientName,
                    opponentName,
                    linkedDocuments: [],
                    deadlines: [],
                    timeline: [],
                    createdAt: f.date,
                    updatedAt: f.date,
                    status: mapFileStatusToCaseStatus(f.status)
                };
                addCase(mappedCase);
            });
        }
    }, []); // Run once on mount

    const handleNewCaseSuccess = () => {
        // Store is already updated by the modal.
        // We need to sync local files state if we want the list to update immediately 
        // without fetching from store (since we didn't refactor list fully).
        const latestCase = useCaseStore.getState().cases[0];
        if (!latestCase) return;

        const newFile: FileData = {
            id: isNaN(Number(latestCase.id)) ? Date.now() : Number(latestCase.id),
            type: latestCase.type,
            status: 'active',
            caseNo: latestCase.caseNo,
            caseNoParts: { year: '2026', type: 'new', seq: '001' },
            court: latestCase.court ?? '',
            docType: latestCase.title,
            date: new Date().toISOString(),
            parties: [
                { id: 1, name: latestCase.clientName, role: 'المدعي', isClient: true },
                { id: 2, name: latestCase.opponentName, role: 'المدعى عليه', isClient: false }
            ],
            history: [],
            notes: [],
            images: []
        };
        setFiles(prev => [newFile, ...prev]);
    };

    // --- LEGAL COMMAND CENTER HANDLERS ---
    const handleAddNote = useCallback((note: Note) => {
        setGlobalNotes((prev) => [{
            id: note.id,
            title: 'ملاحظة سريعة', 
            body: note.content,
            date: new Date().toISOString(),
            isPinned: false,
            color: '#1A1E2E'
        }, ...prev]);
        SmartToast.success('تمت إضافة الملاحظة للمفكرة');
    }, []);

    // --- NOTEPAD HANDLERS ---
    const handleSaveNote = async (note: GlobalNote) => {
        const uid = resolveNotesUserId();
        const exists = globalNotes.some((n) => n.id === note.id);

        setGlobalNotes((prev) => {
            const found = prev.find((n) => n.id === note.id);
            if (found) return prev.map((n) => (n.id === note.id ? note : n));
            return [...prev, note];
        });

        if (uid && (note.body || '').trim()) {
            const mappedId = vaultIdForGlobal(uid, note.id);
            const vaultId = notesVault.syncFromGlobal(
                uid,
                { id: note.id, body: note.body, type: note.type },
                !exists,
                mappedId,
            );
            if (vaultId) linkGlobalToVault(uid, note.id, vaultId);
        }
        
        // ✅ Backend Integration: Save to Supabase Cloud
        if (user && !isAlternativeMode) {
            try {
                await SupabaseService.saveGlobalNote(
                    dashboardNoteToCloudPayload(note),
                    exists ? { id: String(note.id) } : undefined,
                );
                debug.log('[LawyerDashboard] ✅ Note saved to cloud');
            } catch (error) {
                debug.error('[LawyerDashboard] ⚠️ Cloud note save failed:', error);
            }
        }

        void refreshAppAlerts();

        if (note.apptDate || note.reminder_at) {
            SmartToast.success('تم ربط الموعد بالتقويم');
        }

        // COPY TO LINKED FILE LOGIC
        if (note.linkedFileId) {
            setFiles(prevFiles => prevFiles.map(f => {
                if (f.id === note.linkedFileId) {
                    const newFileNote = {
                        id: Date.now() + Math.random(), 
                        text: note.body, 
                        meta: note.title, 
                        stageCtx: f.currentStage || 'عام',
                        date: new Date().toLocaleDateString('ar-EG'),
                        apptDate: note.apptDate || note.reminder_at,
                        isPinned: note.isPinned
                    };
                    return { ...f, notes: [newFileNote, ...f.notes] };
                }
                return f;
            }));
        }
    };

    const handleDeleteNote = async (id: string) => {
        const uid = resolveNotesUserId();
        if (uid) {
            const vaultId = vaultIdForGlobal(uid, id);
            if (vaultId) notesVault.deleteNote(vaultId);
            unlinkGlobal(uid, id);
        }
        setGlobalNotes((prev) => prev.filter((n) => String(n.id) !== id));
        unpinWorkspaceItem(id, 'notepad');

        // ✅ Backend Integration: Delete from Supabase Cloud
        if (user && !isAlternativeMode) {
            try {
                await SupabaseService.deleteGlobalNote(String(id));
                debug.log('[LawyerDashboard] ✅ Note deleted from cloud');
            } catch (error) {
                debug.error('[LawyerDashboard] ⚠️ Cloud note delete failed:', error);
            }
        }
        void refreshAppAlerts();
    };

    const handleConvertNote = (note: Pick<GlobalNote, 'body'>, targetType: CaseType) => {
        setIsNotepadOpen(false);
        // Pre-fill wizard data
        setWizardInitialData({
            type: targetType,
            notes: [{ id: Date.now(), text: note.body, date: new Date().toISOString() }], // Correct Note Structure
        });
        setIsWizardOpen(true);
    };

    const handleNotepadConvert = (note: { text: string }) => {
        handleConvertNote({ body: note.text }, 'lawsuit');
    };

    // Helper for Inline Edit Fields - Defined Outside or Memoized
    
    const handleCreateWork = async (newFile: FileData) => {
        // Always create a new independent file (Sub-Entry), preserving the old one
        const created: FileData & { parentId?: number } = { 
            ...newFile, 
            id: Date.now(),
            // Link to parent if it's a sub-stage (Technical Link)
            parentId: subFileBase ? subFileBase.id : undefined,
            // Ensure fresh start for history and notes unless we want to copy them (User said "Smart Clone" of static data only)
            notes: [],
            history: [],
            images: []
        };
        
        // ✅ Backend Integration: Save to Supabase Cloud
        if (user && !isAlternativeMode) {
            try {
                await SupabaseService.saveLawsuitFile({
                    id: String(created.id),
                    caseNo: created.caseNo,
                    court: created.court,
                    stage: coerceLawsuitStage(created.currentStage),
                    caseType: created.docType,
                    parentId: created.parentId ? String(created.parentId) : null,
                    parties: (created.parties || []).map((p) => ({ ...p } as Record<string, unknown>))
                });
                debug.log('[LawyerDashboard] ✅ Lawsuit saved to cloud');
            } catch (error) {
                debug.error('[LawyerDashboard] ⚠️ Cloud lawsuit save failed:', error);
            }
        }
        
        // CLOUD SYNC (Legacy - keeping for compatibility)
        if (user) {
            LawyerDB.saveCase(user.id, created as unknown as Record<string, unknown>).catch(debug.error);
        }

        setFiles((prev) => [created as FileData, ...prev]);
        setActiveFile(created as unknown as FileData); // IMMEDIATE TRANSITION TO NEW FILE VIEW
        setSubFileBase(null);
    };

    const handleUpdateFile = (updatedFile: FileData) => {
        const updatedId = String((updatedFile as FileData & { id?: unknown }).id ?? '');
        const mergeFile = (prev: FileData): FileData => ({ ...prev, ...updatedFile, id: prev.id });

        // 🔑 Audit log: نلتقط الـ before قبل الـ setFiles لمقارنة التغييرات ذات القيمة
        const before = files.find((f) => String(f.id) === updatedId);

        setFiles((prev) =>
            prev.map((f) => (String(f.id) === updatedId ? mergeFile(f) : f)),
        );
        setActiveFile((prev) => {
            if (prev && String(prev.id) === updatedId) {
                return mergeFile(prev as FileData);
            }
            return updatedFile;
        });
        
        // ✅ CRITICAL FIX: Save to Cloud when updating file
        if (user) {
            LawyerDB.saveCase(user.id, updatedFile as unknown as Record<string, unknown>).catch(debug.error);
        }
        syncLawsuitFileToCalendar(updatedFile as unknown as Record<string, unknown>, user?.id);

        // 🔑 Audit log: تسجيل تغييرات ذات قيمة فقط (status / المراحل / المواعيد / المهام)
        if (before) {
            try {
                void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                    const caseNo = updatedFile.caseNo || `#${updatedFile.id}`;
                    // 1. تغيير الحالة (active / paused / finished / deleted)
                    if (before.status && updatedFile.status && before.status !== updatedFile.status) {
                        if (updatedFile.status !== 'deleted') {
                            AuditLog.civil.statusChanged({
                                caseId: updatedFile.id,
                                caseNo,
                                fromStatus: String(before.status),
                                toStatus: String(updatedFile.status),
                            });
                        }
                    }
                    // 2. إضافة مرحلة جديدة (stages.length زاد)
                    const beforeStages = Array.isArray((before as { stages?: unknown[] }).stages)
                        ? ((before as { stages: unknown[] }).stages).length
                        : 0;
                    const afterStages = Array.isArray((updatedFile as { stages?: unknown[] }).stages)
                        ? ((updatedFile as { stages: unknown[] }).stages).length
                        : 0;
                    if (afterStages > beforeStages) {
                        const lastStage = (updatedFile as { stages?: Array<{ stageName?: string }> })
                            .stages?.[afterStages - 1];
                        AuditLog.civil.stageAdded({
                            caseId: updatedFile.id,
                            caseNo,
                            stageName: lastStage?.stageName || 'مرحلة جديدة',
                        });
                    }
                    // 3. إضافة موعد/جلسة (timeline event داخل أي stage) — نحسب الإجمالي
                    const countTimeline = (file: FileData): number => {
                        const stages = (file as { stages?: Array<{ timeline?: unknown[] }> }).stages ?? [];
                        let n = 0;
                        for (const s of stages) {
                            if (Array.isArray(s?.timeline)) n += s.timeline.length;
                        }
                        return n;
                    };
                    const beforeTimeline = countTimeline(before);
                    const afterTimeline = countTimeline(updatedFile);
                    if (afterTimeline > beforeTimeline) {
                        const stages = (updatedFile as { stages?: Array<{ timeline?: Array<{ id?: string; date?: string; title?: string; type?: string }> }> }).stages ?? [];
                        // ابحث عن الـ id الجديد (موجود في after وليس في before)
                        const beforeIds = new Set<string>();
                        const beforeStagesArr = (before as { stages?: Array<{ timeline?: Array<{ id?: string }> }> }).stages ?? [];
                        for (const s of beforeStagesArr) {
                            for (const t of s?.timeline ?? []) {
                                if (t?.id) beforeIds.add(String(t.id));
                            }
                        }
                        for (const s of stages) {
                            for (const ev of s?.timeline ?? []) {
                                if (!ev?.id || beforeIds.has(String(ev.id))) continue;
                                if (ev.date) {
                                    AuditLog.civil.hearingAdded({
                                        caseId: updatedFile.id,
                                        caseNo,
                                        date: ev.date,
                                        title: ev.title,
                                    });
                                }
                            }
                        }
                    }

                    // 4. إضافة/إكمال مهمة في القضية المدنية
                    type TaskShape = { id?: string; title?: string; dueDate?: string; isCompleted?: boolean };
                    const collectTasks = (file: FileData): TaskShape[] => {
                        const stages = (file as { stages?: Array<{ tasks?: TaskShape[] }> }).stages ?? [];
                        const out: TaskShape[] = [];
                        for (const s of stages) {
                            if (Array.isArray(s?.tasks)) out.push(...s.tasks);
                        }
                        return out;
                    };
                    const beforeTasks = collectTasks(before);
                    const afterTasks = collectTasks(updatedFile);
                    const beforeMap = new Map(beforeTasks.map((t) => [String(t.id ?? ''), t] as const));
                    // مهام مكتملة الآن لم تكن قبلاً
                    for (const t of afterTasks) {
                        const prev = beforeMap.get(String(t.id ?? ''));
                        if (prev && !prev.isCompleted && t.isCompleted && t.title) {
                            AuditLog.civil.taskCompleted({
                                caseId: updatedFile.id,
                                caseNo,
                                title: t.title,
                            });
                        } else if (!prev && t.title) {
                            AuditLog.civil.taskAdded({
                                caseId: updatedFile.id,
                                caseNo,
                                title: t.title,
                                dueDate: t.dueDate,
                            });
                        }
                    }
                });
            } catch { /* silent */ }
        }

        void refreshAppAlerts();
    };

    // PERFORMANCE FIX: useCallback with functional update - stable deps
    // PERFORMANCE FIX: useCallback with functional update - stable deps
    const handleDeleteFile = useCallback(
        (fileToDelete: FileData) => {
            const isHardDelete = fileToDelete.status === 'deleted';
            if (isHardDelete) {
                void removeAllBridgedEventsForEntity('lawsuit', fileToDelete.id, user?.id);
                setFiles((prev) => {
                    const next = prev.filter((f) => f.id !== fileToDelete.id);
                    saveLawsuitFilesRaw(next as unknown[]);
                    return next;
                });
            } else {
                const updated: FileData = { ...fileToDelete, status: 'deleted', deletedAt: Date.now() };
                setFiles((prev) => prev.map((f) => (f.id === fileToDelete.id ? updated : f)));
                void removeAllBridgedEventsForEntity('lawsuit', fileToDelete.id, user?.id);
            }
            // 🔑 Audit log: تسجيل في سجل النشاطات (للـ soft delete و hard delete على حدٍّ سواء)
            try {
                void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                    AuditLog.civil.archived({
                        caseId: fileToDelete.id,
                        caseNo: fileToDelete.caseNo || `#${fileToDelete.id}`,
                    });
                });
            } catch { /* silent */ }
            unpinWorkspaceForDeletedFile(fileToDelete);
            void refreshAppAlerts();
        },
        [user?.id, refreshAppAlerts],
    );
    
    const handleRestoreFile = (fileToRestore: FileData) => {
        const updated: FileData = { ...fileToRestore, status: 'active', deletedAt: undefined };
        setFiles((prev) => prev.map((f) => f.id === fileToRestore.id ? updated : f));
        setActiveFile(updated);
        // 🔑 Audit log: استعادة من السلة = تغيير حالة
        try {
            void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                AuditLog.civil.statusChanged({
                    caseId: fileToRestore.id,
                    caseNo: fileToRestore.caseNo || `#${fileToRestore.id}`,
                    fromStatus: 'محذوف',
                    toStatus: 'نشط',
                });
            });
        } catch { /* silent */ }
        void refreshAppAlerts();
    };

    const initiateSubFile = (parentFile: FileData) => {
        setSubFileBase(parentFile);
        setIsWizardOpen(true);
    };

    const homeSectionOrder = settings.workflow.homeSectionOrder;

    const pendingFieldTasksCount = useMemo(
        () => countPendingFieldTasks(quantumPendingForField),
        [quantumPendingForField],
    );

    // --- SMART RIBBON HANDLER ---
    const handleSmartDeckItemClick = (item: Record<string, unknown>) => {
        const action = typeof item.action === 'string' ? item.action : '';
        const source = item.source;
        if (action === 'open_file' && source) {
            setActiveFile(source as FileData);
        } else if (action === 'open_notepad') {
            setIsNotepadOpen(true);
            setNotepadMode('list'); // Ideally open specific note, but list is fine for MVP
        } else if (source) {
            // Fallback
            setActiveFile(source as FileData);
        }
    };

    // Logic to hide header when any modal/overlay is active or not in Home
    const shouldHideHeader = showSettings || isWizardOpen || isNotepadOpen || (activeTab !== 'home') || activeFile || archiveType || showLawsuitsWorkspace || showUrgentDashboard || showDocs || showNotebook || showUtilities || showSmartLib || showScanner || showContractGenerator;

    // --- AUTH GUARD ---
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0B1021] flex items-center justify-center">
                <div className="text-[#E6C673]/70 text-sm font-bold animate-pulse">جاري التحقق...</div>
            </div>
        );
    }
    if (!user) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-[#0B1021]" />}>
                <LazyLawyerAuth onLoginSuccess={setUser} />
            </Suspense>
        );
    }

    const hexToRgba = (hex: string, alpha: number) => {
        const h = (hex || '').trim();
        const a = Math.min(1, Math.max(0, alpha));
        const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(h);
        if (!m) return `rgba(0,0,0,${a})`;
        const raw = m[1];
        const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
        const r = parseInt(full.slice(0, 2), 16);
        const g = parseInt(full.slice(2, 4), 16);
        const b = parseInt(full.slice(4, 6), 16);
        return `rgba(${r},${g},${b},${a})`;
    };
    const navUnderlayStyle = {
        background: `linear-gradient(to top, ${theme.bg} 0%, ${hexToRgba(theme.bg, 0.94)} 60%, rgba(0,0,0,0) 100%)`,
    } as const;

    const hasWallpaper = !!(settings.appearance.wallpaper || loadPersistedWallpaper());
    const resolvedColorMode = resolveThemeMode(settings.appearance.themeMode);
    const dashboardBg = hasWallpaper
        ? 'transparent'
        : resolvedColorMode === 'light'
          ? '#e8ecf4'
          : theme.bg;

    return (
        <SafeView
            data-hami-lawyer-dashboard=""
            className={`min-h-screen w-full text-right pb-10 relative overflow-x-hidden font-sans transition-colors duration-500`}
            style={{ backgroundColor: dashboardBg, fontSize: `${settings.appearance.fontSize}px` }}
            statusBarColor={hasWallpaper ? theme.bg : dashboardBg}
        >
            {backgroundRuntimeEnabled && user && calendarUserId ? (
                <Suspense fallback={null}>
                    <LazyLawyerDashboardBackgroundServices
                        user={user}
                        isAlternativeMode={isAlternativeMode}
                        syncNotesOn={syncNotesOn}
                        syncFilesOn={syncFilesOn}
                        syncExecutionOn={syncExecutionOn}
                        pushAllowed={pushAllowed}
                        smartAlertsEnabled={settings.workflow.smartAlerts}
                        files={files}
                        executionFiles={executionFiles}
                        criminalCases={criminalCasesForCluster}
                        globalNotes={globalNotes}
                        fieldTasks={quantumPendingForField}
                        lawyerId={calendarUserId}
                        onAlerts={handleAlertsFromBackground}
                        onNotesSynced={(merged) => mergeNotesStores(merged)}
                        onLawsuitFilesSynced={(merged) => setFiles(merged)}
                        mergeNotesStores={mergeNotesStores}
                        syncExecutionFilesNowRef={syncExecutionFilesNowRef}
                        syncLawsuitFilesNowRef={syncLawsuitFilesNowRef}
                        syncNotesNowRef={syncNotesNowRef}
                        refreshAppAlertsRef={refreshAppAlertsRef}
                    />
                </Suspense>
            ) : null}
            {appLocked && (
                <AppLockOverlay
                    requiresBiometric={requiresBiometricToUnlock}
                    unlocking={appUnlocking}
                    onUnlockBiometric={unlockWithBiometric}
                    onUnlockContinue={unlockContinue}
                    onLogout={onLogout}
                />
            )}

            {/* ✅ NO ENCRYPTION - Migration indicator removed */}
            
            {notificationPanelMounted && (
                <Suspense fallback={null}>
                    {/*
                     * NotificationPanel = Audit Log (events of past).
                     * مستقل تماماً عن SecretaryAlerts (تلك مسؤولية LawyerHomeHubCard).
                     */}
                    <LazyNotificationPanel
                        isOpen={showNotifications}
                        onClose={() => setShowNotifications(false)}
                        userId={user?.id || 'demo_user'}
                        onNavigate={handleNotificationRouting}
                    />
                </Suspense>
            )}

            <Header
                shouldShow={!shouldHideHeader && activeTab === 'home' && !isCriminalDossierOpen}
                unreadCount={headerUnreadCount}
                onProfileClick={() => setActiveTab('profile')}
                onSearchClick={() => openGlobalSearch()}
                onNotificationsClick={() => setShowNotifications(true)}
                onSettingsClick={() => setShowSettings(true)}
            />

            {/* شريط التفريق المعلّق يُعرض داخل لوحة الإضبارة الأم فقط — لا على الواجهة الرئيسية. */}

            {/* INDEXED STACK BODY */}
            <div className={isCriminalDossierOpen ? 'hidden' : 'flex-1 relative min-h-screen'}>
                
                {/* 1. HOME TAB */}
                <div className={activeTab === 'home' ? 'flex flex-col h-[100dvh] pt-[110px] pb-[80px]' : 'hidden'}>
                    <div className="flex-1 flex flex-col px-6 w-full gap-6">
                        {homeSectionOrder.includes('alerts') ? (
                            <Suspense fallback={null}>
                                <LazyLawyerHomeHubCard
                                    lawyerId={calendarUserId}
                                    secretaryAlerts={visibleAppAlerts}
                                    alertsLoading={appAlertsLoading}
                                    alertsError={appAlertsError}
                                    clusterInput={homeHubClusterInput}
                                    onNavigateRoute={navigateWorkspaceRoute}
                                    onOpenEntity={openSecretaryAlert}
                                    onDismissAlert={dismissAppAlert}
                                    onResolved={handleAlertResolved}
                                    onAcceptedConvertToCase={(a) => {
                                        const req = a.request;
                                        if (!req) return;
                                        const clientName = a.clientName ?? 'موكل';
                                        setWizardInitialData({
                                            mainCategory: 'lawsuit',
                                            details: { type: req.title || 'طلب قانوني', court: 'بداءة الكرخ' },
                                            parties1: [{ id: Date.now(), name: clientName, status: 'المدعي', type: 'person' }],
                                            parties2: [],
                                            notes: [{ text: req.ai_metadata?.summary ?? req.smart_summary ?? 'طلب قانوني جديد' }],
                                        });
                                        setArchiveType('client_requests');
                                        openNormalNewCaseModal();
                                    }}
                                />
                            </Suspense>
                        ) : null}

                        <button
                            type="button"
                            onClick={() => setActiveTab('community')}
                            className="w-full rounded-2xl border border-[#DAA520]/20 bg-[#0D0D1A]/60 backdrop-blur-xl px-4 py-4 flex items-center justify-between hover:bg-[#0D0D1A]/75 transition-colors"
                        >
                            <div className="flex flex-col items-start text-right">
                                <div className="text-white font-bold text-sm">المنتدى القانوني</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 text-[#FFD700]">
                                <MessageCircle size={20} strokeWidth={1.5} />
                            </div>
                        </button>

                        {homeSectionOrder.filter((item) => item !== 'alerts').map((item, index) => (
                            <div key={item ? `${item}-${index}` : `section-${index}`} className="contents">
                                <div className={`shrink-0 ${item === 'notepad' ? '-mt-10' : ''}`}>
                                {item === 'hub' && (
                                    <>
                                        <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                                            <LazyUnifiedCommandHub
                                                theme={theme}
                                                shapeClass={shapeClass}
                                                isEditMode={isEditMode}
                                                onAddClick={openNormalNewCaseModal}
                                                onOpenArchive={(id: string) => {
                                                    if (id === 'notepad') {
                                                        setNotepadMode('list');
                                                        setIsNotepadOpen(true);
                                                    } else if (id === 'transaction') {
                                                        setShowTransactions(true);
                                                    } else if (id === 'lawsuit') {
                                                        setLawsuitsDossierSection('all');
                                                        setLawsuitsWorkspaceTab('civil');
                                                        setShowLawsuitsWorkspace(true);
                                                    } else if (id === 'criminal_cases') {
                                                        prefetchCriminalDashboard();
                                                        setLawsuitsDossierSection('criminal');
                                                        setLawsuitsWorkspaceTab('civil');
                                                        setShowLawsuitsWorkspace(true);
                                                    } else {
                                                        setArchiveType(id as LawyerArchiveOverlay);
                                                    }
                                                }}
                                                onSearch={openGlobalSearch}
                                                onFilter={() => {}}
                                            />
                                        </Suspense>
                                    </>
                                )}
                                {item === 'notepad' && (
                                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                                        <LazyLegalCommandCenterDock
                                            files={files as unknown as Record<string, unknown>[]}
                                            theme={theme as ThemeConfig}
                                            userId={user?.id || ''}
                                            onOpenCalendar={() => setActiveTab('schedule')}
                                            onOpenFieldTasksSheet={() => setFieldTasksSheetOpen(true)}
                                            pendingFieldTasksCount={pendingFieldTasksCount}
                                            onAddNote={(note) => {
                                                const id = Date.now();
                                                void handleSaveNote({
                                                    id,
                                                    title: 'ملاحظة سريعة',
                                                    body: note.content,
                                                    isPinned: false,
                                                    date: new Date().toISOString(),
                                                    type: note.type,
                                                });
                                            }}
                                            clientPhone={activeFile?.parties?.find((p: Party) => p.isClient)?.phone || activeFile?.clientPhone || ''}
                                        />
                                    </Suspense>
                                )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* COMMUNITY TAB */}
                <div className={activeTab === 'community' ? 'block h-[100dvh]' : 'hidden'}>
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyCommunityScreen
                            onBack={() => setActiveTab('home')}
                            initialPostId={communityDeepLink?.postId ?? null}
                            initialOpenComments={communityDeepLink?.openComments ?? false}
                            initialSection={communityDeepLink?.section ?? 'forum'}
                        />
                    </Suspense>
                </div>

                {/* SCHEDULE TAB */}
                <div className={activeTab === 'schedule' ? 'block h-[100dvh]' : 'hidden'}>
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazySmartLegalRadar
                            onBack={() => {
                                setCalendarSearchFocus(null);
                                setActiveTab('home');
                            }}
                            userId={resolveCalendarUserId(user?.id ?? authUser?.id ?? null)}
                            initialDate={calendarSearchFocus?.date}
                            initialEventId={calendarSearchFocus?.eventId}
                            onOpenSource={(sourceModule, sourceEntityId) => {
                                switch (sourceModule) {
                                    case 'lawsuit': {
                                        const f = files.find((file) => String(file.id) === sourceEntityId);
                                        if (f && isFileData(f)) {
                                            setActiveFile(f);
                                            setActiveTab('home');
                                            return;
                                        }
                                        SmartToast.info('الإضبارة غير متاحة');
                                        return;
                                    }
                                    case 'execution': {
                                        const ex = executionFiles.find((file) => String(file.id ?? '') === sourceEntityId);
                                        if (ex) {
                                            setActiveFile(coerceExecutionFilePreserveId(ex));
                                            setActiveTab('home');
                                            return;
                                        }
                                        SmartToast.info('إضبارة التنفيذ غير متاحة');
                                        return;
                                    }
                                    case 'criminal':
                                        openCriminalCase(sourceEntityId);
                                        return;
                                    case 'urgent':
                                        setUrgentFocusCaseId(sourceEntityId);
                                        setShowUrgentDashboard(true);
                                        return;
                                    case 'transaction': {
                                        const f = files.find((file) => String(file.id) === sourceEntityId);
                                        if (f && isFileData(f)) {
                                            setActiveFile(f);
                                            return;
                                        }
                                        setTransactionsFocusId(sourceEntityId);
                                        setShowTransactions(true);
                                        return;
                                    }
                                    case 'threading':
                                        setTransactionsFocusId(sourceEntityId);
                                        setShowTransactions(true);
                                        return;
                                    case 'note':
                                        setNotepadMode('list');
                                        setNotepadFocusNoteId(sourceEntityId);
                                        setIsNotepadOpen(true);
                                        return;
                                    case 'task':
                                        setActiveTab('home');
                                        setFieldTasksSheetOpen(true);
                                        return;
                                    default:
                                        SmartToast.info('المصدر غير معروف');
                                }
                            }}
                        />
                    </Suspense>
                </div>

                {/* 4. PROFILE TAB */}
                <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
                    <div className="h-full">
                        <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                            <LazyRoyalLawyerProfile isScreenMode onBack={() => setActiveTab('home')} />
                        </Suspense>
                    </div>
                </div>

            </div>

            <FieldTasksBottomSheet
                open={fieldTasksSheetOpen}
                onClose={() => setFieldTasksSheetOpen(false)}
                onManageAll={() => setShowTasksManager(true)}
                lawsuitFiles={files}
                executionFiles={executionFiles}
            />

            {/* --- SMART CRIMINAL LIBRARY MODAL --- */}
            <AnimatePresence>
                {showSmartLib && (
                    <Suspense key="smart-lib" fallback={LAWYER_LAZY_FALLBACK}>
                        <LazySmartCriminalLibrary onClose={() => setShowSmartLib(false)} />
                    </Suspense>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showTasksManager && (
                    <Suspense key="tasks-manager" fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyTasksManager
                            onClose={() => {
                                setTasksManagerFocusTaskId(undefined);
                                setShowTasksManager(false);
                            }}
                            focusTaskId={tasksManagerFocusTaskId}
                            lawsuitFiles={files}
                            executionFiles={executionFiles}
                        />
                    </Suspense>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showControlMenu && (
                    <ControlMenu
                        key="control-menu"
                        onClose={() => setShowControlMenu(false)}
                        onLogout={onLogout}
                        onOpenSettings={() => { setShowControlMenu(false); setShowSettings(true); }}
                        onOpenProfile={() => { setShowControlMenu(false); setActiveTab('profile'); }}
                        onSwitchRole={(role: string) => debug.log("Switching to", role)}
                    />
                )}
                {showSettings && (
                    <Suspense key="hami-settings" fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyHamiSettings
                            onClose={() => setShowSettings(false)}
                            onLogout={onLogout}
                            onOpenProfile={() => { setShowSettings(false); setActiveTab('profile'); }}
                            onOpenArchive={() => { setShowSettings(false); setArchiveType('all'); }}
                            onOpenPrivacy={() => {
                                setShowSettings(false);
                                onAppNavigate?.('privacy');
                            }}
                            onOpenSupport={() => {
                                setShowSettings(false);
                                onAppNavigate?.('support');
                            }}
                        />
                    </Suspense>
                )}
                {isWizardOpen && (
                    <motion.div key="creation-wizard" className="fixed inset-0 z-[100] flex items-center justify-center">
                        Wizard Placeholder (Please implement CreationWizard extraction if needed)
                    </motion.div>
                )}

                {isNotepadOpen && (
                    <Suspense key="notepad" fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyNotepadModal
                            isOpen={isNotepadOpen}
                        onClose={() => {
                            setNotepadFocusNoteId(undefined);
                            setIsNotepadOpen(false);
                        }}
                        startMode={notepadMode}
                        focusNoteId={notepadFocusNoteId}
                        notes={globalNotes}
                        onSave={handleSaveNote}
                        onDelete={handleDeleteNote}
                        onConvert={handleNotepadConvert}
                        files={files}
                        theme={theme}
                        shapeClass={shapeClass}
                        />
                    </Suspense>
                )}
            </AnimatePresence>
            
            {showUrgentDashboard && (
                <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                    <motion.div className="fixed inset-0 z-[85] bg-[#05060D]">
                        <LazyViewUrgentAndOrdersDashboard
                            focusCaseId={urgentFocusCaseId}
                            onBack={() => {
                                setShowUrgentDashboard(false);
                                setUrgentFocusCaseId(undefined);
                                void refreshAppAlerts();
                            }}
                        />
                    </motion.div>
                </Suspense>
            )}

            {activeFile && (
                <Suspense
                    fallback={DOSSIER_OPENING_FALLBACK}
                >
                    {activeFile.type === 'execution' ? (
                        <LazyExecutionDashboard
                            key={`exec-${activeFile.id}`}
                            file={activeFile}
                            onClose={() => setActiveFile(null)}
                            onUpdate={handleUpdateExecutionFile}
                        />
                    ) : (
                        <LazySmartFileModal
                            file={activeFile}
                            onClose={() => setActiveFile(null)}
                            onUpdate={handleUpdateFile}
                            onDelete={() => handleDeleteFile(activeFile)}
                            theme={theme}
                            shapeClass={shapeClass}
                            onAddStage={initiateSubFile}
                            onAddAlert={() => void refreshAppAlerts()}
                        />
                    )}
                </Suspense>
            )}
            {archiveType === 'client_requests' ? (
                <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                    <LazyClientRequestsHub
                        onClose={() => setArchiveType(null)}
                        onConvertToCase={(data: ClientRequest) => {
                            setWizardInitialData({
                                mainCategory: 'lawsuit', // Default to lawsuit
                                details: {
                                    type: data.type,
                                    court: 'بداءة الكرخ', // Default mock
                                },
                                parties1: [{ id: Date.now(), name: data.clientName, status: 'المدعي', type: 'person' }],
                                parties2: [],
                                notes: [{ text: data.description }]
                            });
                            setArchiveType(null);
                            openNormalNewCaseModal();
                        }}
                    />
                </Suspense>
            ) : (
                archiveType && (
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyArchivePortal
                            type={lawyerOverlayToArchivePortalType(archiveType)}
                            files={
                                archiveType === 'execution'
                                    ? executionFiles
                                    : archiveType === 'deleted'
                                      ? files.filter(f => f.status === 'deleted')
                                      : files.filter(f => f.status !== 'deleted')
                            }
                            theme={theme as ThemeConfig}
                            shapeClass={shapeClass}
                            onClose={() => setArchiveType(null)}
                            onFileClick={(f: unknown) => {
                                if (isRecord(f) && f.type === 'execution') {
                                    const exec = coerceExecutionFilePreserveId(f);
                                    setActiveFile(exec);
                                    setArchiveType(null);
                                    void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                                        const fr = f as Record<string, unknown>;
                                        AuditLog.dossier.opened({
                                            module: 'execution',
                                            entityId: String(exec.id ?? ''),
                                            caseNo: typeof fr.caseNo === 'string' ? fr.caseNo : typeof fr.caseNumber === 'string' ? fr.caseNumber : undefined,
                                            clientName: typeof fr.clientName === 'string' ? fr.clientName : undefined,
                                        });
                                    }).catch(() => {});
                                    return;
                                }
                                if (!isFileData(f)) return;
                                if (archiveType === 'deleted') {
                                    handleRestoreFile(f);
                                } else {
                                    selectCase(f.id.toString());
                                    setActiveFile(f);
                                    setArchiveType(null);
                                    void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                                        const fr = f as Record<string, unknown> & { type?: string };
                                        const fileType = fr.type;
                                        if (fileType === 'transaction') {
                                            AuditLog.dossier.opened({
                                                module: 'threading',
                                                entityId: String(f.id),
                                                caseNo: typeof fr.caseNo === 'string' ? fr.caseNo : undefined,
                                                clientName: typeof fr.clientName === 'string' ? fr.clientName : undefined,
                                            });
                                            return;
                                        }
                                        void import('@/app/domain/lawsuit/lawsuitJurisdiction').then(({ resolveLawsuitJurisdiction }) => {
                                            const j = resolveLawsuitJurisdiction(fr);
                                            const module = j === 'personal' ? 'personal' : j === 'criminal' ? 'criminal' : 'civil';
                                            AuditLog.dossier.opened({
                                                module: module as 'civil' | 'personal' | 'criminal',
                                                entityId: String(f.id),
                                                caseNo: typeof fr.caseNo === 'string' ? fr.caseNo : undefined,
                                                clientName: typeof fr.clientName === 'string' ? fr.clientName : undefined,
                                            });
                                        }).catch(() => {});
                                    }).catch(() => {});
                                }
                            }}
                            onAddAction={() => {
                                debug.log('🔵 [LawyerDashboard] onAddAction clicked! archiveType:', archiveType);
                                if (archiveType === 'execution') {
                                    debug.log('🟢 [LawyerDashboard] Opening Execution Modal...');
                                    setIsExecutionModalOpen(true);
                                    debug.log('🟢 [LawyerDashboard] isExecutionModalOpen set to TRUE');
                                    // DON'T close ArchivePortal yet - keep it open in background
                                    // It will close when ExecutionCreationView closes
                                } else {
                                    debug.log('🟡 [LawyerDashboard] Opening other case type:', archiveType);
                                    if (archiveType === 'lawsuit' || archiveType === 'transaction') {
                                        setWizardInitialData({ type: archiveType });
                                    } else {
                                        setWizardInitialData({ type: 'lawsuit' });
                                    }
                                    // 🪪 LazyLawyerNewCase نفسه يعرض شاشة اختيار النوع (مدني/شخصي/جزائي)
                                    // فلا حاجة لاستهداف الجزائي بشكل مختلف من هنا — المستخدم يختار النوع من الـ wizard.
                                    openNormalNewCaseModal();
                                    setArchiveType(null);
                                }
                            }}
                            lawsuitFilesForCluster={
                                archiveType === 'execution'
                                    ? files.filter((f) => f.status !== 'deleted')
                                    : undefined
                            }
                            onMoveExecutionToTrash={archiveType === 'execution' ? moveExecutionToTrash : undefined}
                            onRestoreExecutionFromTrash={archiveType === 'execution' ? restoreExecutionFromTrash : undefined}
                            onPermanentlyDeleteExecutions={archiveType === 'execution' ? permanentlyDeleteExecutions : undefined}
                        />
                    </Suspense>
                )
            )}

            <AnimatePresence>
                {showTransactions && (
                    <Suspense key="transactions" fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyTransactionsSystem
                            onBack={() => {
                                setTransactionsFocusId(undefined);
                                setShowTransactions(false);
                            }}
                            userId={user?.id || 'dev-user-uuid-1'}
                            initialTransactionId={transactionsFocusId}
                            key={transactionsFocusId ?? 'threading-list'}
                        />
                    </Suspense>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showLawsuitsWorkspace && (
                    <Suspense key="lawsuits-workspace" fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyLawsuitsWorkspace
                            files={files as FileData[]}
                            criminalCases={criminalCasesForCluster}
                            theme={theme as ThemeConfig}
                            shapeClass={shapeClass}
                            defaultTab={lawsuitsWorkspaceTab}
                            initialDossierSection={lawsuitsDossierSection}
                            onClose={() => setShowLawsuitsWorkspace(false)}
                            onOpenCriminalCase={(id: string) => {
                                openCriminalCase(id, { fromLawsuitsWorkspace: true });
                                void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                                    AuditLog.dossier.opened({ module: 'criminal', entityId: id });
                                }).catch(() => {});
                            }}
                            onDeleteCriminalCase={(id: string) => criminalBridge.deleteCriminalCase(id)}
                            onOpenFile={(f: unknown) => {
                                if (isRecord(f) && f.type === 'execution') {
                                    void import('@/app/components/lawyer/ExecutionDashboard');
                                    const exec = coerceExecutionFilePreserveId(f);
                                    setActiveFile(exec);
                                    setShowLawsuitsWorkspace(false);
                                    void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                                        const fr = f as Record<string, unknown>;
                                        AuditLog.dossier.opened({
                                            module: 'execution',
                                            entityId: String(exec.id ?? ''),
                                            caseNo: typeof fr.caseNo === 'string' ? fr.caseNo : undefined,
                                            clientName: typeof fr.clientName === 'string' ? fr.clientName : undefined,
                                        });
                                    }).catch(() => {});
                                    return;
                                }
                                if (!isFileData(f)) return;
                                prefetchSmartFileModal();
                                selectCase(f.id.toString());
                                setActiveFile(f);
                                setShowLawsuitsWorkspace(false);
                                void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                                    const fr = f as Record<string, unknown> & { type?: string };
                                    if (fr.type === 'transaction') {
                                        AuditLog.dossier.opened({
                                            module: 'threading',
                                            entityId: String(f.id),
                                            caseNo: typeof fr.caseNo === 'string' ? fr.caseNo : undefined,
                                            clientName: typeof fr.clientName === 'string' ? fr.clientName : undefined,
                                        });
                                        return;
                                    }
                                    void import('@/app/domain/lawsuit/lawsuitJurisdiction').then(({ resolveLawsuitJurisdiction }) => {
                                        const j = resolveLawsuitJurisdiction(fr);
                                        const module = j === 'personal' ? 'personal' : j === 'criminal' ? 'criminal' : 'civil';
                                        AuditLog.dossier.opened({
                                            module: module as 'civil' | 'personal' | 'criminal',
                                            entityId: String(f.id),
                                            caseNo: typeof fr.caseNo === 'string' ? fr.caseNo : undefined,
                                            clientName: typeof fr.clientName === 'string' ? fr.clientName : undefined,
                                        });
                                    }).catch(() => {});
                                }).catch(() => {});
                            }}
                            onAddNewCase={() => {
                                setWizardInitialData({ type: 'lawsuit' });
                                openNormalNewCaseModal();
                            }}
                            onMoveLawsuitToTrash={moveLawsuitToTrash}
                            onRestoreLawsuitFromTrash={restoreLawsuitFromTrash}
                            onArchiveLawsuit={archiveLawsuit}
                            onRestoreArchivedLawsuit={restoreArchivedLawsuit}
                            onPermanentlyDeleteLawsuits={permanentlyDeleteLawsuits}
                        />
                    </Suspense>
                )}
            </AnimatePresence>

            {/* NEW LUXURY BOTTOM NAVIGATION BAR */}
            {/* Portal Modals - No AnimatePresence Wrapper to avoid freeze */}{/* Fixed: Moved out of shouldHideHeader check so they can appear over everything */}
                 <>
                    {showDocs && (
                        <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                            <LazySmartVaultModal key="docs" onClose={() => setShowDocs(false)} currentUserId={user?.id || ''} />
                        </Suspense>
                    )}
                    
                    {/* New Action Modals */}
                    {showScanner && (
                        <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                            <LazyScannerModal key="scanner" onClose={() => setShowScanner(false)} userId={user?.id || ''} />
                        </Suspense>
                    )}
                    {showContractGenerator && (
                        <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                            <LazySmartContractGenerator onClose={() => setShowContractGenerator(false)} />
                        </Suspense>
                    )}
                 </>
                 


            <AddClientModal
                isOpen={showAddClientModal}
                onClose={() => setShowAddClientModal(false)}
                clientName={newClientName}
                clientPhone={newClientPhone}
                onNameChange={setNewClientName}
                onPhoneChange={setNewClientPhone}
                onSave={(name, phone) => {
                    SmartToast.success('✅ تم إضافة الموكل (محاكاة)');
                    setNewClientName('');
                    setNewClientPhone('');
                    setShowAddClientModal(false);
                }}
            />
            
            <AnimatePresence>
                {isExecutionModalOpen && (
                    <Suspense key="execution-create" fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyExecutionCreationView
                            isOpen={isExecutionModalOpen}
                            onClose={() => {
                                debug.log('❌ [LawyerDashboard] ExecutionCreationView closed by user (Cancel)');
                                setIsExecutionModalOpen(false);
                                setArchiveType(null);
                            }}
                            onSave={handleAddExecutionFile}
                        />
                    </Suspense>
                )}

                {isNewCaseModalOpen ? (
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyLawyerNewCase
                            key={isCriminalSeveranceRedirect ? 'new-case-modal-severance' : 'new-case-modal'}
                            isOpen={isNewCaseModalOpen}
                            presetSelectedType={isCriminalSeveranceRedirect ? 'criminal' : undefined}
                            criminalSeveranceFormMode={isCriminalSeveranceRedirect}
                            onClose={() => {
                                setIsNewCaseModalOpen(false);
                                setWizardInitialData(null);
                                setIsCriminalSeveranceRedirect(false);
                            }}
                            onOpenCriminalDashboard={(caseId: string) => {
                                openCriminalCase(caseId);
                                setIsCriminalSeveranceRedirect(false);
                            }}
                            onSave={(data: unknown) => {
                                const newFile = buildFileDataFromNewCaseSave(data);
                                if (!newFile) return;

                                setFiles((prev) => [newFile, ...prev]);
                                // 🔑 Audit log: تسجيل إنشاء إضبارة مدنية في سجل النشاطات
                                try {
                                    const clientName = newFile.parties?.find(
                                        (p: Party) => p.isClient,
                                    )?.name;
                                    void import('@/app/services/auditLogPublisher').then(
                                        ({ AuditLog }) => {
                                            AuditLog.civil.caseCreated({
                                                caseId: newFile.id,
                                                caseNo: newFile.caseNo || `#${newFile.id}`,
                                                clientName,
                                            });
                                        },
                                    );
                                } catch { /* silent */ }
                                SmartToast.success('تم إنشاء الملف بنجاح');
                                setIsNewCaseModalOpen(false);
                                setWizardInitialData(null);
                                setActiveFile(newFile);
                            }}
                        />
                    </Suspense>
                ) : null}
            </AnimatePresence>

            {criminalDashboardCaseId ? (
                <Suspense fallback={DOSSIER_OPENING_FALLBACK}>
                    <LazyCriminalDashboard
                        key={criminalDashboardCaseId}
                        id={criminalDashboardCaseId}
                        onClose={closeCriminalCase}
                        onOpenCase={(caseId: string) => {
                            openCriminalCase(caseId, { keepReturnTarget: true });
                            void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                                AuditLog.dossier.opened({ module: 'criminal', entityId: caseId });
                            }).catch(() => {});
                        }}
                        onRequestNewCaseFromSeverance={() => {
                            // احتياطي قديم — التفريق يُكمَل داخل لوحة الإضبارة الأم (نموذج مضمّن).
                            criminalBridge.resumePendingSeveranceForm();
                        }}
                    />
                </Suspense>
            ) : null}
            
            <AnimatePresence>
                {showGlobalSearch && (
                    <Suspense key="global-search" fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyGlobalSearchOverlay
                            files={files}
                            executionFiles={executionFiles}
                            globalNotes={globalNotes}
                            notifications={searchNotifications}
                            userId={user?.id ?? null}
                            initialQuery={globalSearchInitialQuery}
                            indexVersion={searchIndexVersion}
                            onClose={() => {
                                setShowGlobalSearch(false);
                                setGlobalSearchInitialQuery('');
                            }}
                            onNavigate={(nav) => {
                                setShowGlobalSearch(false);
                                setGlobalSearchInitialQuery('');
                                if (nav.type === 'notifications') {
                                    setShowNotifications(true);
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
                                    setActiveTab('community');
                                    setCommunityDeepLink({ section: 'repository' });
                                    return;
                                }
                                if (nav.type === 'community') {
                                    setActiveTab('community');
                                    if (nav.postId) {
                                        setCommunityDeepLink({ postId: nav.postId, openComments: false });
                                    }
                                    return;
                                }
                                if (nav.type === 'profile') {
                                    setActiveTab('profile');
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
                                    setTransactionsFocusId(nav.transactionId);
                                    setShowTransactions(true);
                                    return;
                                }
                                if (nav.type === 'tasks_manager') {
                                    setActiveTab('home');
                                    setTasksManagerFocusTaskId(nav.taskId);
                                    setShowTasksManager(true);
                                    return;
                                }
                                if (nav.type === 'note' || nav.type === 'voice') {
                                    setActiveTab('home');
                                    setNotepadMode(nav.type === 'voice' ? 'voice' : 'list');
                                    setNotepadFocusNoteId(nav.noteId);
                                    setIsNotepadOpen(true);
                                    return;
                                }
                                if (nav.type === 'vault') {
                                    setActiveTab('home');
                                    setShowDocs(true);
                                    return;
                                }
                                setActiveTab('home');
                                if (nav.type === 'file') {
                                    const id = String(nav.fileId);
                                    const target =
                                        files.find((f) => String(f.id) === id) ||
                                        executionFiles.find((f) => String(f.id) === id);
                                    if (target) {
                                        // Deep-link: إن جاء من بحث على stage event/task/incidental،
                                        // نُمرّر activeStageIndex ليُفتح الـ SmartFileModal على المرحلة الصحيحة،
                                        // و __searchFocusEventId ليتم scroll-to إلى الحدث المحدد.
                                        if (
                                            typeof nav.stageIndex === 'number' ||
                                            typeof nav.eventId === 'string'
                                        ) {
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
                            }}
                        />
                    </Suspense>
                )}
            </AnimatePresence>
            
            {/* ✅ Backend Testing Panel (Development Only) */}
            {showTestingPanel && (
                <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                    <LazyBackendTestingPanel onClose={() => setShowTestingPanel(false)} />
                </Suspense>
            )}
            
            {/* ✅ CRITICAL UI FIX: REMOVE DEBUG/LAB ICON - Hidden from production view */}
            {/* Debug panel still accessible via keyboard shortcut if needed */}

        </SafeView>
    );
};

const LawyerDashboardComponent = (props: LawyerDashboardProps) => (
    <LawyerSettingsProvider>
        <LawyerDashboardQuantumShell {...props} />
    </LawyerSettingsProvider>
);

// ✅ Memoize LawyerDashboard to prevent unnecessary re-renders
export const LawyerDashboard = React.memo(LawyerDashboardComponent);
