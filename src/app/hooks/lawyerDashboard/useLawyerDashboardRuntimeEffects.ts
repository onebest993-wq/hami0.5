import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Dispatch, SetStateAction } from 'react';
import { CALENDAR_SOURCE_PATCHED_EVENT } from '@/app/services/calendarBridge.types';
import type { CalendarSourcePatchDetail } from '@/app/services/calendar/bridgePersistence/lite';
import { buildCalendarDossierFingerprint } from '@/app/services/calendar/calendarDossierFingerprint';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { isRealSignedIn, resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import type { GlobalSearchWarmSnapshot } from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';

function loadGlobalSearchIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/globalSearchIntentWarm');
}

function loadDashboardPostInteractiveWarm() {
    return import('@/app/runtime/dashboardPostInteractiveWarm');
}
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalNote, ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import type { LegalCase } from '@/app/stores/caseStore';
import type { LegalTask } from '@/app/types/TaskEngine';

export type UseLawyerDashboardRuntimeEffectsParams = {
    backgroundRuntimeEnabled: boolean;
    user: User | null;
    authUser: User | null | undefined;
    files: FileData[];
    lawsuitLifecycleIndex?: import('@/app/domain/lawsuit/lawsuitLifecycleIndex').LawsuitLifecycleIndex;
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
    lawsuitLifecycleIndex,
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
              lawsuitLifecycleIndex,
              executionFiles,
              globalNotes,
              notifications: searchNotifications,
              criminalCases: criminalCasesForCluster,
              cacheGeneration: searchIndexVersion,
          }
        : null;

    /** تسخين الهيدر الخفيف بعد interactive. */
    useEffect(() => {
        const uid = resolveShellAuthUserId(authUser?.id, user?.id);
        if (!uid) return;
        let unbind: () => void = () => undefined;
        void loadDashboardPostInteractiveWarm().then((m) => {
            unbind = m.bindDashboardPostInteractiveWarm(uid);
        });
        return () => unbind();
    }, [user?.id, authUser?.id]);

    /**
     * Hydrators بعد BOOT_REVEAL_DONE + تأخير — لا تنافس أول طلاء المنزل.
     * ويب ~800ms / Capacitor ~400ms ثم idle bind.
     */
    useEffect(() => {
        const uid = resolveShellAuthUserId(authUser?.id, user?.id);
        if (!uid) return;
        let cancelled = false;
        let unbindExec: () => void = () => undefined;
        let unbindCriminal: () => void = () => undefined;
        let unbindSmart: () => void = () => undefined;
        let delayTimer: number | null = null;
        let cancelIdle: () => void = () => undefined;

        const bindHydrators = () => {
            if (cancelled) return;
            void Promise.all([
                import('@/app/runtime/executionBootHydrator'),
                import('@/app/runtime/criminalBootHydrator'),
                import('@/app/runtime/smartFileBootHydrator'),
            ]).then(([exec, criminal, smart]) => {
                if (cancelled) return;
                unbindExec = exec.bindExecutionBootHydrator(uid);
                unbindCriminal = criminal.bindCriminalBootHydrator(uid);
                unbindSmart = smart.bindSmartFileBootHydrator(uid);
            });
        };

        const scheduleAfterReveal = () => {
            const delayMs = isCapacitorNativePlatform() ? 200 : 400;
            delayTimer = window.setTimeout(() => {
                delayTimer = null;
                cancelIdle = scheduleIdleWork(bindHydrators, import.meta.env.DEV ? 200 : 400);
            }, delayMs);
        };

        if (isBootRevealDone()) {
            scheduleAfterReveal();
        } else {
            window.addEventListener(BOOT_REVEAL_DONE_EVENT, scheduleAfterReveal, { once: true });
        }

        return () => {
            cancelled = true;
            window.removeEventListener(BOOT_REVEAL_DONE_EVENT, scheduleAfterReveal);
            if (delayTimer != null) window.clearTimeout(delayTimer);
            cancelIdle();
            unbindExec();
            unbindCriminal();
            unbindSmart();
        };
    }, [user?.id, authUser?.id]);

    useEffect(() => {
        const uid = resolveShellAuthUserId(authUser?.id, user?.id);
        if (!uid) return;
        let cancelled = false;
        void import('@/app/stores/notificationStore')
            .then((m) => {
                if (cancelled) return;
                m.useNotificationStore.getState().setUserId(uid);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [user?.id, authUser?.id]);

    useEffect(() => {
        const uid = resolveShellAuthUserId(authUser?.id, user?.id);
        if (!isRealSignedIn(uid)) return;
        let cancelIdle: () => void = () => undefined;
        const timerId = window.setTimeout(() => {
            cancelIdle = scheduleIdleWork(() => {
                if (typeof document !== 'undefined' && document.hidden) return;
                void import('@/app/services/notifications/notificationBackgroundSync')
                    .then((m) => m.refreshNotificationShellBadge(uid!))
                    .catch(() => undefined);
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
        let cancelIdle: () => void = () => undefined;
        const timerId = window.setTimeout(() => {
            cancelIdle = scheduleIdleWork(() => {
                if (typeof document !== 'undefined' && document.hidden) return;
                void (async () => {
                    const [{ default: SecureStoreService }, { runSmartCalendarReconcileIfNeeded }] =
                        await Promise.all([
                            import('@/app/services/SecureStoreService'),
                            import('@/app/services/calendar/calendarReconcileScheduler'),
                        ]);
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
        let disposed = false;
        if (!shellAuthUserId) {
            void loadGlobalSearchIntentWarm().then((m) => m.clearGlobalSearchWarmSnapshot());
            return;
        }

        void loadGlobalSearchIntentWarm().then((m) => {
            if (disposed) return;
            m.registerGlobalSearchWarmSnapshotProvider(() => searchWarmSnapshotRef.current);
        });

        return () => {
            disposed = true;
            void loadGlobalSearchIntentWarm().then((m) => m.clearGlobalSearchWarmSnapshot());
        };
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
            void import('@/app/infrastructure/persistence/LocalStorageRepository').then(({ persistenceRepository }) => {
                const nextNotes = persistenceRepository.load<GlobalNote[]>(STORAGE_KEYS.LAWYER_NOTES) || [];
                setGlobalNotes(Array.isArray(nextNotes) ? nextNotes : []);
            });
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
        let cancelled = false;
        void import('@/app/components/lawyer/criminal-system/criminalDevEntry')
            .then((m) => {
                if (cancelled || !m.consumeOpenCriminalCasesListRequest()) return;
                void import('@/app/utils/lazyComponentsIntent')
                    .then((mod) => mod.prefetchCriminalDashboard())
                    .catch(() => undefined);
                setLawsuitsDossierSection('criminal');
                setLawsuitsWorkspaceTab('civil');
                setShowLawsuitsWorkspace(true);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [setLawsuitsDossierSection, setLawsuitsWorkspaceTab, setShowLawsuitsWorkspace]);

    useEffect(() => {
        if (!showLawsuitsWorkspace) return;
        let cancelIdle: () => void = () => undefined;
        let cancelled = false;
        void import('@/app/utils/lazyComponentsIntent')
            .then((m) => {
                if (cancelled) return;
                m.warmLawsuitWorkspace();
                if (lawsuitsDossierSection !== 'criminal') return;
                cancelIdle = scheduleIdleWork(() => {
                    void import('@/app/utils/lazyComponentsIntent')
                        .then((mod) => mod.prefetchCriminalDashboard())
                        .catch(() => undefined);
                }, 1_500);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
            cancelIdle();
        };
    }, [lawsuitsDossierSection, showLawsuitsWorkspace]);

    useEffect(() => {
        if (files.length === 0 || storeCases.length > 0) return;
        let cancelled = false;
        let cancelTask: (() => void) | undefined;
        void Promise.all([
            import('@/app/bootstrap/staggeredBootOrchestrator'),
            import('@/app/components/lawyer/LawyerDashboardParts/utils'),
        ])
            .then(([boot, utils]) => {
                if (cancelled) return;
                cancelTask = boot.enqueueStaggeredBootTask(
                    'case-store-hydrate',
                    () => {
                        hydrateCasesFromLawsuitFiles(utils.mapLawsuitFilesToLegalCases(files));
                    },
                    'deferred',
                );
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
            cancelTask?.();
        };
    }, [files, hydrateCasesFromLawsuitFiles, storeCases.length]);
}
