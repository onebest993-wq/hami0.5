import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
    loadCriminalCaseRecordByIdAsync,
    loadCriminalCaseRecordByIdSync,
    loadCriminalCasesCardIndexSync,
} from '@/app/utils/criminalCasesStorage';
import { useCriminalStore } from './criminalStore';
import { isCriminalCaseVisibleToLawyer } from './criminalCaseOwner';

/**
 * حقن إضبارة من الفهرس/القرص عند فتح بطاقة ظهرت في الأرشيف لكنها غير موجودة في الذاكرة —
 * يمنع MissingCase الخاطئ أثناء التحميل أو بعد hydrate.
 */
export function useCriminalMissingCaseRecovery(caseId: string, isMissingCase: boolean) {
    const [missingRecoveryDone, setMissingRecoveryDone] = useState(false);

    const tryInjectRecord = useCallback(
        (match: { id?: string; ownerLawyerId?: string } | null) => {
            if (!match) return false;
            const live = useCriminalStore.getState().casesById ?? {};
            if (live[caseId]) return true;
            for (const row of Object.values(live)) {
                if (row && String(row.id ?? '').trim() === String(caseId)) return true;
            }
            const sessionOwner = useCriminalStore.getState().sessionOwnerLawyerId;
            if (
                !isCriminalCaseVisibleToLawyer(
                    match as { ownerLawyerId?: string },
                    sessionOwner,
                )
            ) {
                const indexHit = loadCriminalCasesCardIndexSync().find(
                    (row) => String(row.id ?? '').trim() === String(caseId),
                );
                if (
                    !indexHit ||
                    !isCriminalCaseVisibleToLawyer(indexHit, sessionOwner)
                ) {
                    return false;
                }
            }
            const recordId = String(match.id ?? caseId).trim() || caseId;
            const record = { ...(match as object), id: recordId } as (typeof live)[string];
            useCriminalStore.setState({
                casesById: {
                    ...live,
                    [caseId]: record,
                    ...(recordId !== caseId ? { [recordId]: record } : {}),
                },
            });
            return true;
        },
        [caseId],
    );

    useLayoutEffect(() => {
        if (!isMissingCase) return;
        try {
            if (tryInjectRecord(loadCriminalCaseRecordByIdSync(caseId))) return;
            const indexHit = loadCriminalCasesCardIndexSync().find(
                (row) => String(row.id ?? '').trim() === String(caseId),
            );
            if (indexHit) {
                tryInjectRecord(indexHit as { id?: string; ownerLawyerId?: string });
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
            if (tryInjectRecord(loadCriminalCaseRecordByIdSync(caseId))) {
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
                if (tryInjectRecord(row)) return;
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
