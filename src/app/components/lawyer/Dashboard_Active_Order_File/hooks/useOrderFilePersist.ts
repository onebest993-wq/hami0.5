import { useCallback, useEffect, useRef } from 'react';
import { UrgentActionsDB, uuidv4 } from '@/app/services/urgent-actions-db';
import type { CaseEvent } from '../types';

type UseOrderFilePersistArgs = {
    caseId: string | null;
    userId: string | null;
    caseEvents: CaseEvent[];
    setCaseEvents: React.Dispatch<React.SetStateAction<CaseEvent[]>>;
    setCaseData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
    onCaseUpdated?: (caseId: string, patch: Record<string, unknown>) => void;
};

/**
 * عند وجود onCaseUpdated (مرآة قائمة المستعجل) تكون الكتابة للقرص عبر saveState فقط —
 * وإلا نستخدم patchCase المباشر. يمنع سباق patchCase(900ms) + saveState(500ms).
 */
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
    const listOwnsPersist = Boolean(onCaseUpdated);
    const flushPersistPatchRef = useRef<(patch: Record<string, unknown>) => Promise<void>>(async () => undefined);

    const flushPersistPatch = useCallback(
        async (patch: Record<string, unknown>) => {
            if (!caseId || !Object.keys(patch).length) return;
            if (listOwnsPersist) {
                onCaseUpdated?.(caseId, patch);
                setCaseData((prev) => ({ ...(prev || {}), ...patch }));
                return;
            }
            if (!userId) return;
            await UrgentActionsDB.patchCase(userId, caseId, patch);
        },
        [caseId, userId, listOwnsPersist, onCaseUpdated, setCaseData],
    );
    flushPersistPatchRef.current = flushPersistPatch;

    const persistPatch = useCallback(
        (patch: Record<string, unknown>) => {
            if (!caseId) return;
            if (listOwnsPersist) return;
            persistPatchQueueRef.current = { ...persistPatchQueueRef.current, ...patch };
            if (persistPatchTimerRef.current) window.clearTimeout(persistPatchTimerRef.current);
            persistPatchTimerRef.current = window.setTimeout(() => {
                persistPatchTimerRef.current = null;
                const queued = persistPatchQueueRef.current;
                persistPatchQueueRef.current = {};
                void flushPersistPatch(queued);
            }, 900);
        },
        [caseId, flushPersistPatch, listOwnsPersist],
    );

    const persistAndMerge = useCallback(
        (patch: Record<string, unknown>) => {
            if (caseId) onCaseUpdated?.(caseId, patch);
            setCaseData((prev) => ({ ...(prev || {}), ...patch }));
            if (!listOwnsPersist) {
                void persistPatch(patch);
            }
        },
        [caseId, listOwnsPersist, onCaseUpdated, persistPatch, setCaseData],
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
        if (listOwnsPersist && caseId) {
            onCaseUpdated?.(caseId, { events: caseEvents });
            setCaseData((prev) => ({ ...(prev || {}), events: caseEvents }));
            return;
        }
        persistPatchQueueRef.current = { ...persistPatchQueueRef.current, events: caseEvents };
        if (persistPatchTimerRef.current) window.clearTimeout(persistPatchTimerRef.current);
        persistPatchTimerRef.current = window.setTimeout(() => {
            persistPatchTimerRef.current = null;
            const queued = persistPatchQueueRef.current;
            persistPatchQueueRef.current = {};
            void flushPersistPatch(queued);
        }, 900);
    }, [caseEvents, caseId, flushPersistPatch, listOwnsPersist, onCaseUpdated, setCaseData]);

    useEffect(() => {
        return () => {
            if (persistPatchTimerRef.current) {
                window.clearTimeout(persistPatchTimerRef.current);
                persistPatchTimerRef.current = null;
            }
            const queued = persistPatchQueueRef.current;
            persistPatchQueueRef.current = {};
            if (Object.keys(queued).length) {
                void flushPersistPatchRef.current(queued);
            }
        };
    }, []);

    return { persistPatch, flushPersistPatch, persistAndMerge, appendCaseEvent };
}
