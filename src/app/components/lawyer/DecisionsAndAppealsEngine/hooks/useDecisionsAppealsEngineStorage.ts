import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { writeExecutorDecisionsUnionForExecution, mergeExecutorDecisionsUnionForPersist, pruneRedundantDecisionsStorageAliases, type ExecutorDecisionsPersistOptions } from '@/app/utils/executionDecisionsNamespace';
import { isSeizureDecisionFollowupComplete } from '@/app/components/lawyer/DecisionsAndAppealsEngine/seizureFollowupComplete';
import {
    buildDomainReconcileSignature,
    filterDecisionsForDomainContext,
    readExecutionDataForDomainGate,
    resolveExecutionDomainContext,
} from '@/app/utils/executionDomainIsolation';
import { normalizeLoadedDecisionRow } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/normalizeLoadedDecisionRow';
import {
    readDecisionsSessionCache,
    readDecisionsSessionCacheBest,
    writeDecisionsSessionCache,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/decisionsSessionCache';
import {
    collectDecisionsStorageCandidateIds,
    normalizeDecisionsExecutionIdProp,
    resolveDecisionsStorageExecutionId,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import { readDecisionsUnionAcrossCandidates } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/readDecisionsUnionAcrossCandidates';
import {
    purgeManualExecutorAppealArtifacts,
    reconcileTerminatedDecisionArchives,
    reconcileAppealFinalDecisionArchives,
    reconcileAppealDeadlineEnforcement,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import { resolveAppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import type { ExecutionFile } from '@/app/types/execution';

export type UseDecisionsAppealsEngineStorageParams = {
    executionId: string | undefined;
    executionDataForSync: Record<string, unknown> | null;
};

function resolveLiveExecutionData(
    executionDataForSync: Record<string, unknown> | null,
    resolvedExecutionId: string
): Record<string, unknown> | null {
    if (executionDataForSync && Object.keys(executionDataForSync).length > 0) {
        return executionDataForSync;
    }
    if (!resolvedExecutionId || resolvedExecutionId === 'default') return null;
    return readExecutionDataForDomainGate(resolvedExecutionId);
}

function collectRemovedDecisionIds(before: Decision[], after: Decision[]): string[] {
    const afterIds = new Set(after.map((d) => String(d.id ?? '').trim()).filter(Boolean));
    return before
        .map((d) => String(d.id ?? '').trim())
        .filter((id) => id && !afterIds.has(id));
}

function normalizeDecisionsFromRaw(raw: Decision[], syncData: Record<string, unknown> | null): Decision[] {
    let normalized = raw.map((d) => normalizeLoadedDecisionRow(d as Decision));
    const purgedManual = purgeManualExecutorAppealArtifacts(normalized);
    normalized = purgedManual.rows;
    const reconciledArchive = reconcileTerminatedDecisionArchives(normalized);
    normalized = reconciledArchive.rows;
    const reconciledAppealFinal = reconcileAppealFinalDecisionArchives(normalized);
    normalized = reconciledAppealFinal.rows;
    const reconciledDeadlines = reconcileAppealDeadlineEnforcement(normalized);
    normalized = reconciledDeadlines.rows;
    if (syncData) {
        normalized = normalized.map((row) => {
            if (String(row.seizureRequestSavedAt || '').trim()) return row;
            if (!isSeizureDecisionFollowupComplete(row, syncData as unknown as ExecutionFile)) return row;
            const ts = String(row.resolvedAt || row.date || new Date().toISOString()).trim();
            return { ...row, seizureRequestSavedAt: ts || new Date().toISOString() };
        });
    }
    return normalized;
}

export function useDecisionsAppealsEngineStorage({
    executionId: executionIdProp,
    executionDataForSync,
}: UseDecisionsAppealsEngineStorageParams) {
    const executionId = useMemo(
        () => normalizeDecisionsExecutionIdProp(executionIdProp),
        [executionIdProp]
    );

    const resolvedExecutionId = useMemo(
        () => resolveDecisionsStorageExecutionId(executionId, executionDataForSync),
        [
            executionId,
            executionDataForSync?.id,
            executionDataForSync?.parentDossierId,
            executionDataForSync?.parentFileId,
        ]
    );

    const storageCandidateIds = useMemo(
        () => collectDecisionsStorageCandidateIds(executionId, executionDataForSync),
        [
            executionId,
            executionDataForSync?.id,
            executionDataForSync?.parentDossierId,
            executionDataForSync?.parentFileId,
        ]
    );

    const lastValidExecutionIdRef = useRef<string | null>(null);
    const reloadGenerationRef = useRef(0);
    const reloadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconciledStorageRef = useRef<Set<string>>(new Set());
    const executionDataRef = useRef<Record<string, unknown> | null>(executionDataForSync);
    executionDataRef.current = executionDataForSync;

    const resolveWritableExecutionId = useCallback((): string | null => {
        const data = resolveLiveExecutionData(executionDataRef.current, resolvedExecutionId);
        const id = resolveDecisionsStorageExecutionId(executionId, data);
        if (id && id !== 'default') return id;
        const cached = lastValidExecutionIdRef.current;
        if (cached && cached !== 'default') return cached;
        return null;
    }, [executionId, resolvedExecutionId]);

    const getEffectiveExecutionData = useCallback((): Record<string, unknown> | null => {
        return resolveLiveExecutionData(executionDataRef.current, resolvedExecutionId);
    }, [resolvedExecutionId]);

    const resolvePersistId = useCallback((): string | null => {
        const data = getEffectiveExecutionData();
        const fromWritable = resolveWritableExecutionId();
        if (fromWritable) return fromWritable;

        if (resolvedExecutionId && resolvedExecutionId !== 'default') {
            return resolvedExecutionId;
        }

        const fromProps = resolveDecisionsStorageExecutionId(executionId, data);
        if (fromProps && fromProps !== 'default') return fromProps;

        for (const cid of storageCandidateIds) {
            if (cid && cid !== 'default') return cid;
        }

        const cached = readDecisionsSessionCacheBest(storageCandidateIds);
        if (cached?.length) {
            for (const cid of storageCandidateIds) {
                const hit = readDecisionsSessionCache(cid);
                if (hit?.length) return cid;
            }
        }

        const cachedRef = lastValidExecutionIdRef.current;
        if (cachedRef && cachedRef !== 'default') return cachedRef;

        return null;
    }, [
        executionId,
        getEffectiveExecutionData,
        resolveWritableExecutionId,
        resolvedExecutionId,
        storageCandidateIds,
    ]);

    const writeSessionCacheForCandidates = useCallback(
        (rows: Decision[], persistId: string) => {
            const data = getEffectiveExecutionData();
            const extra = lastValidExecutionIdRef.current
                ? [lastValidExecutionIdRef.current]
                : undefined;
            const aliases = collectDecisionsStorageCandidateIds(executionId, data, extra);
            writeDecisionsSessionCache(persistId, rows, aliases);
        },
        [executionId, getEffectiveExecutionData]
    );

    const readUnionFromStorage = useCallback((): Decision[] => {
        const syncData = getEffectiveExecutionData();
        const extra = lastValidExecutionIdRef.current
            ? [lastValidExecutionIdRef.current]
            : undefined;
        const { rows } = readDecisionsUnionAcrossCandidates(executionId, syncData, extra);
        return normalizeDecisionsFromRaw(rows, syncData);
    }, [executionId, getEffectiveExecutionData]);

    const [decisions, setDecisionsState] = useState<Decision[]>(() => {
        return (
            readDecisionsSessionCacheBest(
                collectDecisionsStorageCandidateIds(executionId, executionDataForSync)
            ) ?? []
        );
    });
    const [decisionsHydrated, setDecisionsHydrated] = useState(() => {
        const cached = readDecisionsSessionCacheBest(
            collectDecisionsStorageCandidateIds(executionId, executionDataForSync)
        );
        return (cached?.length ?? 0) > 0;
    });

    const setDecisions = useCallback((action: React.SetStateAction<Decision[]>) => {
        setDecisionsState(action);
    }, []);

    const domainContextSignature = useMemo(() => {
        const data = resolveLiveExecutionData(executionDataForSync, resolvedExecutionId);
        if (!data) return `${resolvedExecutionId}:none`;
        return buildDomainReconcileSignature(
            resolveExecutionDomainContext(data, resolvedExecutionId)
        );
    }, [
        executionDataForSync?.claimType,
        executionDataForSync?.classification,
        executionDataForSync?.representedParty,
        executionDataForSync?.id,
        executionDataForSync?.parentDossierId,
        resolvedExecutionId,
    ]);

    const persistDecisionsToStorage = useCallback(
        (next: Decision[], opts?: ExecutorDecisionsPersistOptions): Decision[] | null => {
            const data = getEffectiveExecutionData();
            let persistId = resolvePersistId();
            if (!persistId) {
                return null;
            }

            const attemptWrite = (targetId: string): Decision[] | null => {
                lastValidExecutionIdRef.current = targetId;
                const extra = lastValidExecutionIdRef.current
                    ? [lastValidExecutionIdRef.current]
                    : undefined;
                const rows = mergeExecutorDecisionsUnionForPersist(
                    targetId,
                    next as unknown as Record<string, unknown>[],
                    data,
                    { ...opts, extraIds: extra }
                );
                writeExecutorDecisionsUnionForExecution(
                    targetId,
                    rows,
                    data,
                );
                try {
                    pruneRedundantDecisionsStorageAliases(targetId, data);
                } catch {
                    /* prune اختياري — لا يُلغي الحفظ الأساسي */
                }
                const normalized = normalizeDecisionsFromRaw(rows as unknown as Decision[], data);
                writeSessionCacheForCandidates(normalized, targetId);
                return normalized;
            };

            try {
                return attemptWrite(persistId);
            } catch {
                for (const altId of storageCandidateIds) {
                    if (!altId || altId === 'default' || altId === persistId) continue;
                    try {
                        persistId = altId;
                        return attemptWrite(altId);
                    } catch {
                        /* جرّب المرشح التالي */
                    }
                }
                return null;
            }
        },
        [
            getEffectiveExecutionData,
            resolvePersistId,
            storageCandidateIds,
            writeSessionCacheForCandidates,
        ]
    );

    const effectiveExecutionData = useMemo(
        () => getEffectiveExecutionData(),
        [domainContextSignature, getEffectiveExecutionData]
    );

    const appealPerspective = useMemo(
        () => resolveAppealUiPerspective(effectiveExecutionData),
        [effectiveExecutionData]
    );

    const executionDomainContext = useMemo(
        () => resolveExecutionDomainContext(effectiveExecutionData, resolvedExecutionId),
        [domainContextSignature, effectiveExecutionData, resolvedExecutionId]
    );

    const domainVisibleDecisions = useMemo(
        () =>
            filterDecisionsForDomainContext(
                executionDomainContext,
                decisions as unknown as Record<string, unknown>[],
            ) as unknown as Decision[],
        [executionDomainContext, decisions]
    );

    const reloadFromStorage = useCallback(() => {
        const generation = ++reloadGenerationRef.current;
        const syncData = getEffectiveExecutionData();
        const extra = lastValidExecutionIdRef.current
            ? [lastValidExecutionIdRef.current]
            : undefined;
        const { canonicalId, rows: rawUnion } = readDecisionsUnionAcrossCandidates(
            executionId,
            syncData,
            extra
        );

        const persistId =
            resolveWritableExecutionId() ??
            (canonicalId !== 'default' ? canonicalId : null);

        if (!persistId) {
            return;
        }

        lastValidExecutionIdRef.current = persistId;
        if (generation !== reloadGenerationRef.current) return;

        const normalized = normalizeDecisionsFromRaw(rawUnion, syncData);
        if (generation !== reloadGenerationRef.current) return;

        let finalRows = normalized;
        setDecisionsState((prev) => {
            if (normalized.length === 0 && prev.length > 0) {
                const retry = readUnionFromStorage();
                finalRows = retry.length > 0 ? retry : prev;
                return finalRows;
            }
            if (normalized.length >= prev.length) {
                finalRows = normalized;
                return normalized;
            }
            const mergedById = new Map<string, Decision>();
            for (const row of [...prev, ...normalized]) {
                const rid = String(row.id ?? '').trim();
                if (rid) mergedById.set(rid, row);
            }
            finalRows = [...mergedById.values()].sort((a, b) => {
                const ad = String(a.resolvedAt ?? a.date ?? '');
                const bd = String(b.resolvedAt ?? b.date ?? '');
                return bd.localeCompare(ad, undefined, { numeric: true });
            });
            return finalRows;
        });
        if (finalRows.length > 0) {
            writeSessionCacheForCandidates(finalRows, persistId);
        }
        setDecisionsHydrated(true);
    }, [
        executionId,
        getEffectiveExecutionData,
        readUnionFromStorage,
        resolveWritableExecutionId,
    ]);

    /** تسوية تخزين لمرة واحدة لكل إضبارة في الجلسة — منفصلة عن كل إعادة تحميل */
    const reconcileStorageOnce = useCallback(() => {
        const syncData = getEffectiveExecutionData();
        const persistId =
            resolvePersistId() ??
            resolveDecisionsStorageExecutionId(executionId, syncData);
        if (!persistId || persistId === 'default') return;
        if (reconciledStorageRef.current.has(persistId)) return;
        reconciledStorageRef.current.add(persistId);

        const { rows: raw } = readDecisionsUnionAcrossCandidates(executionId, syncData);
        if (raw.length === 0) return;

        const normalizedFromRaw = raw.map((d) => normalizeLoadedDecisionRow(d as Decision));
        const purgedManual = purgeManualExecutorAppealArtifacts(normalizedFromRaw);
        let normalized = purgedManual.rows;
        const reconciledArchive = reconcileTerminatedDecisionArchives(normalized);
        normalized = reconciledArchive.rows;
        const reconciledAppealFinal = reconcileAppealFinalDecisionArchives(normalized);
        normalized = reconciledAppealFinal.rows;
        const reconciledDeadlines = reconcileAppealDeadlineEnforcement(normalized);
        normalized = reconciledDeadlines.rows;

        const needsPersist =
            purgedManual.rows.length !== normalizedFromRaw.length ||
            purgedManual.mutated ||
            reconciledArchive.mutated ||
            reconciledAppealFinal.mutated ||
            reconciledDeadlines.mutated;

        if (!needsPersist) return;

        try {
            const removedIds = collectRemovedDecisionIds(normalizedFromRaw, purgedManual.rows);
            const merged = persistDecisionsToStorage(
                normalizeDecisionsFromRaw(normalized, syncData),
                removedIds.length > 0 ? { removedIds } : undefined
            );
            if (merged) {
                setDecisionsState(merged);
            }
        } catch {
            /* ignore */
        }
    }, [executionId, getEffectiveExecutionData, persistDecisionsToStorage, resolvePersistId]);

    useEffect(() => {
        if (resolvedExecutionId && resolvedExecutionId !== 'default') {
            lastValidExecutionIdRef.current = resolvedExecutionId;
        }
    }, [resolvedExecutionId]);

    useEffect(() => {
        const cached = readDecisionsSessionCacheBest(storageCandidateIds);
        if (cached && cached.length > 0) {
            setDecisionsState(cached);
            setDecisionsHydrated(true);
        }
        reloadFromStorage();
        queueMicrotask(() => reconcileStorageOnce());
    }, [resolvedExecutionId, reloadFromStorage, reconcileStorageOnce, storageCandidateIds]);

    useEffect(() => {
        const scheduleReload = () => {
            if (reloadDebounceRef.current) {
                clearTimeout(reloadDebounceRef.current);
            }
            reloadDebounceRef.current = setTimeout(() => {
                reloadDebounceRef.current = null;
                reloadFromStorage();
            }, 120);
        };
        window.addEventListener('hami-decisions-reload', scheduleReload);
        window.addEventListener('hami-execution-decision-outcome', scheduleReload);
        window.addEventListener('hami-seizure-decision-step-saved', scheduleReload);
        window.addEventListener('hami-guarantor-followup-committed', scheduleReload);
        return () => {
            if (reloadDebounceRef.current) {
                clearTimeout(reloadDebounceRef.current);
                reloadDebounceRef.current = null;
            }
            window.removeEventListener('hami-decisions-reload', scheduleReload);
            window.removeEventListener('hami-execution-decision-outcome', scheduleReload);
            window.removeEventListener('hami-seizure-decision-step-saved', scheduleReload);
            window.removeEventListener('hami-guarantor-followup-committed', scheduleReload);
        };
    }, [reloadFromStorage]);

    return {
        decisions,
        decisionsHydrated,
        setDecisions,
        persistDecisionsToStorage,
        appealPerspective,
        executionDomainContext,
        domainVisibleDecisions,
        reloadFromStorage,
        resolvedExecutionId,
        resolveWritableExecutionId,
        getEffectiveExecutionData,
    };
}
