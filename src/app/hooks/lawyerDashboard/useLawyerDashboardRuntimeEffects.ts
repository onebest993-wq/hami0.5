import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Dispatch, SetStateAction } from 'react';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { CALENDAR_SOURCE_PATCHED_EVENT } from '@/app/services/calendarBridge.types';
import type { CalendarSourcePatchDetail } from '@/app/services/calendarBridgePersistence';
import { buildCalendarDossierFingerprint } from '@/app/services/calendar/calendarDossierFingerprint';
import { runSmartCalendarReconcileIfNeeded } from '@/app/services/calendar/calendarReconcileScheduler';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { isRealSignedIn, resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import SecureStoreService from '@/app/services/SecureStoreService';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { prefetchCriminalDashboard, warmLawsuitWorkspace } from '@/app/utils/lazyComponents';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import { enqueueStaggeredBootTask } from '@/app/bootstrap/staggeredBootOrchestrator';
import { bindDashboardPostInteractiveWarm } from '@/app/runtime/dashboardPostInteractiveWarm';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import {
    clearGlobalSearchWarmSnapshot,
    registerGlobalSearchWarmSnapshotProvider,
    type GlobalSearchWarmSnapshot,
} from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';
import { consumeOpenCriminalCasesListRequest } from '@/app/components/lawyer/criminal-system/criminalDevEntry';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { refreshNotificationShellBadge } from '@/app/services/notifications/notificationBackgroundSync';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalNote, ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import type { LegalCase } from '@/app/stores/caseStore';
import { mapLawsuitFilesToLegalCases } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import type { LegalTask } from '@/app/types/TaskEngine';

export type UseLawyerDashboardRuntimeEffectsParams = {
    backgroundRuntimeEnabled: boolean;
    user: User | null;
    authUser: User | null | undefined;
    files: FileData[];
    executionFiles: ExecutionFile[];
    globalNotes: GlobalNote[];
    searchNotifications: Array<{ id: string; title: string; message: string; type: string }>;
    criminalCasesForCluster: unknown[];
    quantumTasks: LegalTask[];
    searchIndexVersion: number;
    showLawsuitsWorkspace: boolean;
    lawsuitsDossierSection: 'all' | 'civil' | 'personal' | 'criminal';
    storeCases: LegalCase[];
    hydrateCasesFromLawsuitFiles: (mapped: LegalCase[]) => void;
    refreshAppAlerts: () => void;
    reloadLawsuitFiles: () => void;
    reloadExecutionFiles: () => void;
    setGlobalNotes: Dispatch<SetStateAction<GlobalNote[]>>;
    setActiveFile: Dispatch<SetStateAction<FileData | ExecutionFile | null>>;
    setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;
    setLawsuitsDossierSection: (section: 'all' | 'civil' | 'personal' | 'criminal') => void;
    setLawsuitsWorkspaceTab: (tab: 'civil' | 'urgent') => void;
    setShowLawsuitsWorkspace: (open: boolean) => void;
};

export function useLawyerDashboardRuntimeEffects({
    backgroundRuntimeEnabled,
    user,
    authUser,
    files,
    executionFiles,
    globalNotes,
    searchNotifications,
    criminalCasesForCluster,
    quantumTasks,
    searchIndexVersion,
    showLawsuitsWorkspace,
    lawsuitsDossierSection,
    storeCases,
    hydrateCasesFromLawsuitFiles,
    refreshAppAlerts,
    reloadLawsuitFiles,
    reloadExecutionFiles,
    setGlobalNotes,
    setActiveFile,
    setArchiveType,
    setLawsuitsDossierSection,
    setLawsuitsWorkspaceTab,
    setShowLawsuitsWorkspace,
}: UseLawyerDashboardRuntimeEffectsParams) {
    const setNotificationUserId = useNotificationStore((s) => s.setUserId);

    const calendarDossierFingerprint = useMemo(
        () =>
            !backgroundRuntimeEnabled
                ? ''
                :
            buildCalendarDossierFingerprint(
                files,
                executionFiles,
                globalNotes,
                quantumTasks,
                criminalCasesForCluster,
            ),
        [
            backgroundRuntimeEnabled,
            files,
            executionFiles,
            globalNotes,
            quantumTasks,
            criminalCasesForCluster,
        ],
    );

    const [debouncedCalendarFingerprint, setDebouncedCalendarFingerprint] = useState(
        calendarDossierFingerprint,
    );

    useEffect(() => {
        if (!backgroundRuntimeEnabled) {
            setDebouncedCalendarFingerprint('');
            return;
        }
        const timer = window.setTimeout(() => {
            setDebouncedCalendarFingerprint(calendarDossierFingerprint);
        }, 2_500);
        return () => window.clearTimeout(timer);
    }, [backgroundRuntimeEnabled, calendarDossierFingerprint]);

    const shellAuthUserId = resolveShellAuthUserId(authUser?.id, user?.id);
    const searchWarmSnapshotRef = useRef<GlobalSearchWarmSnapshot | null>(null);
    searchWarmSnapshotRef.current = shellAuthUserId
        ? {
              userId: shellAuthUserId,
              files,
              executionFiles,
              globalNotes,
              notifications: searchNotifications,
              criminalCases: criminalCasesForCluster,
              cacheGeneration: searchIndexVersion,
          }
        : null;

    /** intent-only: نكتفي هنا بتسخين الهيدر الخفيف، ولا نُطلق hydrates الأقسام عند أول دخول. */
    useEffect(() => {
        const uid = resolveShellAuthUserId(authUser?.id, user?.id);
        if (!uid) return;
        return bindDashboardPostInteractiveWarm(uid);
    }, [user?.id, authUser?.id]);

    useEffect(() => {
        const uid = resolveShellAuthUserId(authUser?.id, user?.id);
        if (!uid) return;
        setNotificationUserId(uid);
    }, [user?.id, authUser?.id, setNotificationUserId]);

    useEffect(() => {
        const uid = resolveShellAuthUserId(authUser?.id, user?.id);
        if (!isRealSignedIn(uid)) return;
        let cancelIdle = () => undefined;
        const timerId = window.setTimeout(() => {
            cancelIdle = scheduleIdleWork(() => {
                if (typeof document !== 'undefined' && document.hidden) return;
                void refreshNotificationShellBadge(uid!);
            }, import.meta.env.DEV ? 2_500 : 12_000);
        }, import.meta.env.DEV ? 1_500 : 8_000);
        return () => {
            window.clearTimeout(timerId);
            cancelIdle();
        };
    }, [user?.id, authUser?.id]);

    useEffect(() => {
        if (!backgroundRuntimeEnabled) return;
        const uid = resolveCalendarUserId(user?.id ?? authUser?.id ?? null);
        if (!isRealSignedIn(uid)) return;
        let cancelIdle = () => undefined;
        const timerId = window.setTimeout(() => {
            cancelIdle = scheduleIdleWork(() => {
                if (typeof document !== 'undefined' && document.hidden) return;
                void (async () => {
                    await SecureStoreService.ensurePersistedReady();
                    await runSmartCalendarReconcileIfNeeded(uid, debouncedCalendarFingerprint);
                })();
            }, import.meta.env.DEV ? 4_000 : 18_000);
        }, import.meta.env.DEV ? 2_500 : 12_000);
        return () => {
            window.clearTimeout(timerId);
            cancelIdle();
        };
    }, [backgroundRuntimeEnabled, user?.id, authUser?.id, debouncedCalendarFingerprint]);

    useEffect(() => {
        if (!shellAuthUserId) {
            clearGlobalSearchWarmSnapshot();
            return;
        }

        registerGlobalSearchWarmSnapshotProvider(() => searchWarmSnapshotRef.current);

        return () => clearGlobalSearchWarmSnapshot();
    }, [shellAuthUserId]);

    useEffect(() => {
        const handler = (ev: Event) => {
            const detail = (ev as CustomEvent<CalendarSourcePatchDetail>).detail;
            if (!detail?.sourceModule) return;
            if (detail.sourceModule === 'lawsuit') {
                reloadLawsuitFiles();
                return;
            }
            if (detail.sourceModule === 'execution') {
                reloadExecutionFiles();
            }
        };
        window.addEventListener(CALENDAR_SOURCE_PATCHED_EVENT, handler);
        return () => window.removeEventListener(CALENDAR_SOURCE_PATCHED_EVENT, handler);
    }, [reloadExecutionFiles, reloadLawsuitFiles]);

    useEffect(() => {
        const reloadFromStorage = (opts?: { clear?: boolean }) => {
            reloadLawsuitFiles();
            const nextNotes = persistenceRepository.load<GlobalNote[]>(STORAGE_KEYS.LAWYER_NOTES) || [];
            setGlobalNotes(Array.isArray(nextNotes) ? nextNotes : []);
            reloadExecutionFiles();

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
    }, [refreshAppAlerts, reloadExecutionFiles, reloadLawsuitFiles, setActiveFile, setArchiveType, setGlobalNotes]);

    useEffect(() => {
        if (consumeOpenCriminalCasesListRequest()) {
            prefetchCriminalDashboard();
            setLawsuitsDossierSection('criminal');
            setLawsuitsWorkspaceTab('civil');
            setShowLawsuitsWorkspace(true);
        }
    }, [setLawsuitsDossierSection, setLawsuitsWorkspaceTab, setShowLawsuitsWorkspace]);

    useEffect(() => {
        if (!showLawsuitsWorkspace) return;
        warmLawsuitWorkspace();
        if (lawsuitsDossierSection !== 'criminal') return;
        return scheduleIdleWork(() => prefetchCriminalDashboard(), 1_500);
    }, [lawsuitsDossierSection, showLawsuitsWorkspace]);

    useEffect(() => {
        if (files.length === 0 || storeCases.length > 0) return;
        return enqueueStaggeredBootTask(
            'case-store-hydrate',
            () => {
                hydrateCasesFromLawsuitFiles(mapLawsuitFilesToLegalCases(files));
            },
            'deferred',
        );
    }, [files, hydrateCasesFromLawsuitFiles, storeCases.length]);
}
