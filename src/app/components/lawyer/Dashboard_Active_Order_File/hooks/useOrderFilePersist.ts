import { useCallback, useEffect, useRef } from 'react';
import { UrgentActionsDB, uuidv4 } from '@/app/services/urgent-actions-db';
import type { CaseEvent } from '../types';

type UseOrderFilePersistArgs = {
    caseId: string | null;
    userId: string | null;
    caseEvents: CaseEvent[];
    setCaseEvents: React.Dispatch<React.SetStateAction<CaseEvent[]>>;
    setCaseData: React.Dispatch<React.SetStateAction<any>>;
    onCaseUpdated?: (caseId: string, patch: Record<string, unknown>) => void;
};

export function useOrderFilePersist({
    caseId,
    userId,
    caseEvents,
    setCaseEvents,
    setCaseData,
    onCaseUpdated,
}: UseOrderFilePersistArgs) {
    const pendingEventsSyncRef = useRef(false);
    const persistPatchTimerRef = useRef<number | null>(null);
    const persistPatchQueueRef = useRef<Record<string, unknown>>({});

    const flushPersistPatch = useCallback(
        async (patch: Record<string, unknown>) => {
            if (!caseId || !userId || !Object.keys(patch).length) return;
            await UrgentActionsDB.patchCase(userId, caseId, patch);
        },
        [caseId, userId],
    );

    const persistPatch = useCallback(
        (patch: Record<string, unknown>) => {
            if (!caseId) return;
            persistPatchQueueRef.current = { ...persistPatchQueueRef.current, ...patch };
            if (persistPatchTimerRef.current) window.clearTimeout(persistPatchTimerRef.current);
            persistPatchTimerRef.current = window.setTimeout(() => {
                persistPatchTimerRef.current = null;
                const queued = persistPatchQueueRef.current;
                persistPatchQueueRef.current = {};
                void flushPersistPatch(queued);
            }, 900);
        },
        [caseId, flushPersistPatch],
    );

    const persistAndMerge = useCallback(
        (patch: Record<string, unknown>) => {
            void persistPatch(patch);
            if (caseId) onCaseUpdated?.(caseId, patch);
            setCaseData((prev: any) => ({ ...(prev || {}), ...patch }));
        },
        [caseId, onCaseUpdated, persistPatch, setCaseData],
    );

    const appendCaseEvent = useCallback(
        (message: string, kind: CaseEvent['kind'] = 'action') => {
            const clean = String(message || '').trim();
            if (!clean) return;
            const entry: CaseEvent = {
                id: uuidv4(),
                kind,
                message: clean,
                createdAt: new Date().toISOString(),
            };
            pendingEventsSyncRef.current = true;
            setCaseEvents((prev) => [entry, ...prev].slice(0, 400));
        },
        [setCaseEvents],
    );

    useEffect(() => {
        const stopSubmit = (ev: Event) => {
            ev.preventDefault();
        };
        document.addEventListener('submit', stopSubmit, true);
        return () => {
            document.removeEventListener('submit', stopSubmit, true);
        };
    }, []);

    useEffect(() => {
        if (!pendingEventsSyncRef.current) return;
        pendingEventsSyncRef.current = false;
        persistPatchQueueRef.current = { ...persistPatchQueueRef.current, events: caseEvents };
        if (persistPatchTimerRef.current) window.clearTimeout(persistPatchTimerRef.current);
        persistPatchTimerRef.current = window.setTimeout(() => {
            persistPatchTimerRef.current = null;
            const queued = persistPatchQueueRef.current;
            persistPatchQueueRef.current = {};
            void flushPersistPatch(queued);
        }, 900);
    }, [caseEvents, flushPersistPatch]);

    useEffect(() => {
        return () => {
            if (persistPatchTimerRef.current) window.clearTimeout(persistPatchTimerRef.current);
        };
    }, []);

    return { persistPatch, flushPersistPatch, persistAndMerge, appendCaseEvent };
}
