import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { CriminalCase } from './criminalStore';
import {
    getBackgroundServicesDeferMs,
    scheduleIdleWork,
} from '@/app/runtime/mobileRuntimePolicy';
import { filterCriminalCasesForLawyer } from './criminalCaseOwner';
import { criminalArchiveHearingFingerprint } from '@/app/components/lawyer/ArchivePortal/utils/criminalArchiveHearing';

export type CriminalDashboardBridge = {
    ready: boolean;
    criminalCases: CriminalCase[];
    deleteCriminalCase: (id: string) => void;
    resumePendingSeveranceForm: () => boolean;
    prepareNormalCriminalCaseForm: () => void;
};

const noop = () => false;
const noopDelete = () => {};

const STUB: CriminalDashboardBridge = {
    ready: false,
    criminalCases: [],
    deleteCriminalCase: noopDelete,
    resumePendingSeveranceForm: noop,
    prepareNormalCriminalCaseForm: () => undefined,
};

const CriminalDashboardBridgeContext = createContext<CriminalDashboardBridge>(STUB);

export const CRIMINAL_DASHBOARD_BRIDGE_ACTIVATE_EVENT = 'hami:criminal-dashboard-bridge-activate';

export function useCriminalDashboardBridge(): CriminalDashboardBridge {
    return useContext(CriminalDashboardBridgeContext);
}

type CriminalDashboardBridgeProviderProps = {
    lawyerId: string | null;
    enabled: boolean;
    children: ReactNode;
    onCasesChange?: (cases: CriminalCase[]) => void;
};

/** بصمة خفيفة لقائمة الإضابير — لا تتغيّر عند كل تعديل داخلي في الإضبارة المفتوحة. */
function casesListFingerprint(casesById: Record<string, CriminalCase | undefined>): string {
    return Object.keys(casesById)
        .sort()
        .map((caseId) => {
            const c = casesById[caseId];
            if (!c) return `${caseId}:missing`;
            return [
                caseId,
                c.dossierStatus ?? '',
                c.mergedIntoCaseId ?? '',
                c.courtCaseNumber ?? c.location?.caseNumber ?? '',
                c.basics?.crimeType ?? '',
                c.basics?.stage ?? '',
                c.isArchived ? '1' : '0',
                c.isFrozen ? '1' : '0',
                criminalArchiveHearingFingerprint(c as unknown as Record<string, unknown>),
            ].join(':');
        })
        .join('|');
}

/**
 * يحمّل criminalStore فقط عند تفعيل المرحلة الخلفية — لا يدخل في الـ shell الأولي.
 */
export function CriminalDashboardBridgeProvider({
    lawyerId,
    enabled,
    children,
    onCasesChange,
}: CriminalDashboardBridgeProviderProps) {
    const [bridge, setBridge] = React.useState<CriminalDashboardBridge>(STUB);
    const prevCasesRef = useRef<Record<string, CriminalCase>>({});
    const listFingerprintRef = useRef('');
    const loadStartedRef = useRef(false);
    const loadCleanupRef = useRef<(() => void) | null>(null);
    const claimedUnownedRef = useRef(false);

    const startBridgeLoad = useCallback(() => {
        if (loadStartedRef.current) return loadCleanupRef.current ?? undefined;
        loadStartedRef.current = true;

        let cancelled = false;
        let unsubStore: (() => void) | undefined;
        let offHydration: (() => void) | undefined;

        void import('./criminalStore').then((mod) => {
            if (cancelled) return;

            const useCriminalStore = mod.useCriminalStore;
            const stableActions = {
                deleteCriminalCase: (caseId: string) => useCriminalStore.getState().deleteCase(caseId),
                resumePendingSeveranceForm: () => useCriminalStore.getState().resumePendingSeveranceForm(),
                prepareNormalCriminalCaseForm: () =>
                    useCriminalStore.getState().prepareNormalCriminalCaseForm(),
            };

            /**
             * مهم: لا نستدعي set() متداخلاً ولا نرمي من داخل subscribe —
             * أي استثناء هنا كان يمنع onClose لمودال الإفادة رغم نجاح الحفظ.
             */
            const publish = () => {
                try {
                    const uid = lawyerId;
                    const store = useCriminalStore.getState();
                    if (uid && store.sessionOwnerLawyerId !== uid) {
                        store.setSessionOwnerLawyerId(uid);
                    }
                    if (uid && !claimedUnownedRef.current) {
                        claimedUnownedRef.current = true;
                        store.claimUnownedCasesForSession(uid);
                    }

                    const casesById = useCriminalStore.getState().casesById ?? {};
                    const allCases = Object.values(casesById);
                    const cases = filterCriminalCasesForLawyer(allCases, uid);
                    const fingerprint = casesListFingerprint(
                        Object.fromEntries(cases.map((c) => [c.id, c])),
                    );

                    if (uid) {
                        const prev = prevCasesRef.current;
                        const next = Object.fromEntries(cases.map((c) => [c.id, c])) as Record<
                            string,
                            CriminalCase
                        >;
                        const changedIds = Object.keys(next).filter((caseId) => prev[caseId] !== next[caseId]);
                        const removedIds = Object.keys(prev).filter((caseId) => !next[caseId]);
                        prevCasesRef.current = next;
                        // مزامنة التقويم خارج مكدس set/subscribe لتفادي كسر مسارات الحفظ
                        if (changedIds.length || removedIds.length) {
                            queueMicrotask(() => {
                                if (cancelled) return;
                                void Promise.all([
                                    import('@/app/services/calendar/dossierSync/criminalSync'),
                                    import('@/app/services/calendar/dossierSync/prune'),
                                ])
                                    .then(([criminalSync, prune]) => {
                                        if (cancelled) return;
                                        for (const caseId of changedIds) {
                                            const record = next[caseId] as unknown as Record<
                                                string,
                                                unknown
                                            >;
                                            try {
                                                criminalSync.syncCriminalCaseToCalendar(record, uid);
                                            } catch {
                                                /* لا تُسقط مسار الـ UI */
                                            }
                                        }
                                        for (const caseId of removedIds) {
                                            void prune.removeAllBridgedEventsForEntity(
                                                'criminal',
                                                caseId,
                                                uid,
                                            );
                                        }
                                    })
                                    .catch(() => undefined);
                            });
                        }
                    }

                    if (fingerprint !== listFingerprintRef.current) {
                        listFingerprintRef.current = fingerprint;
                        onCasesChange?.(cases);
                        setBridge({
                            ready: true,
                            criminalCases: cases,
                            ...stableActions,
                        });
                    }
                } catch (err) {
                    if (import.meta.env.DEV) {
                        console.warn('[criminalDashboardBridge] publish failed', err);
                    }
                }
            };

            const startPublishing = () => {
                publish();
                unsubStore = useCriminalStore.subscribe(publish);
            };

            if (useCriminalStore.persist.hasHydrated()) {
                startPublishing();
            } else {
                offHydration = useCriminalStore.persist.onFinishHydration(() => {
                    offHydration?.();
                    offHydration = undefined;
                    if (cancelled) return;
                    startPublishing();
                });
            }
        });

        const cleanup = () => {
            cancelled = true;
            offHydration?.();
            offHydration = undefined;
            unsubStore?.();
            unsubStore = undefined;
        };
        loadCleanupRef.current = cleanup;
        return cleanup;
    }, [lawyerId, onCasesChange]);

    useEffect(() => {
        if (!enabled) {
            loadCleanupRef.current?.();
            loadCleanupRef.current = null;
            loadStartedRef.current = false;
            listFingerprintRef.current = '';
            prevCasesRef.current = {};
            setBridge(STUB);
            return;
        }

        const cancelIdle = scheduleIdleWork(startBridgeLoad, {
            minDelayMs: getBackgroundServicesDeferMs(),
            timeoutMs: 20_000,
        });
        const activateNow = () => {
            cancelIdle();
            return startBridgeLoad();
        };

        window.addEventListener(CRIMINAL_DASHBOARD_BRIDGE_ACTIVATE_EVENT, activateNow);

        return () => {
            cancelIdle();
            window.removeEventListener(CRIMINAL_DASHBOARD_BRIDGE_ACTIVATE_EVENT, activateNow);
            loadCleanupRef.current?.();
            loadCleanupRef.current = null;
        };
    }, [enabled, startBridgeLoad]);

    const value = useMemo(() => bridge, [bridge]);

    return (
        <CriminalDashboardBridgeContext.Provider value={value}>
            {children}
        </CriminalDashboardBridgeContext.Provider>
    );
}
