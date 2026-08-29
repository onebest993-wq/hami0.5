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
import { wasProfileOpenedThisPage } from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';
import { openCriminalDossierWithContract } from '@/app/runtime/criminalOpenContract';
import { hasLocalAppSession, resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { isSectionBackgroundPrefetchAllowed } from '@/app/runtime/sectionPrefetchPolicy';
import { LAWSUITS_PRIME_HOST_EVENT } from '@/app/runtime/lawsuitWorkspaceEvents';
import { EXECUTION_ARCHIVE_PRIME_HOST_EVENT } from '@/app/runtime/executionArchivePrimeHost';
import {
    loadLawsuitsOverlayEntry,
    prefetchLawsuitsOverlayEntry,
} from '@/app/runtime/lawsuitsOverlayEntryLoader';

function primeLawsuitsWorkspaceChunks(): void {
    prefetchLawsuitsOverlayEntry();
    void import('@/app/components/lawyer/dashboard/lawsuitsWorkspaceHostLazy')
        .then((m) => m.prefetchLawsuitsWorkspaceHost())
        .catch(() => undefined);
    void import('@/app/runtime/hubArchiveLoader')
        .then((m) => m.prefetchLawsuitArchiveHubModule())
        .catch(() => undefined);
}

export type UseLawyerDashboardOverlaysParams = {
    setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;
    /** لـ keep-alive: هل مخزن التنفيذ ظاهر الآن */
    executionArchiveOpen?: boolean;
    userId?: string | null;
};

export function useLawyerDashboardOverlays({
    setArchiveType,
    executionArchiveOpen = false,
    userId = null,
}: UseLawyerDashboardOverlaysParams) {
    const [activeTab, setActiveTab] = useState<LawyerDashboardTab>(() => {
        /* إعادة تركيب اللوحة أثناء جلسة فتح قائمة: أبقِ التبويب ولا تمسح snap */
        if (wasProfileOpenedThisPage()) return 'profile';
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
        primeLawsuitsWorkspaceChunks();
        void loadLawsuitsOverlayEntry()
            .then(() => {
                setLawsuitsHostMounted(true);
            })
            .catch(() => undefined);
    }, []);

    const armExecutionArchiveHost = useCallback(() => {
        setExecutionArchiveHostMounted(true);
    }, []);

    const openUrgentInLawsuitsWorkspace = useCallback((caseId?: string) => {
        primeLawsuitsWorkspaceChunks();
        void loadLawsuitsOverlayEntry()
            .then(() => {
                setLawsuitsHostMounted(true);
                setUrgentFocusCaseId(caseId?.trim() ? caseId.trim() : undefined);
                setLawsuitsWorkspaceTab('urgent');
                setShowLawsuitsWorkspace(true);
                setArchiveType(null);
            })
            .catch(() => undefined);
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
            primeLawsuitsWorkspaceChunks();
            void loadLawsuitsOverlayEntry()
                .then(() => {
                    setLawsuitsHostMounted(true);
                    setShowLawsuitsWorkspace(true);
                })
                .catch(() => undefined);
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
            const sessionUid = resolveShellAuthUserId(persisted.user?.id, userId);
            if (!hasLocalAppSession(sessionUid) && !hasLocalAppSession(userId)) {
                SmartToast.error('تعذّر فتح الإضبارة الجزائية — لا توجد جلسة محلية');
                return;
            }

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

            primeLawsuitsWorkspaceChunks();
            void loadLawsuitsOverlayEntry()
                .then(() => {
                    setLawsuitsHostMounted(true);
                })
                .catch(() => undefined);

            openCriminalDossierWithContract(trimmed, (id) => {
                setCriminalDashboardCaseId(id);
            });
        },
        [setArchiveType, userId],
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
        if (!open) {
            setShowLawsuitsWorkspace(false);
            return;
        }
        primeLawsuitsWorkspaceChunks();
        void loadLawsuitsOverlayEntry()
            .then(() => {
                setLawsuitsHostMounted(true);
                setShowLawsuitsWorkspace(true);
            })
            .catch(() => undefined);
    }, []);

    /**
     * بعد interactive: دعاوى Host + أسطح ميدان. مخزن التنفيذ: بايتات من
     * hubArchiveAfterHomePaint بعد طلاء الشبكة — بلا تركيب Host من الجلوس.
     */
    useLayoutEffect(() => {
        return onDashboardInteractive(() => {
            armLawsuitsHost();
            if (isSectionBackgroundPrefetchAllowed()) {
                void import('@/app/runtime/hubArchiveLoader')
                    .then((m) => m.prefetchLawsuitArchiveHubModule())
                    .catch(() => undefined);
            }
            void import('@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports')
                .then((m) => m.prefetchFieldTasksInstantPaint())
                .catch(() => undefined);
            if (isLitePerformanceActive()) return;
            void import('@/app/runtime/lawsuitWorkspaceWarm')
                .then((m) => m.warmLawsuitWorkspace({ includeSecondary: false }))
                .catch(() => undefined);
            void import('@/app/runtime/executionWorkspaceWarm')
                .then((m) =>
                    m.warmExecutionWorkspace({ includeSecondary: false }),
                )
                .catch(() => undefined);
        });
    }, [armLawsuitsHost]);

    /** hover / warm — يعيد تركيب Host بعد idle-release أو قبل النقر */
    useEffect(() => {
        const onPrimeLawsuits = () => {
            if (isLitePerformanceActive()) return;
            armLawsuitsHost();
        };
        const onPrimeExecution = () => {
            armExecutionArchiveHost();
            void import('@/app/runtime/executionArchiveOpenSession')
                .then((m) => m.prefetchExecutionArchiveOpen())
                .catch(() => undefined);
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
