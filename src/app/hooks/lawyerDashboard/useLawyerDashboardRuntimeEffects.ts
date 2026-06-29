import { useEffect, useMemo } from 'react';
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
import { bindDashboardPostInteractiveWarm } from '@/app/runtime/dashboardPostInteractiveWarm';
import {
    clearGlobalSearchWarmSnapshot,
    registerGlobalSearchWarmSnapshot,
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
            buildCalendarDossierFingerprint(
                files,
                executionFiles,
                globalNotes,
                quantumTasks,
                criminalCasesForCluster,
            ),
        [files, executionFiles, globalNotes, quantumTasks, criminalCasesForCluster],
    );

    /** intent-only: تسخين هيدر فوري + shell خفيف idle بعد التفاعل */
    useEffect(() => {
        const uid = resolveShellAuthUserId(authUser?.id, user?.id);
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
        return scheduleIdleWork(() => {
            void refreshNotificationShellBadge(uid!);
        }, 400);
    }, [user?.id, authUser?.id]);

    useEffect(() => {
        const uid = resolveCalendarUserId(user?.id ?? authUser?.id ?? null);
        if (!isRealSignedIn(uid)) return;

        return scheduleIdleWork(() => {
            void (async () => {
                await SecureStoreService.ensurePersistedReady();
                await runSmartCalendarReconcileIfNeeded(uid, calendarDossierFingerprint);
            })();
        }, 2_500);
    }, [user?.id, authUser?.id, calendarDossierFingerprint]);

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

    /** لقطة بحث فقط — الفهرس يُبنى عند hover/فتح (لا warmGlobalSearchOnOpen عند كل تغيير ملفات) */
    useEffect(() => {
        const uid = resolveShellAuthUserId(authUser?.id, user?.id);
        if (!uid) {
            clearGlobalSearchWarmSnapshot();
            return;
        }

        registerGlobalSearchWarmSnapshot({
            userId: uid,
            files,
            executionFiles,
            globalNotes,
            notifications: searchNotifications,
            criminalCases: criminalCasesForCluster,
            cacheGeneration: searchIndexVersion,
        });

        return () => clearGlobalSearchWarmSnapshot();
    }, [
        authUser?.id,
        criminalCasesForCluster,
        executionFiles,
        files,
        globalNotes,
        searchIndexVersion,
        searchNotifications,
        user?.id,
    ]);

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
        return scheduleIdleWork(() => {
            hydrateCasesFromLawsuitFiles(mapLawsuitFilesToLegalCases(files));
        }, 2_000);
    }, [files, hydrateCasesFromLawsuitFiles, storeCases.length]);
}
