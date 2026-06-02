import { useEffect, useRef, startTransition } from 'react';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import { applyCaseRecord } from './applyCaseRecord';
import type { PersistedCaseRecord } from './caseRecordTypes';
import type { UseOrderFileHydrateArgs } from './types';

export function useFetchCaseHydrate({ caseId, userId, fileData, setters }: UseOrderFileHydrateArgs) {
    const settersRef = useRef(setters);
    settersRef.current = setters;
    const fileDataRef = useRef(fileData);
    fileDataRef.current = fileData;

    useEffect(() => {
        if (!caseId) return;

        const s = () => settersRef.current;
        const seed =
            fileDataRef.current && typeof fileDataRef.current === 'object'
                ? (fileDataRef.current as Record<string, unknown>)
                : null;
        if (seed && String(seed.id ?? '') === caseId) {
            s().setCaseData((prev: unknown) => ({ ...(prev && typeof prev === 'object' ? (prev as object) : {}), ...seed }));
        }

        let cancelled = false;

        const runApply = (record: unknown) => {
            const defer =
                typeof requestIdleCallback !== 'undefined'
                    ? (fn: () => void) => requestIdleCallback(fn, { timeout: 1200 })
                    : (fn: () => void) => window.setTimeout(fn, 0);
            defer(() => {
                if (cancelled) return;
                startTransition(() => {
                    if (record && typeof record === 'object') {
                        applyCaseRecord(record as PersistedCaseRecord, fileDataRef.current, s());
                    }
                });
            });
        };

        void (async () => {
            if (!caseId || cancelled) return;
            try {
                const state = await UrgentActionsDB.getState(userId);
                if (cancelled) return;
                const rawCases = Array.isArray(state?.cases) ? state.cases : [];
                const found = rawCases.find((c: unknown) => {
                    if (!c || typeof c !== 'object') return false;
                    return (c as { id?: string }).id === caseId;
                });
                const seedMatches = seed && String(seed.id ?? '') === caseId;
                let record: Record<string, unknown> | null = null;
                if (found && typeof found === 'object') {
                    record = { ...(found as Record<string, unknown>) };
                }
                if (seedMatches) {
                    record = { ...(record || {}), ...seed };
                }
                if (record) {
                    runApply(record);
                    return;
                }
            } catch {
                /* fall back to seed */
            }
            if (seed && String(seed.id ?? '') === caseId) {
                runApply(seed);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [caseId, userId]);
}
