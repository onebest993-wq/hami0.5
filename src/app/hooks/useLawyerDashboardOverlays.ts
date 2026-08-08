import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import { useKeepAliveIdleRelease } from '@/app/hooks/lawyerDashboard/useKeepAliveIdleRelease';
import {
    readInitialLawyerTab,
    resetProfileShellOnColdDashboardBoot,
    type LawyerDashboardTab,
    type OpenCriminalCaseOptions,
} from './lawyerDashboard/lawyerDashboardNav';
import { openCriminalDossierWithContract } from '@/app/runtime/criminalOpenContract';
import { isRealSignedIn, resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { LAWSUITS_PRIME_HOST_EVENT } from '@/app/runtime/lawsuitWorkspaceWarm';
import { EXECUTION_ARCHIVE_PRIME_HOST_EVENT } from '@/app/runtime/executionArchivePrimeHost';
import { prefetchExecutionArchiveOpen } from '@/app/runtime/executionArchiveOpenSession';

export type UseLawyerDashboardOverlaysParams = {
    setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;
    /** لـ keep-alive: هل مخزن التنفيذ ظاهر الآن */
    executionArchiveOpen?: boolean;
};

export function useLawyerDashboardOverlays({
    setArchiveType,
    executionArchiveOpen = false,
}: UseLawyerDashboardOverlaysParams) {
    const [activeTab, setActiveTab] = useState<LawyerDashboardTab>(() => {
        resetProfileShellOnColdDashboardBoot();
        return readInitialLawyerTab();
    });
    const [showLawsuitsWorkspace, setShowLawsuitsWorkspace] = useState(false);
    const [lawsuitsHostMounted, setLawsuitsHostMounted] = useState(false);
    const [executionArchiveHostMounted, setExecutionArchiveHostMounted] = useState(false);
    const [lawsuitsWorkspaceTab, setLawsuitsWorkspaceTab] = useState<'civil' | 'urgent'>('civil');
    const [lawsuitsDossierSection, setLawsuitsDossierSection] = useState<
        'all' | 'civil' | 'personal' | 'criminal'
    >('all');
    const [urgentFocusCaseId, setUrgentFocusCaseId] = useState<string | undefined>();
    const [criminalDashboardCaseId, setCriminalDashboardCaseId] = useState<string | null>(null);
    const criminalReturnTargetRef = useRef<'lawsuits_workspace' | 'main'>('main');
    const lawsuitDossierReturnTargetRef = useRef<'lawsuits_workspace' | 'main'>('main');

    const isCriminalDossierOpen = Boolean(criminalDashboardCaseId);

    const armLawsuitsHost = useCallback(() => {
        setLawsuitsHostMounted(true);
    }, []);

    const armExecutionArchiveHost = useCallback(() => {
        setExecutionArchiveHostMounted(true);
    }, []);

    const openUrgentInLawsuitsWorkspace = useCallback((caseId?: string) => {
        setLawsuitsHostMounted(true);
        setUrgentFocusCaseId(caseId?.trim() ? caseId.trim() : undefined);
        setLawsuitsWorkspaceTab('urgent');
        setShowLawsuitsWorkspace(true);
        setArchiveType(null);
    }, [setArchiveType]);

    const resetLawsuitDossierReturnTarget = useCallback(() => {
        lawsuitDossierReturnTargetRef.current = 'main';
    }, []);

    const markLawsuitDossierOpenedFromWorkspace = useCallback(() => {
        lawsuitDossierReturnTargetRef.current = 'lawsuits_workspace';
    }, []);

    const returnFromLawsuitDossier = useCallback(() => {
        const returnTarget = lawsuitDossierReturnTargetRef.current;
        lawsuitDossierReturnTargetRef.current = 'main';
        if (returnTarget === 'lawsuits_workspace') {
            setLawsuitsHostMounted(true);
            setShowLawsuitsWorkspace(true);
        }
    }, []);

    const closeHubShellOverlays = useCallback(() => {
        resetLawsuitDossierReturnTarget();
        setArchiveType(null);
        setShowLawsuitsWorkspace(false);
        setUrgentFocusCaseId(undefined);
    }, [resetLawsuitDossierReturnTarget, setArchiveType]);

    const openCriminalCase = useCallback(
        (caseId: string, options?: OpenCriminalCaseOptions) => {
            const trimmed = String(caseId ?? '').trim();
            if (!trimmed) return;

            const persisted = readPersistedSupabaseAuth();
            const sessionUid = resolveShellAuthUserId(persisted.user?.id, persisted.user?.id);
            if (!isRealSignedIn(sessionUid)) return;

            if (options?.keepReturnTarget) {
                openCriminalDossierWithContract(trimmed, (id) => {
                    setCriminalDashboardCaseId(id);
                });
                return;
            }

            if (options?.fromLawsuitsWorkspace) {
                criminalReturnTargetRef.current = 'lawsuits_workspace';
            } else {
                criminalReturnTargetRef.current = 'main';
                setShowLawsuitsWorkspace(false);
                setArchiveType(null);
            }

            setLawsuitsHostMounted(true);
            openCriminalDossierWithContract(trimmed, (id) => {
                setCriminalDashboardCaseId(id);
            });
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

    const exitCriminalDossierToHome = useCallback(() => {
        criminalReturnTargetRef.current = 'main';
        setCriminalDashboardCaseId(null);
        closeHubShellOverlays();
    }, [closeHubShellOverlays]);

    useKeepAliveIdleRelease(showLawsuitsWorkspace, () => setLawsuitsHostMounted(false));

    // أرشيف التنفيذ: بعد الإغلاق أبقِ Host دافئاً ثم حرّره بعد idle
    useKeepAliveIdleRelease(Boolean(executionArchiveOpen), () => {
        setExecutionArchiveHostMounted(false);
    });

    const setShowLawsuitsWorkspaceMounted = useCallback((open: boolean) => {
        if (open) setLawsuitsHostMounted(true);
        setShowLawsuitsWorkspace(open);
    }, []);

    /**
     * بعد interactive: ركّب Hosts مخفية + سخّن chunks — يزيل سباق «دفء/برد» عند أول نقرة.
     */
    useLayoutEffect(() => {
        return onDashboardInteractive(() => {
            armLawsuitsHost();
            void import('@/app/runtime/hubArchiveLoader')
                .then((m) => m.prefetchLawsuitArchiveContent())
                .catch(() => undefined);
            void import('@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports')
                .then((m) => m.prefetchFieldTasksInstantPaint())
                .catch(() => undefined);
            if (isLitePerformanceActive()) return;
            armExecutionArchiveHost();
            void import('@/app/runtime/lawsuitWorkspaceWarm')
                .then((m) => m.warmLawsuitWorkspace({ includeSecondary: false }))
                .catch(() => undefined);
            prefetchExecutionArchiveOpen();
            void import('@/app/runtime/executionWorkspaceWarm')
                .then((m) =>
                    m.warmExecutionWorkspace({ includeSecondary: false }),
                )
                .catch(() => undefined);
        });
    }, [armLawsuitsHost, armExecutionArchiveHost]);

    /** hover / warm — يعيد تركيب Host بعد idle-release أو قبل النقر */
    useEffect(() => {
        const onPrimeLawsuits = () => {
            if (isLitePerformanceActive()) return;
            armLawsuitsHost();
        };
        const onPrimeExecution = () => {
            if (isLitePerformanceActive()) return;
            armExecutionArchiveHost();
            prefetchExecutionArchiveOpen();
        };
        window.addEventListener(LAWSUITS_PRIME_HOST_EVENT, onPrimeLawsuits);
        window.addEventListener(EXECUTION_ARCHIVE_PRIME_HOST_EVENT, onPrimeExecution);
        return () => {
            window.removeEventListener(LAWSUITS_PRIME_HOST_EVENT, onPrimeLawsuits);
            window.removeEventListener(EXECUTION_ARCHIVE_PRIME_HOST_EVENT, onPrimeExecution);
        };
    }, [armLawsuitsHost, armExecutionArchiveHost]);

    return {
        activeTab,
        setActiveTab,
        showLawsuitsWorkspace,
        setShowLawsuitsWorkspace: setShowLawsuitsWorkspaceMounted,
        lawsuitsHostMounted,
        armLawsuitsHost,
        executionArchiveHostMounted,
        armExecutionArchiveHost,
        lawsuitsWorkspaceTab,
        setLawsuitsWorkspaceTab,
        lawsuitsDossierSection,
        setLawsuitsDossierSection,
        urgentFocusCaseId,
        setUrgentFocusCaseId,
        openUrgentInLawsuitsWorkspace,
        criminalDashboardCaseId,
        setCriminalDashboardCaseId,
        isCriminalDossierOpen,
        closeHubShellOverlays,
        openCriminalCase,
        closeCriminalCase,
        exitCriminalDossierToHome,
        markLawsuitDossierOpenedFromWorkspace,
        returnFromLawsuitDossier,
        resetLawsuitDossierReturnTarget,
    };
}
