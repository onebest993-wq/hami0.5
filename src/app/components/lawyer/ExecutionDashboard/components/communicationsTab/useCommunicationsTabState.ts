import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    dispatchDecisionsReload,
    executorDecisionRowHubDefaults,
    patchExecutorDecisionRowReliable,
    appendCommunicationJournalRequest,
} from '@/app/utils/executorSeizureDecisionQueue';
import { flushExecutorDecisionsStorageAwait } from '@/app/utils/executionDecisionsNamespace';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import { requireDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import {
    COMMUNICATION_KEYWORD,
    buildCommunicationDisplayContext,
    isAwaitingCommunicationResult,
    isCommunicationDecision,
} from '../communicationDecisionModel';
import type {
    CommunicationAwaitingUiState,
    CommunicationResultDraft,
    CommunicationsTabProps,
} from './communicationsTabTypes';
import { useCommunicationsTabResultHandlers } from './useCommunicationsTabResultHandlers';

export function useCommunicationsTabState({
    decisionsStorageExecutionId,
    executionData = null,
    showToast,
    pushTimelineEvent,
    nextTimelineId,
}: Pick<
    CommunicationsTabProps,
    | 'decisionsStorageExecutionId'
    | 'executionData'
    | 'showToast'
    | 'pushTimelineEvent'
    | 'nextTimelineId'
>) {
    const [targetDirectorate, setTargetDirectorate] = useState('');
    const [communicationDetails, setCommunicationDetails] = useState('');
    const [letterDate, setLetterDate] = useState(getLocalTodayYmd());
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [optimisticRows, setOptimisticRows] = useState<Record<string, unknown>[]>([]);
    const [resultDraftById, setResultDraftById] = useState<Record<string, CommunicationResultDraft>>({});
    const [awaitingUiById, setAwaitingUiById] = useState<Record<string, CommunicationAwaitingUiState>>({});
    const [localDecisionPatches, setLocalDecisionPatches] = useState<
        Record<string, Record<string, unknown>>
    >({});

    const { executionId: exId, decisions } = useExecutorDecisions(
        decisionsStorageExecutionId,
        executionData,
    );

    const storageExecutionId = useMemo(() => {
        const canonical = requireDecisionsStorageExecutionId({
            decisionsStorageExecutionId,
            executionId: exId,
            executionDataId: executionData?.id,
            executionData,
        });
        if (canonical !== 'default') return canonical;
        return String(exId || decisionsStorageExecutionId || executionData?.id || '').trim();
    }, [decisionsStorageExecutionId, exId, executionData]);

    const applyCommunicationDecisionPatch = useCallback(
        (decisionId: string, patch: Record<string, unknown>): boolean => {
            const did = String(decisionId || '').trim();
            if (!did) return false;
            const preferred = storageExecutionId;
            const { ok } = patchExecutorDecisionRowReliable(preferred || undefined, did, patch);
            if (!ok) return false;
            setLocalDecisionPatches((prev) => ({
                ...prev,
                [did]: { ...(prev[did] ?? {}), ...patch },
            }));
            dispatchDecisionsReload();
            void flushExecutorDecisionsStorageAwait(storageExecutionId, executionData);
            return true;
        },
        [storageExecutionId, executionData],
    );
    const decisionRows = useMemo(() => {
        const stored = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
        const byId = new Map<string, Record<string, unknown>>();
        for (const row of stored) {
            const id = String(row?.id ?? '').trim();
            if (id) {
                const patch = localDecisionPatches[id];
                byId.set(id, patch ? { ...row, ...patch } : row);
            }
        }
        for (const row of optimisticRows) {
            const id = String(row?.id ?? '').trim();
            if (id && !byId.has(id)) byId.set(id, row);
        }
        return Array.from(byId.values());
    }, [decisions, optimisticRows, localDecisionPatches]);

    useEffect(() => {
        setLocalDecisionPatches((prev) => {
            if (!Object.keys(prev).length) return prev;
            const stored = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
            let changed = false;
            const next = { ...prev };
            for (const [id, patch] of Object.entries(prev)) {
                const row = stored.find((r) => String(r?.id ?? '').trim() === id);
                if (!row) continue;
                const allSynced = Object.entries(patch).every(([key, value]) => {
                    const storedVal = row[key];
                    if (storedVal === value) return true;
                    if (
                        typeof storedVal === 'object' &&
                        typeof value === 'object' &&
                        storedVal != null &&
                        value != null
                    ) {
                        return JSON.stringify(storedVal) === JSON.stringify(value);
                    }
                    return false;
                });
                if (allSynced) {
                    delete next[id];
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [decisions]);

    useEffect(() => {
        if (!optimisticRows.length) return;
        const storedIds = new Set(
            (Array.isArray(decisions) ? decisions : [])
                .map((d) => String((d as { id?: string })?.id ?? '').trim())
                .filter(Boolean)
        );
        if (storedIds.size === 0) return;
        setOptimisticRows((prev) =>
            prev.filter((r) => !storedIds.has(String(r?.id ?? '').trim()))
        );
    }, [decisions, optimisticRows.length]);

    const commDecisions = useMemo(() => {
        return decisionRows
            .filter((d) => isCommunicationDecision(d))
            .sort((a, b) => {
                const da = String(a?.date ?? a?.resolvedAt ?? '');
                const db = String(b?.date ?? b?.resolvedAt ?? '');
                return db.localeCompare(da, undefined, { numeric: true });
            });
    }, [decisionRows]);

    const awaitingExecutor = useMemo(() => {
        return commDecisions.filter((d: { executorOutcome?: string }) => {
            const out = String(d?.executorOutcome ?? 'pending');
            return out === 'pending' || out === '';
        });
    }, [commDecisions]);

    const awaitingResultDecisions = useMemo(() => {
        return commDecisions.filter((d) => isAwaitingCommunicationResult(d, decisionRows));
    }, [commDecisions, decisionRows]);

    /** مخاطبات قديمة بـ executorOutcome=pending — تُحوَّل تلقائياً لمسار السجل فقط (كل أنواع التنفيذ) */
    useEffect(() => {
        if (!storageExecutionId || storageExecutionId === 'default') return;
        const stalePending = commDecisions.filter((d) => {
            const out = String(d?.executorOutcome ?? 'pending');
            return (out === 'pending' || out === '') && isCommunicationDecision(d);
        });
        if (!stalePending.length) return;
        const nowIso = new Date().toISOString();
        let migrated = false;
        stalePending.forEach((d) => {
            const id = String(d?.id ?? '').trim();
            if (!id) return;
            const { ok } = patchExecutorDecisionRowReliable(storageExecutionId, id, {
                executorOutcome: 'approved',
                status: 'accepted',
                resolvedAt: String(d?.resolvedAt ?? d?.date ?? nowIso),
            });
            if (ok) migrated = true;
        });
        if (migrated) {
            dispatchDecisionsReload();
            void flushExecutorDecisionsStorageAwait(storageExecutionId, executionData);
        }
    }, [commDecisions, storageExecutionId, executionData]);

    const logDecisions = useMemo(() => {
        return commDecisions.filter((d: { executorOutcome?: string }) => {
            const out = String(d?.executorOutcome ?? 'pending');
            if (out === 'pending' || out === '') return false;
            return !isAwaitingCommunicationResult(d, decisionRows);
        });
    }, [commDecisions, decisionRows]);

    const handleCreate = useCallback(async () => {
        if (!targetDirectorate.trim()) {
            showToast('يرجى إدخال اسم الجهة المُخاطبة', 'warning');
            return;
        }
        if (!letterDate.trim()) {
            showToast('يرجى إدخال تاريخ الكتاب', 'warning');
            return;
        }
        if (!communicationDetails.trim()) {
            showToast('يرجى إدخال تفاصيل المخاطبة', 'warning');
            return;
        }
        setCreating(true);

        try {
            const directorate = targetDirectorate.trim();
            const detailsText = communicationDetails.trim();
            const decisionId = appendCommunicationJournalRequest({
                executionId: storageExecutionId,
                letterDate: letterDate.trim(),
                content: detailsText,
                directorate,
                executionData,
            });

            if (!decisionId) {
                showToast('تعذّر تسجيل المخاطبة — أعد المحاولة', 'warning');
                setCreating(false);
                return;
            }

            const nowIso = new Date().toISOString();
            const { ok: patchOk } = patchExecutorDecisionRowReliable(storageExecutionId, decisionId, {
                executorOutcome: 'approved',
                status: 'accepted',
                resolvedAt: nowIso,
                deputationTargetDirectorate: directorate,
            });
            if (!patchOk) {
                showToast('تعذّر تثبيت المخاطبة — أعد المحاولة', 'error');
                setCreating(false);
                return;
            }
            await flushExecutorDecisionsStorageAwait(storageExecutionId, executionData);

            const optimisticRow: Record<string, unknown> = {
                ...executorDecisionRowHubDefaults(),
                id: decisionId,
                title: `${COMMUNICATION_KEYWORD} — ${directorate}`,
                body: `بتاريخ ${letterDate.trim()}:\n\n${detailsText}`,
                date: letterDate.trim(),
                resolvedAt: nowIso,
                appealStatus: 'pending',
                executorOutcome: 'approved',
                status: 'accepted',
                requestKind: 'special_followup',
                deputationTargetDirectorate: directorate,
            };
            setOptimisticRows((prev) => [
                optimisticRow,
                ...prev.filter((r) => String(r?.id ?? '').trim() !== decisionId),
            ]);
            dispatchDecisionsReload();

            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                type: 'communication',
                title: `مخاطبة: ${directorate}`,
                description: `طلب مخاطبة جهة — ${letterDate.trim()} — مُسجَّل في سجل المخاطبات`,
                date: letterDate.trim(),
                timestamp: now,
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
            });

            setTargetDirectorate('');
            setCommunicationDetails('');
            setLetterDate(getLocalTodayYmd());
            showToast('تم تسجيل المخاطبة في السجل — يمكنك متابعة النتيجة أدناه.', 'success');
        } catch {
            showToast('فشل إنشاء الطلب', 'error');
        }
        setCreating(false);
    }, [communicationDetails, storageExecutionId, nextTimelineId, pushTimelineEvent, letterDate, showToast, targetDirectorate, executionData]);

    const openAppeals = useCallback(
        (decisionId: string) => {
            if (!storageExecutionId || !decisionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: { executionId: storageExecutionId, tab: 'previous', decisionId },
                    }),
                );
            } catch {
                /* ignore */
            }
        },
        [storageExecutionId],
    );

    const {
        saveCommunicationResult,
        dismissFollowup,
        confirmNoResponse,
        confirmResendLetter,
        markDelivered,
        saveInlineAccordionResult,
    } = useCommunicationsTabResultHandlers({
        saving,
        setSaving,
        storageExecutionId,
        showToast,
        applyCommunicationDecisionPatch,
        pushTimelineEvent,
        nextTimelineId,
        setAwaitingUiById,
    });

    const getDraftForDecision = useCallback(
        (decisionId: string, fallbackPurpose: string): CommunicationResultDraft =>
            resultDraftById[decisionId] || {
                purpose: fallbackPurpose,
                letterNum: '',
                letterDate: '',
                result: '',
            },
        [resultDraftById],
    );

    const timelineEvents = useMemo(() => {
        const raw = executionData?.timelineEvents;
        return Array.isArray(raw)
            ? (raw as Array<{
                  date?: string;
                  title?: string;
                  description?: string;
                  metadata?: Record<string, unknown>;
              }>)
            : [];
    }, [executionData]);

    const getDisplayContext = useCallback(
        (decision: Record<string, unknown>) =>
            buildCommunicationDisplayContext(decision, decisionRows, timelineEvents),
        [decisionRows, timelineEvents],
    );

    return {
        exId: storageExecutionId,
        decisionRows,
        commDecisions,
        targetDirectorate,
        setTargetDirectorate,
        communicationDetails,
        setCommunicationDetails,
        letterDate,
        setLetterDate,
        creating,
        saving,
        resultDraftById,
        setResultDraftById,
        awaitingUiById,
        setAwaitingUiById,
        awaitingExecutor,
        awaitingResultDecisions,
        logDecisions,
        handleCreate,
        openAppeals,
        saveCommunicationResult,
        dismissFollowup,
        confirmNoResponse,
        confirmResendLetter,
        markDelivered,
        saveInlineAccordionResult,
        getDraftForDecision,
        getDisplayContext,
    };
}
