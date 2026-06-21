import { useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Dispatch, SetStateAction } from 'react';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { CALENDAR_SOURCE_PATCHED_EVENT } from '@/app/services/calendarBridge.types';
import type { CalendarSourcePatchDetail } from '@/app/services/calendarBridgePersistence';
import { cleanupCalendarForUser } from '@/app/services/calendarDossierSync';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { isRealSignedIn, resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import SecureStoreService from '@/app/services/SecureStoreService';
import { STORAGE_KEYS } from '@/app/utils/constants';
import {
    prefetchCriminalDashboard,
    prefetchDossierShells,
    prefetchGlobalSearchOverlay,
    prefetchNotificationPanel,
    prefetchRoyalLawyerProfile,
} from '@/app/utils/lazyComponents';
import { warmGlobalSearchExtras } from '@/app/services/globalSearchLoad';
import { warmGlobalSearchPipeline } from '@/app/services/globalSearchWarm';
import { consumeOpenCriminalCasesListRequest } from '@/app/components/lawyer/criminal-system/criminalDevEntry';
import { useNotificationStore } from '@/app/stores/notificationStore';
import type { FileData, Party } from '@/app/components/lawyer/LawyerShared';
import type { GlobalNote, ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import type { LegalCase } from '@/app/stores/caseStore';
import { mapFileStatusToCaseStatus } from '@/app/components/lawyer/LawyerDashboardParts/utils';

export type UseLawyerDashboardRuntimeEffectsParams = {
    user: User | null;
    authUser: User | null | undefined;
    files: FileData[];
    executionFiles: ExecutionFile[];
    globalNotes: GlobalNote[];
    searchNotifications: Array<{ id: string; title: string; message: string; type: string }>;
    criminalCasesForCluster: unknown[];
    searchIndexVersion: number;
    showLawsuitsWorkspace: boolean;
    storeCases: LegalCase[];
    addCase: (c: LegalCase) => void;
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
    searchIndexVersion,
    showLawsuitsWorkspace,
    storeCases,
    addCase,
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
    const calendarCleanedOnceRef = useRef(false);
    const warmDataRef = useRef({
        files,
        executionFiles,
        globalNotes,
        searchNotifications,
        criminalCasesForCluster,
    });
    warmDataRef.current = {
        files,
        executionFiles,
        globalNotes,
        searchNotifications,
        criminalCasesForCluster,
    };
    const dataFootprint = `${files.length}|${executionFiles.length}|${globalNotes.length}|${criminalCasesForCluster.length}`;
    const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
    const setNotificationUserId = useNotificationStore((s) => s.setUserId);

    useEffect(() => {
        const uid = resolveShellAuthUserId(authUser?.id, user?.id);
        if (!uid) return;
        setNotificationUserId(uid);
    }, [user?.id, authUser?.id, setNotificationUserId]);

    useEffect(() => {
        const uid = resolveShellAuthUserId(authUser?.id, user?.id);
        if (!isRealSignedIn(uid)) return;
        void fetchNotifications(uid!);
    }, [user?.id, authUser?.id, fetchNotifications]);

    useEffect(() => {
        prefetchNotificationPanel();
        prefetchRoyalLawyerProfile();
    }, []);

    useEffect(() => {
        if (calendarCleanedOnceRef.current) return;
        calendarCleanedOnceRef.current = true;
        void (async () => {
            await SecureStoreService.ensurePersistedReady();
            const uid = resolveCalendarUserId(user?.id ?? authUser?.id ?? null);
            await cleanupCalendarForUser(uid);
        })();
    }, [user?.id, authUser?.id]);

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
        const uid = user?.id ?? null;
        if (!uid) return;

        prefetchGlobalSearchOverlay();
        prefetchNotificationPanel();
        prefetchRoyalLawyerProfile();
        warmGlobalSearchExtras(uid);

        let cancelled = false;
        const runWarm = () => {
            if (cancelled) return;
            const data = warmDataRef.current;
            warmGlobalSearchPipeline({
                userId: uid,
                files: data.files,
                executionFiles: data.executionFiles,
                globalNotes: data.globalNotes,
                notifications: data.searchNotifications,
                criminalCases: data.criminalCasesForCluster,
                cacheGeneration: searchIndexVersion,
            });
        };

        if (typeof requestIdleCallback !== 'undefined') {
            const idleId = requestIdleCallback(runWarm, { timeout: 8_000 });
            return () => {
                cancelled = true;
                cancelIdleCallback(idleId);
            };
        }

        const timer = window.setTimeout(runWarm, import.meta.env.DEV ? 2_000 : 4_000);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [user?.id, searchIndexVersion, dataFootprint]);

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
        if (showLawsuitsWorkspace) {
            prefetchDossierShells();
        }
    }, [showLawsuitsWorkspace]);

    useEffect(() => {
        if (files.length === 0 || storeCases.length > 0) return;
        for (const f of files) {
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
                status: mapFileStatusToCaseStatus(f.status),
            };
            addCase(mappedCase);
        }
    }, [addCase, files, storeCases.length]);
}
