import type { CriminalCase } from './criminalStore';
import { filterCriminalCasesForLawyer } from './criminalCaseOwner';
import { criminalArchiveHearingFingerprint } from '@/app/components/lawyer/ArchivePortal/utils/criminalArchiveHearing';
import {
    CRIMINAL_DASHBOARD_STUB,
    type CriminalDashboardBridge,
} from './criminalDashboardBridgeContext';

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

type AttachCriminalDashboardBridgeOptions = {
    lawyerId: string | null;
    onChange: (bridge: CriminalDashboardBridge) => void;
    onCasesChange?: (cases: CriminalCase[]) => void;
};

/**
 * يحمّل criminalStore عند الطلب — لا يدخل في إغلاق FullBoot الساكن.
 * لا يلفّ شجرة React؛ القيمة تُدفع عبر onChange لتفادي إعادة تركيب المنزل.
 */
export function attachCriminalDashboardBridge({
    lawyerId,
    onChange,
    onCasesChange,
}: AttachCriminalDashboardBridgeOptions): () => void {
    let cancelled = false;
    let unsubStore: (() => void) | undefined;
    let offHydration: (() => void) | undefined;
    let claimedUnowned = false;
    let prevCases: Record<string, CriminalCase> = {};
    let listFingerprint = '';

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
                if (uid && !claimedUnowned) {
                    claimedUnowned = true;
                    store.claimUnownedCasesForSession(uid);
                }

                const casesById = useCriminalStore.getState().casesById ?? {};
                const allCases = Object.values(casesById);
                const cases = filterCriminalCasesForLawyer(allCases, uid);
                const fingerprint = casesListFingerprint(
                    Object.fromEntries(cases.map((c) => [c.id, c])),
                );

                if (uid) {
                    const prev = prevCases;
                    const next = Object.fromEntries(cases.map((c) => [c.id, c])) as Record<
                        string,
                        CriminalCase
                    >;
                    const changedIds = Object.keys(next).filter((caseId) => prev[caseId] !== next[caseId]);
                    const removedIds = Object.keys(prev).filter((caseId) => !next[caseId]);
                    prevCases = next;
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
                                        const record = next[caseId] as unknown as Record<string, unknown>;
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

                if (fingerprint !== listFingerprint) {
                    listFingerprint = fingerprint;
                    onCasesChange?.(cases);
                    onChange({
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

    return () => {
        cancelled = true;
        offHydration?.();
        offHydration = undefined;
        unsubStore?.();
        unsubStore = undefined;
        onChange(CRIMINAL_DASHBOARD_STUB);
    };
}
