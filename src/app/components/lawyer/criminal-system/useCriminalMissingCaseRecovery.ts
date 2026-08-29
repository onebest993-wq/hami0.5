import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
    loadCriminalCaseRecordByIdAsync,
    loadCriminalCaseRecordByIdSync,
    loadCriminalCasesCardIndexSync,
} from '@/app/utils/criminalCasesStorage';
import { injectCriminalCaseIntoMap } from '@/app/utils/criminalCaseStoreInject';
import { useCriminalStore } from './criminalStore';
import { resolveCriminalCaseForSessionOpen } from './criminalCaseOwner';

/**
 * حقن إضبارة من الفهرس/القرص عند فتح بطاقة ظهرت في الأرشيف لكنها غير موجودة في الذاكرة —
 * يمنع MissingCase الخاطئ أثناء التحميل أو بعد hydrate.
 *
 * Card-index hits are marked as display stubs and must not overwrite a full case /
 * persist as a full shard; a later full load upgrades the stub.
 *
 * اليتامى: لا تُعرض في القائمة، لكن فتح المسار (inject) يختم المالك لهذه الإضبارة فقط.
 */
export function useCriminalMissingCaseRecovery(caseId: string, isMissingCase: boolean) {
    const [missingRecoveryDone, setMissingRecoveryDone] = useState(false);

    const tryInjectRecord = useCallback(
        (
            match: { id?: string; ownerLawyerId?: string } | null,
            options?: { fromCardIndex?: boolean },
        ) => {
            if (!match) return false;
            const live = useCriminalStore.getState().casesById ?? {};
            const sessionOwner = useCriminalStore.getState().sessionOwnerLawyerId;

            let prepared = resolveCriminalCaseForSessionOpen(
                match as { id?: string; ownerLawyerId?: string },
                sessionOwner,
            );
            let injectOptions = options;

            if (!prepared) {
                const indexHit = loadCriminalCasesCardIndexSync().find(
                    (row) => String(row.id ?? '').trim() === String(caseId),
                );
                if (!indexHit) return false;
                prepared = resolveCriminalCaseForSessionOpen(indexHit, sessionOwner);
                if (!prepared) return false;
                injectOptions = { fromCardIndex: true };
            }

            const { next, injected } = injectCriminalCaseIntoMap(
                live as Record<string, unknown>,
                caseId,
                prepared as { id?: string } & Record<string, unknown>,
                injectOptions,
            );
            if (!injected) {
                // Already present (full or stub) counts as recovered for MissingCase UX.
                const present =
                    Boolean(live[caseId]) ||
                    Object.values(live).some(
                        (row) => row && String(row.id ?? '').trim() === String(caseId),
                    );
                return present;
            }
            useCriminalStore.setState({
                casesById: next as typeof live,
            });
            return true;
        },
        [caseId],
    );

    useLayoutEffect(() => {
        if (!isMissingCase) return;
        try {
            if (tryInjectRecord(loadCriminalCaseRecordByIdSync(caseId), { fromCardIndex: false })) {
                return;
            }
            const indexHit = loadCriminalCasesCardIndexSync().find(
                (row) => String(row.id ?? '').trim() === String(caseId),
            );
            if (indexHit) {
                tryInjectRecord(indexHit as { id?: string; ownerLawyerId?: string }, {
                    fromCardIndex: true,
                });
            }
        } catch {
            /* ignore */
        }
    }, [caseId, isMissingCase, tryInjectRecord]);

    useEffect(() => {
        if (!isMissingCase) {
            setMissingRecoveryDone(false);
            return;
        }
        let cancelled = false;
        setMissingRecoveryDone(false);

        try {
            if (tryInjectRecord(loadCriminalCaseRecordByIdSync(caseId), { fromCardIndex: false })) {
                if (!cancelled) setMissingRecoveryDone(true);
                return () => {
                    cancelled = true;
                };
            }
        } catch {
            /* ignore */
        }

        const indexStillLists = loadCriminalCasesCardIndexSync().some(
            (row) => String(row.id ?? '').trim() === String(caseId),
        );
        const safetyMs = indexStillLists ? 12_000 : 4_000;
        const safety = window.setTimeout(() => {
            if (!cancelled) setMissingRecoveryDone(true);
        }, safetyMs);

        void loadCriminalCaseRecordByIdAsync(caseId)
            .then((row) => {
                if (cancelled) return;
                if (tryInjectRecord(row, { fromCardIndex: false })) return;
                if (!row && !indexStillLists) {
                    setMissingRecoveryDone(true);
                }
            })
            .catch(() => undefined)
            .finally(() => {
                window.clearTimeout(safety);
                if (!cancelled) setMissingRecoveryDone(true);
            });
        return () => {
            cancelled = true;
            window.clearTimeout(safety);
        };
    }, [caseId, isMissingCase, tryInjectRecord]);

    return { missingRecoveryDone };
}
