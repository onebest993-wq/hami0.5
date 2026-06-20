// @ts-nocheck
import React, { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { CriminalCase } from '@/app/types/criminal';

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
                c.basics?.caseNumber ?? '',
                c.basics?.crimeType ?? '',
                c.basics?.stage ?? '',
                c.isArchived ? '1' : '0',
                c.isFrozen ? '1' : '0',
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

    useEffect(() => {
        if (!enabled) {
            listFingerprintRef.current = '';
            setBridge(STUB);
            return;
        }

        let cancelled = false;
        let unsubStore: (() => void) | undefined;

        void import('./criminalStore').then((mod) => {
            if (cancelled) return;

            const useCriminalStore = mod.useCriminalStore;
            const stableActions = {
                deleteCriminalCase: (caseId: string) => useCriminalStore.getState().deleteCase(caseId),
                resumePendingSeveranceForm: () => useCriminalStore.getState().resumePendingSeveranceForm(),
                prepareNormalCriminalCaseForm: () =>
                    useCriminalStore.getState().prepareNormalCriminalCaseForm(),
            };

            const publish = () => {
                const casesById = useCriminalStore.getState().casesById ?? {};
                const cases = Object.values(casesById);
                const fingerprint = casesListFingerprint(casesById);

                const uid = lawyerId;
                if (uid) {
                    const prev = prevCasesRef.current;
                    const next = casesById;
                    for (const caseId of Object.keys(next)) {
                        if (prev[caseId] !== next[caseId]) {
                            const record = next[caseId] as unknown as Record<string, unknown>;
                            void import('@/app/services/calendarDossierSync').then((m) =>
                                m.syncCriminalCaseToCalendar(record, uid),
                            );
                        }
                    }
                    for (const caseId of Object.keys(prev)) {
                        if (!next[caseId]) {
                            void import('@/app/services/calendarDossierSync').then((m) =>
                                m.removeAllBridgedEventsForEntity('criminal', caseId, uid),
                            );
                        }
                    }
                    prevCasesRef.current = next as Record<string, CriminalCase>;
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
            };

            const startPublishing = () => {
                publish();
                unsubStore = useCriminalStore.subscribe(publish);
            };

            if (useCriminalStore.persist.hasHydrated()) {
                startPublishing();
            } else {
                const offHydration = useCriminalStore.persist.onFinishHydration(() => {
                    offHydration();
                    if (cancelled) return;
                    startPublishing();
                });
            }
        });

        return () => {
            cancelled = true;
            unsubStore?.();
        };
    }, [enabled, lawyerId, onCasesChange]);

    const value = useMemo(() => bridge, [bridge]);

    return (
        <CriminalDashboardBridgeContext.Provider value={value}>
            {children}
        </CriminalDashboardBridgeContext.Provider>
    );
}
