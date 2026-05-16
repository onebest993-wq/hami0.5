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
import { SafeView } from '@/app/components/shared/SafeView';
import type { Note } from './LegalCommandCenterDock';
import { SmartToast } from '@/app/components/ui/SmartToast';

import { LawyerDB } from '../../services/lawyer-cloud';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '@/app/context/AuthContext';
import { SecretaryOrchestrator, type SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
// Removed: AlternativePrivacyProtocol (deleted in refactoring)
// Removed: LawyerNewCase (unused - integrated into CompleteLawsuitSystem)
import { useCaseStore, type LegalCase } from '@/app/stores/caseStore';
import { useRagStore } from '@/app/stores/ragStore';
import {
    LazyArchivePortal,
    LazyBackendTestingPanel,
    LazyChatRoom,
    LazyClientRequestsHub,
    LazyCommunicationHub,
    LazyCommunityScreen,
    LazyCompleteLawsuitSystem,
    LazyExecutionCreationView,
    LazyExecutionDashboard,
    LazyGlobalSearchOverlay,
    LazyGlobalSearchResults,
    LazyHamiSettings,
    LazyLawyerAuth,
    LazyLeadManagement,
    LazyLegalCommandCenterDock,
    LazyLawsuitsWorkspace,
    LazyMessagesList,
    LazyNeuralAlertsCard,
    LazyNotepadModal,
    LazyNotificationPanel,
    LazyRoyalLawyerProfile,
    LazyScannerModal,
    LazySmartContractGenerator,
    LazySmartCriminalLibrary,
    LazySmartFileModal,
    LazySmartLegalConsultant,
    LazySmartLegalRadar,
    LazySmartVaultModal,
    LazyTransactionsSystem,
    LazyUnifiedCommandHub,
    LazyTasksManager,
} from '@/app/utils/lazyComponents';
import { HamiShieldLogoPlaceholder } from '../../assets/logo-placeholders';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { useAutoSave } from '@/app/hooks/useAutoSave';
import { useAutoSync } from '@/app/hooks/useAutoSync';
// ✅ NEW: Cloud Sync Hook - Backend Integration v1.0
import { useCloudSync } from '@/app/hooks/useCloudSync';
import { SupabaseService } from '@/app/services/SupabaseService';
import { EXECUTION_FILES_STORAGE_KEY, loadExecutionFilesRaw, saveExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
// ✅ NEW: Real-time Updates - Phase 3
import { useRealtime } from '@/app/hooks/useRealtime';
// ✅ NEW: Advanced Features - Phase 4
import { PushNotificationService } from '@/app/services/PushNotificationService';
// CacheService removed — unused (415 lines of dead code)

// --- SHARED & REFACTORED COMPONENTS ---
import { 
    normalizeArabic, HighlightedText, THEMES, SHAPES, useThemeStyles, 
    CaseType, ThemeKey, ShapeKey, FileData, Party, Alert 
} from './LawyerShared';
// SmartAlertCard merged into NeuralAlertsCard
import { UrgentRequestCard } from './UrgentRequestCard';
// 🆕 V10.5: Enhanced Utilities
import { storageCache } from '@/app/utils/storageCache';
import { removeExecutionStorageBundle } from '@/app/utils/executionStorageKeys';
import {
    prefetchLawyerDashboardLazyChunks,
    prefetchLawyerHeavyDeferredChunks,
} from '@/app/utils/screenPrefetch';
import { purgeExpiredExecutionsFromTrash, stripExecutionTrashFields } from '@/app/utils/executionTrash';
import { SystemToasts } from '@/app/utils/toastMessages';
import ControlMenu from './LawyerDashboard/components/ControlMenu';
import DossierOpeningFallbackComponent from './LawyerDashboard/components/DossierOpeningFallback';
import AddClientModal from './LawyerDashboard/components/AddClientModal';
import { Header } from './LawyerDashboard/components/Header';
import { FieldTasksBottomSheet } from './dashboard/FieldTasksBottomSheet';
import { QuantumTasksProvider, useQuantumTasksContext } from '@/app/context/QuantumTasksContext';
import { CAIRO_FONT_STYLE, HEADER_BTN_BG_STYLE, LAWYER_LAZY_FALLBACK } from './LawyerDashboard/constants';
import type { ArchiveType, ClientRequest, SettingsState, ThemeConfig } from '@/app/types/common';

const EXECUTION_FILES_KEY = EXECUTION_FILES_STORAGE_KEY;
const DOSSIER_OPENING_FALLBACK = <DossierOpeningFallbackComponent />;

import { mapFileStatusToCaseStatus, isFileData, isRecord, coerceExecutionFilePreserveId, coerceExecutionFile, coerceLawsuitStage, getNavUnderlayStyle, lawyerOverlayToArchivePortalType } from './LawyerDashboard/utils';
import type { GlobalNote, WizardNoteSeed, WizardInitialData, ExecutionFile } from './LawyerDashboard/types';

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
};

const LawyerDashboardInner = ({ onLogout, onOpenProfile, onNavigateToCase }: LawyerDashboardProps) => {
    // --- AUTH & CLOUD STATE ---
    const [user, setUser] = useState<User | null>(null);
    const { user: authUser } = useAuth();
    const unreadCount = useNotificationStore((s) => s.unreadCount);
    const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
    const notifications = useNotificationStore((s) => s.notifications);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notificationPanelMounted, setNotificationPanelMounted] = useState(false);
    const [secretaryAlerts, setSecretaryAlerts] = useState<SecretaryAlert[]>([]);
    const [showAddClientModal, setShowAddClientModal] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');

    useEffect(() => {
        if (showNotifications) setNotificationPanelMounted(true);
    }, [showNotifications]);

    // Initial Fetch
    useEffect(() => {
        if (user?.id) {
            fetchNotifications(user.id);
        }
    }, [user?.id]);

    // Router Handler (Bridge from Notifications to App)
    const handleNotificationRouting = (path: string, payload: Record<string, unknown> | null) => {
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
            setShowPetitionWizard(true);
        } else if (path === 'scan_document') {
            setShowScanner(true);
        } else if (path === 'vault') {
            setShowDocs(true);
        }
    };
    const [authLoading, setAuthLoading] = useState(true);
    const prefetchOnceRef = useRef(false);
    const advancedServicesOnceRef = useRef(false);

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
                    LawyerDB.checkUpcomingDeadlines(session.user.id).then(due => {
                        if (due && due.length > 0) {
                            SmartToast.warning(`⚠️ تنبيه قضائي: لديك ${due.length} مواعيد تنتهي غداً!`, 8000);
                        }
                    }).catch(debug.error);
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
        if (prefetchOnceRef.current) return;
        prefetchOnceRef.current = true;

        const runPrefetch = () => {
            prefetchLawyerDashboardLazyChunks();
            if (!import.meta.env.DEV) prefetchLawyerHeavyDeferredChunks();
        };

        if (typeof requestIdleCallback !== 'undefined') {
            const id = requestIdleCallback(runPrefetch, { timeout: import.meta.env.DEV ? 12_000 : 2500 });
            return () => cancelIdleCallback(id);
        }

        const t = setTimeout(runPrefetch, import.meta.env.DEV ? 8_000 : 250);
        return () => clearTimeout(t);
    }, [authLoading, user]);

    // New Action Modals State
    const [showPetitionWizard, setShowPetitionWizard] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showContractGenerator, setShowContractGenerator] = useState(false);

    // New Settings State
    const [showControlMenu, setShowControlMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showSmartLib, setShowSmartLib] = useState(false); // NEW STATE FOR SMART LIBRARY
    const [showGlobalSearch, setShowGlobalSearch] = useState(false); // Global Smart Search
    const [showDocs, setShowDocs] = useState(false); // NEW STATE FOR DOCS VAULT
    /** Phase 28 — ستارة المهام الميدانية (بديل الويدجت الأفقي) */
    const [fieldTasksSheetOpen, setFieldTasksSheetOpen] = useState(false);
    const [showTasksManager, setShowTasksManager] = useState(false);
    const [showTestingPanel, setShowTestingPanel] = useState(false); // ✅ Backend Testing Panel
    
    // 🔐 SECURITY: Check Alternative Privacy Mode (must be defined early)
    const [isAlternativeMode, setIsAlternativeMode] = useState(false);
    
    const lawyerSettingsDefaults: SettingsState = {
        themeMode: 'dark',
        theme: 'gold',
        shape: 'pill',
        language: 'ar',
        notifications: true,
        biometric: false,
        glassOpacity: 0.85,
        brandColor: '#E6C673',
        fontSize: 16,
        viewMode: 'list',
        privacyBlur: true,
        watermark: false,
        smartAlerts: true,
        autoSummary: false,
    };

    const [settingsState, setSettingsState] = useState<SettingsState>(() => {
        const raw = persistenceRepository.load<Partial<SettingsState>>('lawyer_settings');
        return { ...lawyerSettingsDefaults, ...raw };
    });
    
    useAutoSave('lawyer_settings', settingsState);

    // Privacy Blur Effect
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && settingsState.privacyBlur) {
                document.body.style.filter = 'blur(15px)';
            } else {
                document.body.style.filter = 'none';
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [settingsState.privacyBlur]);

    // New Feature States (Refactored for Tab Navigation)
    const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'notifications' | 'profile' | 'schedule' | 'community'>('home');
    const [messagingView, setMessagingView] = useState<'list' | 'room'>('list');
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [showLeads, setShowLeads] = useState(false);
    const [showCommHub, setShowCommHub] = useState(false);
    const [showTransactions, setShowTransactions] = useState(false); // NEW: Transactions System
    const [showLawsuitsWorkspace, setShowLawsuitsWorkspace] = useState(false);

    const [currentTheme, setCurrentTheme] = useState<ThemeKey>(() => persistenceRepository.load<ThemeKey>('lawyer_theme') || 'gold');
    const [currentShape, setCurrentShape] = useState<ShapeKey>(() => persistenceRepository.load<ShapeKey>('lawyer_shape') || 'pill');
    
    useAutoSave('lawyer_theme', currentTheme);
    useAutoSave('lawyer_shape', currentShape);
    
    // THEME AND SHAPE
    const { theme, shapeClass } = useThemeStyles(currentTheme, currentShape);

    // --- NEW SETTINGS STATE ---
    const [glassMode, setGlassMode] = useState(false);
    const [enableAnimations, setEnableAnimations] = useState(true);

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

    const [globalNotes, setGlobalNotes] = useState<GlobalNote[]>(() => persistenceRepository.load<GlobalNote[]>(STORAGE_KEYS.LAWYER_NOTES) || [
        { id: 101, title: 'فكرة مرافعة', body: 'يجب التركيز على الدفوع الشكلية في دعوى احمد...', isPinned: true, color: '#1A1E2E', date: '2026-02-01' }
    ]);
    useAutoSave(STORAGE_KEYS.LAWYER_NOTES, globalNotes);
    
    // ✅ NEW: Cloud Sync for Global Notes (Backend Integration v1.0)
    const { 
        isSyncing: isNotesSyncing,
        syncNow: syncNotesNow
    } = useCloudSync({
        localKey: STORAGE_KEYS.LAWYER_NOTES,
        syncInterval: 30000,
        enabled: !!user && !isAlternativeMode,
        onSyncSuccess: () => {
            debug.log('[LawyerDashboard] ✅ تمت مزامنة الملاحظات مع السحابة');
        },
        onSyncError: (error) => {
            debug.error('[LawyerDashboard] ❌ فشلت مزامنة الملاحظات:', error);
        }
    });
    
    // ✅ NEW: Real-time Updates - Phase 3 (subscription + toasts; live badge UI removed)
    useRealtime({
        userId: user?.id || '',
        enabled: !!user && !isAlternativeMode,
        showToasts: true,
        onExecutionUpdate: async (payload) => {
            debug.log('[LawyerDashboard] 📩 Realtime: تحديث ملف تنفيذ', payload);
            // إعادة تحميل الملفات
            syncExecutionFilesNow();
            // ✅ Phase 4: Push Notification
            if (payload.eventType === 'INSERT' && payload.new) {
                await PushNotificationService.notifyNewExecution(payload.new.case_no || 'جديد');
            }
        },
        onLawsuitUpdate: async (payload) => {
            debug.log('[LawyerDashboard] 📩 Realtime: تحديث ملف دعوى', payload);
            // إعادة تحميل الملفات
            syncLawsuitFilesNow();
            // ✅ Phase 4: Push Notification
            if (payload.eventType === 'INSERT' && payload.new) {
                await PushNotificationService.notifyNewLawsuit(payload.new.case_no || 'جديد');
            }
        },
        onNoteUpdate: async (payload) => {
            debug.log('[LawyerDashboard] 📩 Realtime: تحديث ملاحظة', payload);
            // إعادة تحميل الملاحظات
            syncNotesNow();
        }
    });
    
    // ✅ NEW: Phase 4 - Initialize Advanced Services
    useEffect(() => {
        const initAdvancedServices = async () => {
            if (!user || isAlternativeMode) return;
            if (advancedServicesOnceRef.current) return;
            advancedServicesOnceRef.current = true;
            
            debug.log('[LawyerDashboard] Initializing Phase 4 services...');
            
            if (settingsState.notifications) {
                try {
                    const initialized = await PushNotificationService.initialize();
                    if (initialized && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                        const permission = await PushNotificationService.requestPermission();
                        debug.log('[LawyerDashboard] Push permission:', permission);
                    }
                } catch (e) {
                    debug.error('[LawyerDashboard] Push init failed:', e);
                }
            }

            // CacheService removed — unused (415 lines of dead code)
        };
        
        if (typeof requestIdleCallback !== 'undefined') {
            const id = requestIdleCallback(() => void initAdvancedServices(), { timeout: 4000 });
            return () => cancelIdleCallback(id);
        }

        const t = setTimeout(() => void initAdvancedServices(), 500);
        return () => clearTimeout(t);
    }, [user, isAlternativeMode, settingsState.notifications]);

    const [files, setFiles] = useState<FileData[]>(() => {
        const loaded = persistenceRepository.load<FileData[]>(STORAGE_KEYS.LAWYER_FILES) || [];
        // Clean up known stale mock case from previous sessions
        if (loaded.length === 1 && loaded[0]?.id === 1 && loaded[0]?.caseNo === '2025/ب/522') {
            persistenceRepository.save(STORAGE_KEYS.LAWYER_FILES, []);
            return [];
        }
        return loaded;
    });
    useAutoSave(STORAGE_KEYS.LAWYER_FILES, files);

    const filesRef = useRef(files);
    const globalNotesRef = useRef(globalNotes);
    filesRef.current = files;
    globalNotesRef.current = globalNotes;

    useEffect(() => {
        let cancelled = false;
        let intervalId: number | null = null;

        const refresh = async () => {
            if (!user?.id) return;
            try {
                const alerts = await SecretaryOrchestrator.getUnifiedAlerts({
                    lawyerId: user.id,
                    files: filesRef.current,
                    notes: globalNotesRef.current,
                });
                if (!cancelled) setSecretaryAlerts(alerts);
            } catch (e) {
                debug.error('[LawyerDashboard] Secretary alerts refresh failed:', e);
            }
        };

        void refresh();
        intervalId = window.setInterval(() => {
            void refresh();
        }, 60_000);

        return () => {
            cancelled = true;
            if (intervalId !== null) window.clearInterval(intervalId);
        };
    }, [user?.id, files.length, globalNotes.length]);
    
    // ✅ NEW: Cloud Sync for Lawsuit Files (Backend Integration v1.0)
    const { 
        isSyncing: isLawsuitSyncing,
        syncNow: syncLawsuitFilesNow
    } = useCloudSync({
        localKey: STORAGE_KEYS.LAWYER_FILES,
        syncInterval: 30000,
        enabled: !!user && !isAlternativeMode,
        onSyncSuccess: () => {
            const merged = persistenceRepository.load<FileData[]>(STORAGE_KEYS.LAWYER_FILES);
            if (Array.isArray(merged)) {
                setFiles(merged);
            }
            debug.log('[LawyerDashboard] ✅ تمت مزامنة ملفات الدعاوى مع السحابة');
        },
        onSyncError: (error) => {
            debug.error('[LawyerDashboard] ❌ فشلت مزامنة ملفات الدعاوى:', error);
        }
    });
    
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
    useAutoSave(EXECUTION_FILES_KEY, executionFiles);
    
    // ✅ NEW: Cloud Sync for Execution Files (Backend Integration v1.0)
    const { 
        isSyncing: isCloudSyncing, 
        lastSyncTime: cloudLastSyncTime, 
        syncStatus: cloudSyncStatus,
        syncError: cloudSyncError,
        isOnline,
        syncNow: syncExecutionFilesNow
    } = useCloudSync({
        localKey: EXECUTION_FILES_KEY,
        syncInterval: 30000, // 30 ثانية
        enabled: !!user && !isAlternativeMode,
        onSyncSuccess: () => {
            debug.log('[LawyerDashboard] ✅ تمت مزامنة ملفات التنفيذ مع السحابة');
        },
        onSyncError: (error) => {
            debug.error('[LawyerDashboard] ❌ فشلت مزامنة ملفات التنفيذ:', error);
            // لا نعرض رسالة خطأ للمستخدم - البيانات محفوظة محلياً
        }
    });
    
    // ✅ NO ENCRYPTION - Migration removed
    
    useEffect(() => {
        const checkPrivacyMode = () => {
            // ✅ FIXED: Alternative mode removed - always use real data
            const isAlt = false;
            setIsAlternativeMode(isAlt);
            
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

            if (validFiles.length > 0) {
                SystemToasts.info.loading();
            }
        };
        
        checkPrivacyMode();
    }, []);
    
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

    const moveExecutionToTrash = useCallback((fileId: string | number) => {
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
    }, []);

    const restoreExecutionFromTrash = useCallback((fileId: string | number) => {
        const idStr = String(fileId);
        setExecutionFiles((prev) => {
            const next = prev.map((f) => (String(f.id) !== idStr ? f : stripExecutionTrashFields(f)));
            saveExecutionFilesRaw(next);
            storageCache.set(EXECUTION_FILES_KEY, next);
            return next;
        });
    }, []);

    const permanentlyDeleteExecutions = useCallback((ids: Array<string | number>) => {
        const idSet = new Set(ids.map(String));
        idSet.forEach((id) => {
            removeExecutionStorageBundle(id);
        });
        setExecutionFiles((prev) => {
            const next = prev.filter((f) => !idSet.has(String(f.id)));
            saveExecutionFilesRaw(next);
            storageCache.set(EXECUTION_FILES_KEY, next);
            return next;
        });
        setActiveFile((cur) => (cur && idSet.has(String(cur?.id)) ? null : cur));
    }, []);
    
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
    }, [user]);


    // --- SMART FILES PROTOCOL INTEGRATION ---
    const addCase = useCaseStore((s) => s.addCase);
    const selectCase = useCaseStore((s) => s.selectCase);
    const storeCases = useCaseStore((s) => s.cases);
    const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);

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

    // --- GLOBAL SEARCH ENGINE (FUSE.JS) ---
    const [searchQuery, setSearchQuery] = useState('');

    // --- LEGAL COMMAND CENTER HANDLERS ---
    // PERFORMANCE FIX: useCallback to prevent re-creating function on every render
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
    const [searchFilter, setSearchFilter] = useState('all');
    const [searchResults, setSearchResults] = useState<Array<Record<string, unknown>>>([]);
    
    // --- RAG SEARCH INTEGRATION ---
    const ragResults = useRagStore((s) => s.results);
    const searchLegalMemory = useRagStore((s) => s.searchLegalMemory);
    const isRagSearching = useRagStore((s) => s.isSearching);

    const combinedSearchData = React.useMemo(() => {
        const fileData = files.map(f => ({
            ...f,
            itemType: 'file',
            _searchStr: normalizeArabic(`
                ${f.caseNo || ''} 
                ${f.court || ''} 
                ${(f.parties || []).map((p: Party) => (p.name || '') + " " + (p.phone || '')).join(" ")} 
                ${(f.notes || []).map((n: FileData['notes'][number]) => n.text || '').join(" ")}
            `),
            _partiesNames: (f.parties || []).map((p: Party) => p.name || '').join(" "),
            _notesText: (f.notes || []).map((n: FileData['notes'][number]) => n.text || '').join(" "),
            _phoneNumbers: (f.parties || []).map((p: Party) => p.phone || '').join(" ")
        }));

        const noteData = globalNotes.map(n => ({
            ...n,
            type: 'note',
            itemType: 'note',
            status: 'active',
            caseNo: n.title,
            court: 'المفكرة',
            parties: [{ name: 'ملاحظة شخصية' }],
            _searchStr: normalizeArabic(`${n.title} ${n.body}`),
            _notesText: n.body,
            _partiesNames: '',
            _phoneNumbers: ''
        }));

        return [...fileData, ...noteData];
    }, [files, globalNotes]);

    const [fuseSearch, setFuseSearch] = React.useState(null);

    React.useEffect(() => {
        let cancelled = false;
        setFuseSearch(null);
        import('fuse.js').then((mod) => {
            if (cancelled) return;
            const Fuse = mod.default;
            setFuseSearch(
                new Fuse(combinedSearchData, {
                    keys: [
                        { name: 'caseNo', weight: 2 },
                        { name: '_partiesNames', weight: 1.5 },
                        { name: '_phoneNumbers', weight: 1.5 },
                        { name: '_notesText', weight: 0.8 },
                        { name: '_searchStr', weight: 0.5 }
                    ],
                    threshold: PERFORMANCE.FUSE_THRESHOLD,
                    ignoreLocation: true,
                    includeMatches: true,
                    minMatchCharLength: PERFORMANCE.FUSE_MIN_MATCH_LENGTH
                })
            );
        });
        return () => {
            cancelled = true;
        };
    }, [combinedSearchData]);

    useEffect(() => {
        if (!searchQuery) {
            setSearchResults([]);
            return;
        }
        if (!fuseSearch) {
            return;
        }

        const searchTimer = setTimeout(() => {
            const normalizedQuery = normalizeArabic(searchQuery);
            let results = fuseSearch.search(normalizedQuery);

            results = results.filter((r: { item: { status?: string } }) => r.item.status !== 'deleted');

            setSearchResults(results);

            if (searchQuery.length > PERFORMANCE.MIN_SEARCH_LENGTH) {
                searchLegalMemory(searchQuery);
            }
        }, TIMING.SEARCH_DEBOUNCE);

        return () => clearTimeout(searchTimer);
    }, [searchQuery, fuseSearch, searchLegalMemory]);

    const [alerts, setAlerts] = useState<Alert[]>([{ id: 1, title: 'جلسة مرافعة', subtitle: 'أمام بداءة الكرخ', time: '09:00', urgent: true }]);

    // --- NOTEPAD HANDLERS ---
    const handleSaveNote = async (note: GlobalNote) => {
        setGlobalNotes(prev => {
            const exists = prev.find(n => n.id === note.id);
            if (exists) return prev.map(n => n.id === note.id ? note : n);
            return [...prev, note];
        });
        
        // ✅ Backend Integration: Save to Supabase Cloud
        if (user && !isAlternativeMode) {
            try {
                const category = note.category ?? 'عام';
                await SupabaseService.saveGlobalNote({
                    title: note.title,
                    content: note.body,
                    category,
                    tags: note.tags || []
                });
                debug.log('[LawyerDashboard] ✅ Note saved to cloud');
            } catch (error) {
                debug.error('[LawyerDashboard] ⚠️ Cloud note save failed:', error);
            }
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
                        isPinned: note.isPinned
                    };
                    return { ...f, notes: [newFileNote, ...f.notes] };
                }
                return f;
            }));
        }
    };

    const handleDeleteNote = async (id: string) => {
        setGlobalNotes(prev => prev.filter(n => String(n.id) !== id));
        
        // ✅ Backend Integration: Delete from Supabase Cloud
        if (user && !isAlternativeMode) {
            try {
                await SupabaseService.deleteGlobalNote(String(id));
                debug.log('[LawyerDashboard] ✅ Note deleted from cloud');
            } catch (error) {
                debug.error('[LawyerDashboard] ⚠️ Cloud note delete failed:', error);
            }
        }
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
        setFiles((prev) => prev.map((f) => f.id === updatedFile.id ? updatedFile : f));
        setActiveFile(updatedFile);
        
        // ✅ CRITICAL FIX: Save to Cloud when updating file
        if (user) {
            LawyerDB.saveCase(user.id, updatedFile as unknown as Record<string, unknown>).catch(debug.error);
        }
    };

    // PERFORMANCE FIX: useCallback with functional update - stable deps
    const handleAddAlert = useCallback((newAlert: Alert) => {
        setAlerts((prev: Alert[]) => [newAlert, ...prev]);
    }, []);
    
    // PERFORMANCE FIX: useCallback with functional update - stable deps
    const handleDeleteFile = useCallback((fileToDelete: FileData) => {
        if (fileToDelete.status === 'deleted') {
            setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
        } else {
            const updated: FileData = { ...fileToDelete, status: 'deleted', deletedAt: Date.now() };
            setFiles((prev) => prev.map((f) => f.id === fileToDelete.id ? updated : f));
        }
    }, []);
    
    const handleRestoreFile = (fileToRestore: FileData) => {
        const updated: FileData = { ...fileToRestore, status: 'active', deletedAt: undefined };
        setFiles((prev) => prev.map((f) => f.id === fileToRestore.id ? updated : f));
        setActiveFile(updated);
    };

    const initiateSubFile = (parentFile: FileData) => {
        setSubFileBase(parentFile);
        setIsWizardOpen(true);
    };

    const [order, setOrder] = useState(['alerts', 'hub', 'notepad']);

    const { pendingTasks: quantumPendingForField } = useQuantumTasksContext();
    const pendingFieldTasksCount = useMemo(
        () =>
            quantumPendingForField.filter(
                (t) =>
                    t.pinnedToFieldCurtain ||
                    (t.location !== null && t.location.trim().length > 0) ||
                    t.subTasks.some((st) => !st.isCompleted && !!st.location?.trim()),
            ).length,
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
    const shouldHideHeader = showSettings || isWizardOpen || isNotepadOpen || (activeTab !== 'home') || showLeads || activeFile || archiveType || showLawsuitsWorkspace || searchQuery || showCommHub || showDocs || showNotebook || showUtilities || showSmartLib || showPetitionWizard || showScanner || showContractGenerator;

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

    debug.log('🎨 [LawyerDashboard] Rendering! isExecutionModalOpen =', isExecutionModalOpen, 'archiveType =', archiveType);

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

    return (
        <SafeView className={`min-h-screen w-full text-right pb-10 relative overflow-x-hidden font-sans transition-colors duration-500`} style={{ backgroundColor: theme.bg, fontSize: `${settingsState.fontSize}px` }} statusBarColor={theme.bg}>
            
            {/* ☁️ CLOUD SYNC STATUS INDICATOR (Backend Integration v1.0) */}
            {isCloudSyncing && (
                <div className="fixed top-4 right-4 z-[9999] bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>مزامنة مع السحابة...</span>
                </div>
            )}
            
            {/* 🌐 OFFLINE INDICATOR */}
            {!isOnline && (
                <div className="fixed top-4 right-4 z-[9999] bg-orange-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>وضع عدم الاتصال</span>
                </div>
            )}
            
            {/* ✅ NO ENCRYPTION - Migration indicator removed */}
            
            {notificationPanelMounted && (
                <Suspense fallback={null}>
                    <LazyNotificationPanel
                        isOpen={showNotifications}
                        onClose={() => setShowNotifications(false)}
                        userId={user?.id || 'demo_user'}
                        onNavigate={handleNotificationRouting}
                    />
                </Suspense>
            )}

            <Header
                shouldShow={!shouldHideHeader && activeTab === 'home'}
                unreadCount={unreadCount}
                onProfileClick={() => setActiveTab('profile')}
                onSearchClick={() => setShowGlobalSearch(true)}
                onNotificationsClick={() => setShowNotifications(true)}
                onSettingsClick={() => setShowControlMenu(true)}
            />

            {/* INDEXED STACK BODY */}
            <div className="flex-1 relative min-h-screen">
                
                {/* 1. HOME TAB */}
                <div className={activeTab === 'home' ? 'flex flex-col h-[100dvh] pt-[110px] pb-[80px]' : 'hidden'}>
                    <div className="flex-1 flex flex-col px-6 w-full gap-6">
                        <div dir="rtl" className="flex overflow-x-auto snap-x gap-4 pb-4 [&::-webkit-scrollbar]:hidden items-stretch" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {secretaryAlerts.length > 0 ? (
                                secretaryAlerts.slice(0, 8).map((alert) => (
                                    <UrgentRequestCard
                                        key={alert.id}
                                        alert={alert}
                                        onNavigate={(a) => {
                                            if (a.target === 'schedule') {
                                                setActiveTab('schedule');
                                                return;
                                            }
                                            if (a.target === 'notepad') {
                                                setNotepadMode('list');
                                                setIsNotepadOpen(true);
                                                return;
                                            }
                                            if (a.target === 'client_requests') {
                                                setArchiveType('client_requests');
                                                return;
                                            }
                                            if (a.target === 'transactions') {
                                                setShowTransactions(true);
                                                return;
                                            }
                                            if (a.target === 'community') {
                                                setActiveTab('community');
                                            }
                                        }}
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
                                            setIsNewCaseModalOpen(true);
                                        }}
                                    />
                                ))
                            ) : null}
                        </div>

                        <button
                            type="button"
                            onClick={() => setActiveTab('community')}
                            className="w-full rounded-2xl border border-[#DAA520]/20 bg-[#0D0D1A]/60 backdrop-blur-xl px-4 py-4 flex items-center justify-between hover:bg-[#0D0D1A]/75 transition-colors"
                        >
                            <div className="flex flex-col items-start text-right">
                                <div className="text-white font-bold text-sm">المنتدى القانوني</div>
                                <div className="text-white/60 text-[11px]">قسم مستقل للنقاشات والاستشارات والمشاركة</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 text-[#FFD700]">
                                <MessageCircle size={20} strokeWidth={1.5} />
                            </div>
                        </button>

                        {order.map((item, index) => (
                            <div key={item} className="contents">
                                <div className={`shrink-0 ${item === 'notepad' ? '-mt-10' : ''}`}>
                                {item === 'alerts' && (
                                    <Suspense fallback={null}>
                                        <LazyNeuralAlertsCard
                                            onOpenDrafter={(caseId: string) => { selectCase(caseId); setShowPetitionWizard(true); }}
                                            onOpenScanner={(caseId: string) => { selectCase(caseId); setShowScanner(true); }}
                                            onOpenWhatsApp={(phone: string, msg: string) => { window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank'); }}
                                        />
                                    </Suspense>
                                )}
                                {item === 'hub' && (
                                    <>
                                        <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                                            <LazyUnifiedCommandHub
                                                theme={theme}
                                                shapeClass={shapeClass}
                                                isEditMode={isEditMode}
                                                glassMode={glassMode}
                                                onAddClick={() => setIsNewCaseModalOpen(true)}
                                                onOpenArchive={(id: string) => {
                                                    if (id === 'notepad') {
                                                        setNotepadMode('list');
                                                        setIsNotepadOpen(true);
                                                    } else if (id === 'transaction') {
                                                        setShowTransactions(true);
                                                    } else if (id === 'lawsuit') {
                                                        setShowLawsuitsWorkspace(true);
                                                    } else {
                                                        setArchiveType(id as LawyerArchiveOverlay);
                                                    }
                                                }}
                                                onSearch={setSearchQuery}
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
                                            onOpenAutoDraft={() => setShowPetitionWizard(true)}
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

                {/* 2. CHAT TAB (FULL SCREEN) */}
                <div className={activeTab === 'chat' ? 'block' : 'hidden'}>
                    <div className="h-full w-full bg-[#0B1021]">
                        {messagingView === 'room' && activeChatId ? (
                            <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                                <LazyChatRoom chatId={activeChatId} onBack={() => setMessagingView('list')} />
                            </Suspense>
                        ) : (
                            <div className="flex flex-col h-full pt-6">
                                <div className="px-6 pb-4 flex items-center gap-3">
                                    <button type="button" onClick={() => setActiveTab('home')} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white">
                                        <ChevronRight size={20} />
                                    </button>
                                    <h2 className="text-xl font-bold text-white">الرسائل</h2>
                                </div>
                                <div className="flex-1 px-6 pb-32 overflow-y-auto scrollbar-hide">
                                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                                        <LazyMessagesList onSelectChat={(id: string) => { setActiveChatId(id); setMessagingView('room'); }} />
                                    </Suspense>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* COMMUNITY TAB */}
                <div className={activeTab === 'community' ? 'block h-[100dvh]' : 'hidden'}>
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyCommunityScreen onBack={() => setActiveTab('home')} />
                    </Suspense>
                </div>

                {/* SCHEDULE TAB */}
                <div className={activeTab === 'schedule' ? 'block h-[100dvh]' : 'hidden'}>
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazySmartLegalRadar onBack={() => setActiveTab('home')} userId={user?.id || ''} />
                    </Suspense>
                </div>

                {/* 4. PROFILE TAB */}
                <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
                    <div className="h-full">
                        <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                            <LazyRoyalLawyerProfile isScreenMode={true} />
                        </Suspense>
                    </div>
                </div>

            </div>

            <FieldTasksBottomSheet
                open={fieldTasksSheetOpen}
                onClose={() => setFieldTasksSheetOpen(false)}
                onManageAll={() => setShowTasksManager(true)}
            />

            {/* --- SMART CRIMINAL LIBRARY MODAL --- */}
            <AnimatePresence>
                {showSmartLib && (
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazySmartCriminalLibrary onClose={() => setShowSmartLib(false)} />
                    </Suspense>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showTasksManager && (
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyTasksManager onClose={() => setShowTasksManager(false)} />
                    </Suspense>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {searchQuery && (
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyGlobalSearchResults
                            results={searchResults}
                            ragResults={ragResults}
                            isRagSearching={isRagSearching}
                            query={searchQuery}
                            onSelect={(item: unknown) => {
                                if (item && typeof item === 'object') {
                                    const rec = item as Record<string, unknown>;
                                    if (rec.itemType === 'note') {
                                        setIsNotepadOpen(true);
                                        setNotepadMode('list');
                                        setSearchQuery('');
                                        return;
                                    }
                                }
                                if (isFileData(item)) {
                                    setActiveFile(item);
                                    setSearchQuery('');
                                }
                            }}
                            onClose={() => setSearchQuery('')}
                            activeFilter={searchFilter}
                            setActiveFilter={setSearchFilter}
                        />
                    </Suspense>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showControlMenu && (
                    <ControlMenu 
                        onClose={() => setShowControlMenu(false)}
                        onLogout={onLogout}
                        onOpenSettings={() => { setShowControlMenu(false); setShowSettings(true); }}
                        onOpenProfile={() => { setShowControlMenu(false); setActiveTab('profile'); }}
                        onSwitchRole={(role: string) => debug.log("Switching to", role)}
                    />
                )}
                {showSettings && (
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyHamiSettings
                            onClose={() => setShowSettings(false)}
                            onOpenProfile={() => { setShowSettings(false); setActiveTab('profile'); }}
                            onOpenArchive={() => { setShowSettings(false); setArchiveType('all'); }}
                            currentTheme={currentTheme}
                            onThemeChange={setCurrentTheme}
                            settingsState={settingsState}
                            setSettingsState={setSettingsState}
                        />
                    </Suspense>
                )}
                {isWizardOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center">Wizard Placeholder (Please implement CreationWizard extraction if needed)</div>}
                
                <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                    <LazyNotepadModal
                        key="notepad"
                        isOpen={isNotepadOpen}
                        onClose={() => setIsNotepadOpen(false)}
                        startMode={notepadMode}
                        notes={globalNotes}
                        onSave={handleSaveNote}
                        onDelete={handleDeleteNote}
                        onConvert={handleNotepadConvert}
                        files={files}
                        theme={theme}
                        shapeClass={shapeClass}
                    />
                </Suspense>
            </AnimatePresence>
            
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
                            onAddAlert={(a) => handleAddAlert(a as Alert)}
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
                            setIsNewCaseModalOpen(true);
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
                                    return;
                                }
                                if (!isFileData(f)) return;
                                if (archiveType === 'deleted') {
                                    handleRestoreFile(f);
                                } else {
                                    selectCase(f.id.toString());
                                    setActiveFile(f);
                                    setArchiveType(null);
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
                                    setIsNewCaseModalOpen(true);
                                    setArchiveType(null);
                                }
                            }}
                            onMoveExecutionToTrash={archiveType === 'execution' ? moveExecutionToTrash : undefined}
                            onRestoreExecutionFromTrash={archiveType === 'execution' ? restoreExecutionFromTrash : undefined}
                            onPermanentlyDeleteExecutions={archiveType === 'execution' ? permanentlyDeleteExecutions : undefined}
                        />
                    </Suspense>
                )
            )}

            {/* NEW FEATURES INTEGRATION */}
            <AnimatePresence>
                {/* Profile and NotificationDrawer removed as they are now Tabs */}
            </AnimatePresence>
            {/* NotificationDrawer logic moved to Tab */}
            
            <AnimatePresence>
                {/* ChatRoom logic moved to Tab, but Leads might still be overlay */}
                {showLeads && (
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyLeadManagement onClose={() => setShowLeads(false)} />
                    </Suspense>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCommHub && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60]">
                        <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                            <LazyCommunicationHub onClose={() => setShowCommHub(false)} />
                        </Suspense>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showTransactions && (
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyTransactionsSystem onBack={() => setShowTransactions(false)} userId={user?.id || 'dev-user-uuid-1'} />
                    </Suspense>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showLawsuitsWorkspace && (
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyLawsuitsWorkspace
                            files={files as FileData[]}
                            theme={theme as ThemeConfig}
                            shapeClass={shapeClass}
                            onClose={() => setShowLawsuitsWorkspace(false)}
                            onOpenFile={(f: unknown) => {
                                if (isRecord(f) && f.type === 'execution') {
                                    const exec = coerceExecutionFilePreserveId(f);
                                    setActiveFile(exec);
                                    setShowLawsuitsWorkspace(false);
                                    return;
                                }
                                if (!isFileData(f)) return;
                                selectCase(f.id.toString());
                                setActiveFile(f);
                                setShowLawsuitsWorkspace(false);
                            }}
                            onAddNewCase={() => {
                                setWizardInitialData({ type: 'lawsuit' });
                                setIsNewCaseModalOpen(true);
                                setShowLawsuitsWorkspace(false);
                            }}
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
                    {showPetitionWizard && (
                        <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                            <LazySmartLegalConsultant
                                key="smart-consultant"
                                onClose={() => setShowPetitionWizard(false)}
                                files={files}
                                onSaveToCase={(caseId: string, content: string) => {
                                    const newDoc = {
                                        id: Date.now().toString(),
                                        name: `عريضة قانونية - ${new Date().toLocaleDateString('ar-IQ')}.docx`,
                                        url: '#',
                                        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                        size: 1024,
                                        uploadedAt: new Date().toISOString()
                                    };
                                    const currentCase = useCaseStore.getState().getCase(caseId);
                                    if (currentCase) {
                                        useCaseStore.getState().updateCase(caseId, {
                                            linkedDocuments: [...(currentCase.linkedDocuments || []), newDoc]
                                        });
                                    }
                                }}
                            />
                        </Suspense>
                    )}
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
                {/* 10. Execution File Modal (Prompt 1) - UPDATED TO ENTERPRISE VIEW */}
                {isExecutionModalOpen && (
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
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

                {/* 11. Complete Lawsuit System (الشامل) */}
                {isNewCaseModalOpen && (
                    <Suspense fallback={null}>
                        <LazyCompleteLawsuitSystem
                            onClose={() => setIsNewCaseModalOpen(false)}
                            onSave={(data: unknown) => {
                                if (!data || typeof data !== 'object') return;
                                const d = data as Record<string, unknown>;
                                const details = (d.details && typeof d.details === 'object' ? (d.details as Record<string, unknown>) : {}) as Record<string, unknown>;
                                const mainCategory =
                                    d.mainCategory === 'lawsuit' || d.mainCategory === 'transaction' || d.mainCategory === 'execution'
                                        ? (d.mainCategory as CaseType)
                                        : 'lawsuit';
                                const caseNo = typeof details.number === 'string' && details.number.trim() ? details.number.trim() : 'جديد';
                                const court = typeof details.court === 'string' ? details.court : 'بداءة الكرخ';
                                const docType = typeof details.type === 'string' ? details.type : undefined;
                                const feesRaw = typeof details.totalAgreedFees === 'string' ? details.totalAgreedFees : '';
                                const feesTotal = feesRaw ? feesRaw.replace(/[^0-9.]/g, '') : '0';

                                const parties1 = Array.isArray(d.parties1) ? (d.parties1 as Array<Record<string, unknown>>) : [];
                                const parties2 = Array.isArray(d.parties2) ? (d.parties2 as Array<Record<string, unknown>>) : [];
                                const parties: Party[] = [
                                    ...parties1
                                        .map((p, idx) => ({
                                            id: typeof p.id === 'number' ? p.id : Date.now() + idx,
                                            name: typeof p.name === 'string' ? p.name : 'موكل',
                                            role: typeof p.status === 'string' ? p.status : 'المدعي',
                                            isClient: true,
                                            phone: typeof p.phone === 'string' ? p.phone : undefined,
                                            side: 'right' as const,
                                        }))
                                        .filter((x) => x.name.trim().length > 0),
                                    ...parties2
                                        .map((p, idx) => ({
                                            id: typeof p.id === 'number' ? p.id : Date.now() + 100 + idx,
                                            name: typeof p.name === 'string' ? p.name : 'خصم',
                                            role: typeof p.status === 'string' ? p.status : 'المدعى عليه',
                                            isClient: false,
                                            phone: typeof p.phone === 'string' ? p.phone : undefined,
                                            side: 'left' as const,
                                        }))
                                        .filter((x) => x.name.trim().length > 0),
                                ];

                                const newFile: FileData = {
                                    id: Date.now(),
                                    type: mainCategory,
                                    status: 'active',
                                    caseNo,
                                    caseNoParts: { year: new Date().getFullYear().toString(), type: '', seq: '' },
                                    court,
                                    docType,
                                    feesTotal,
                                    feesPaid: '0',
                                    date: new Date().toLocaleDateString('ar-EG'),
                                    parties,
                                    history: [],
                                    notes: [],
                                    images: [],
                                };

                                setFiles((prev) => [newFile, ...prev]);
                                SmartToast.success('تم إنشاء الملف بنجاح');
                                setIsNewCaseModalOpen(false);
                                setActiveFile(newFile);
                            }}
                        />
                    </Suspense>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {showGlobalSearch && (
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyGlobalSearchOverlay
                            onClose={() => setShowGlobalSearch(false)}
                            onNavigateToCase={(caseId: string) => {
                                selectCase(caseId);
                                onNavigateToCase?.(caseId);
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
    <QuantumTasksProvider>
        <LawyerDashboardInner {...props} />
    </QuantumTasksProvider>
);

// ✅ Memoize LawyerDashboard to prevent unnecessary re-renders
export const LawyerDashboard = React.memo(LawyerDashboardComponent);
