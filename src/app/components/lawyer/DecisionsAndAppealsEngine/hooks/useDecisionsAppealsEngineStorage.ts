// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { writeExecutorDecisionsArray } from '@/app/utils/executionDecisionsNamespace';
import { isSeizureDecisionFollowupComplete } from '@/app/components/lawyer/DecisionsAndAppealsEngine/seizureFollowupComplete';
import {
    filterDecisionsForDomainContext,
    resolveExecutionDomainContext,
} from '@/app/utils/executionDomainIsolation';
import { normalizeLoadedDecisionRow } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/normalizeLoadedDecisionRow';
import {
    purgeManualExecutorAppealArtifacts,
    reconcileTerminatedDecisionArchives,
    reconcileAppealDeadlineEnforcement,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import { resolveAppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';

export type UseDecisionsAppealsEngineStorageParams = {
    executionId: string;
    executionDataForSync: Record<string, unknown> | null;
};

export function useDecisionsAppealsEngineStorage({
    executionId,
    executionDataForSync,
}: UseDecisionsAppealsEngineStorageParams) {
    const [decisions, setDecisions] = useState<Decision[]>([]);

    const persistDecisionsToStorage = useCallback(
        (next: Decision[]) => {
            writeExecutorDecisionsArray(
                executionId,
                next as unknown as Record<string, unknown>[],
                executionDataForSync,
            );
        },
        [executionId, executionDataForSync],
    );

    const appealPerspective = useMemo(
        () => resolveAppealUiPerspective(executionDataForSync),
        [executionDataForSync],
    );

    const executionDomainContext = useMemo(
        () => resolveExecutionDomainContext(executionDataForSync, executionId),
        [executionDataForSync, executionId],
    );

    const domainVisibleDecisions = useMemo(
        () => filterDecisionsForDomainContext(executionDomainContext, decisions),
        [executionDomainContext, decisions],
    );

    const reloadFromStorage = useCallback(() => {
        let raw: Decision[] = readExecutorDecisionsArray(executionId) as Decision[];
        if (Array.isArray(raw) && raw.length > 0) {
            const seen = new Set<string>();
            let mutated = false;
            raw = raw.map((d, idx) => {
                const current = d as unknown as Record<string, unknown>;
                const idRaw = String(current.id ?? '').trim();
                if (!idRaw || seen.has(idRaw)) {
                    mutated = true;
                    const uuid = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
                        ?.randomUUID?.();
                    const nextId = uuid
                        ? `${idRaw || 'decision'}_${uuid}`
                        : `${idRaw || 'decision'}_${Date.now()}_${idx}_${Math.random().toString(16).slice(2)}`;
                    return { ...(d as Decision), id: nextId };
                }
                seen.add(idRaw);
                return d;
            });
            if (mutated) {
                try {
                    persistDecisionsToStorage(raw);
                } catch {
                    /* ignore */
                }
            }
        }
        let normalized = raw.map((d) => normalizeLoadedDecisionRow(d as Decision));
        const purgedManual = purgeManualExecutorAppealArtifacts(normalized);
        normalized = purgedManual.rows;
        const reconciledArchive = reconcileTerminatedDecisionArchives(normalized);
        normalized = reconciledArchive.rows;
        const reconciledDeadlines = reconcileAppealDeadlineEnforcement(normalized);
        normalized = reconciledDeadlines.rows;
        if (purgedManual.mutated || reconciledArchive.mutated || reconciledDeadlines.mutated) {
            try {
                persistDecisionsToStorage(normalized);
            } catch {
                /* ignore */
            }
        }
        if (executionDataForSync) {
            let backfillMutated = false;
            normalized = normalized.map((row) => {
                if (String(row.seizureRequestSavedAt || '').trim()) return row;
                if (!isSeizureDecisionFollowupComplete(row, executionDataForSync)) return row;
                backfillMutated = true;
                const ts = String(row.resolvedAt || row.date || new Date().toISOString()).trim();
                return { ...row, seizureRequestSavedAt: ts || new Date().toISOString() };
            });
            if (backfillMutated) {
                try {
                    persistDecisionsToStorage(normalized);
                } catch {
                    /* ignore */
                }
            }
        }
        setDecisions(normalized);
    }, [executionDataForSync, executionId, persistDecisionsToStorage]);

    useEffect(() => {
        reloadFromStorage();
    }, [executionDataForSync, reloadFromStorage]);

    useEffect(() => {
        const storedCount = readExecutorDecisionsArray(executionId).length;
        const currentCount = decisions.length;
        if (currentCount === 0 || storedCount > currentCount) {
            reloadFromStorage();
        }
    }, [decisions.length, executionId, reloadFromStorage]);

    useEffect(() => {
        const onExternalReload = () => {
            reloadFromStorage();
        };
        const onDecisionOutcome = () => {
            onExternalReload();
        };
        window.addEventListener('hami-decisions-reload', onExternalReload);
        window.addEventListener('hami-execution-decision-outcome', onDecisionOutcome);
        window.addEventListener('hami-seizure-decision-step-saved', onExternalReload);
        window.addEventListener('hami-guarantor-followup-committed', onExternalReload);
        return () => {
            window.removeEventListener('hami-decisions-reload', onExternalReload);
            window.removeEventListener('hami-execution-decision-outcome', onDecisionOutcome);
            window.removeEventListener('hami-seizure-decision-step-saved', onExternalReload);
            window.removeEventListener('hami-guarantor-followup-committed', onExternalReload);
        };
    }, [reloadFromStorage]);

    return {
        decisions,
        setDecisions,
        persistDecisionsToStorage,
        appealPerspective,
        executionDomainContext,
        domainVisibleDecisions,
        reloadFromStorage,
    };
}
