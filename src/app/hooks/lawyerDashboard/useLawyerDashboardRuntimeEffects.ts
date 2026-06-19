import { useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Dispatch, SetStateAction } from 'react';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { CALENDAR_SOURCE_PATCHED_EVENT } from '@/app/services/calendarBridge.types';
import type { CalendarSourcePatchDetail } from '@/app/services/calendarBridgePersistence';
import { cleanupCalendarForUser } from '@/app/services/calendarDossierSync';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
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
    const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
    const setNotificationUserId = useNotificationStore((s) => s.setUserId);

    useEffect(() => {
        const uid = user?.id || authUser?.id || 'demo_user';
        setNotificationUserId(uid);
    }, [user?.id, authUser?.id, setNotificationUserId]);

    useEffect(() => {
        const uid = user?.id || authUser?.id;
        if (!uid) return;
        void fetchNotifications(uid);
    }, [user?.id, authUser?.id, fetchNotifications]);

    useEffect(() => {
        prefetchNotificationPanel();
        prefetchRoyalLawyerProfile();
    }, []);

    useEffect(() => {
        if (calendarCleanedOnceRef.current) return;
        const uid = resolveCalendarUserId(user?.id ?? authUser?.id ?? null);
        calendarCleanedOnceRef.current = true;
        void cleanupCalendarForUser(uid);
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

        const debounceMs = import.meta.env.DEV ? 1_200 : 600;
        const timer = window.setTimeout(() => {
            warmGlobalSearchPipeline({
                userId: uid,
                files,
                executionFiles,
                globalNotes,
                notifications: searchNotifications,
                criminalCases: criminalCasesForCluster,
                cacheGeneration: searchIndexVersion,
            });
        }, debounceMs);

        return () => window.clearTimeout(timer);
    }, [
        user?.id,
        files,
        executionFiles,
        globalNotes,
        searchNotifications,
        criminalCasesForCluster,
        searchIndexVersion,
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
        if (showLawsuitsWorkspace) {
            prefetchDossierShells();
        }
    }, [showLawsuitsWorkspace]);

    useEffect(() => {
        if (files.length > 0 && storeCases.length === 0) {
            files.forEach((f) => {
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
            });
        }
    }, [addCase, files, storeCases.length]);
}
