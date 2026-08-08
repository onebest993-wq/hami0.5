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
    buildNoResponseConfirmationDetails,
    isAwaitingCommunicationResult,
    isCommunicationDecision,
} from '../communicationDecisionModel';
import { validateCommunicationResultDraft } from '../../helpers/communicationResultValidation';
import type {
    CommunicationAwaitingUiState,
    CommunicationResultDraft,
    CommunicationsTabProps,
} from './communicationsTabTypes';

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
        return commDecisions.filter((d: unknown) => isAwaitingCommunicationResult(d, decisionRows));
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
    }, [commDecisions, storageExecutionId]);

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
                ...executorDecisionRowHubDefaults(),
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
    }, [communicationDetails, storageExecutionId, nextTimelineId, pushTimelineEvent, letterDate, showToast, targetDirectorate]);

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

    const saveCommunicationResult = useCallback(
        (decisionId: string, directorate: string, draft: CommunicationResultDraft) => {
            if (saving) return;
            if (!storageExecutionId || !decisionId) {
                showToast('تعذّر الحفظ — معرّف الإضبارة غير جاهز', 'error');
                return;
            }
            const validation = validateCommunicationResultDraft(draft);
            if (!validation.ok) {
                showToast(validation.message, 'warning');
                return;
            }
            setSaving(true);
            const now = new Date().toISOString();
            const ref = [String(draft.letterDate || '').trim(), String(draft.letterNum || '').trim()]
                .filter(Boolean)
                .join(' ');
            const patch = {
                deputationTargetDirectorate: String(draft.purpose || '').trim(),
                deputationReferralDate: ref || undefined,
                deputationResultDetails: String(draft.result || '').trim(),
                deputationClosed: true,
                deputationSent: true,
                deputationNoResponseConfirmed: false,
            } as Record<string, unknown>;
            const ok = applyCommunicationDecisionPatch(decisionId, patch);
            if (!ok) {
                setSaving(false);
                showToast('تعذّر حفظ النتيجة — أعد المحاولة أو افتح مركز القرارات.', 'error');
                return;
            }
            try {
                pushTimelineEvent({
                    id: nextTimelineId(),
                    type: 'communication',
                    title: `نتيجة مخاطبة — ${directorate}`,
                    description: [ref ? `مرجع: ${ref}` : '', String(draft.result || '').trim()]
                        .filter(Boolean)
                        .join('\n'),
                    date: now.slice(0, 10),
                    timestamp: now,
                    source: 'محضر المتابعة',
                    metadata: {
                        timelineThreadKey: `executor_decision:${decisionId}`,
                        decisionRowId: decisionId,
                    },
                });
            } catch {
                /* ignore */
            }
            setAwaitingUiById((prev) => {
                const next = { ...prev };
                delete next[decisionId];
                return next;
            });
            setSaving(false);
            showToast('✅ تم حفظ النتيجة الواردة', 'success');
        },
        [
            applyCommunicationDecisionPatch,
            storageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            saving,
            showToast,
        ],
    );

    const dismissFollowup = useCallback(
        (decisionId: string) => {
            if (saving) return;
            if (!storageExecutionId || !decisionId) {
                showToast('تعذّر التجاهل — معرّف الإضبارة غير جاهز', 'error');
                return;
            }
            setSaving(true);
            const patch = {
                deputationFollowupDismissed: true,
                deputationClosed: true,
                deputationResultDetails: 'تم تجاهل متابعة نتيجة المخاطبة.',
            } as Record<string, unknown>;
            const ok = applyCommunicationDecisionPatch(decisionId, patch);
            if (!ok) {
                setSaving(false);
                showToast('تعذّر التجاهل — أعد المحاولة أو افتح مركز القرارات.', 'error');
                return;
            }
            setAwaitingUiById((prev) => {
                const next = { ...prev };
                delete next[decisionId];
                return next;
            });
            setSaving(false);
            showToast('تم تجاهل متابعة النتيجة', 'info');
        },
        [applyCommunicationDecisionPatch, storageExecutionId, saving, showToast],
    );

    const confirmNoResponse = useCallback(
        (
            decisionId: string,
            directorate: string,
            letterDateForLetter: string,
            options?: { editedLetterDate?: string; editedBody?: string },
        ) => {
            if (saving) return;
            if (!storageExecutionId || !decisionId) {
                showToast('تعذّر التسجيل — معرّف الإضبارة غير جاهز', 'error');
                return;
            }
            setSaving(true);
            const confirmationDate = getLocalTodayYmd();
            const previousLetterDate = String(
                options?.editedLetterDate || letterDateForLetter || '',
            ).trim();
            const details = buildNoResponseConfirmationDetails({
                previousLetterDate,
                confirmationDate,
            });
            const patch: Record<string, unknown> = {
                deputationNoResponseConfirmed: true,
                deputationReferralDate: confirmationDate,
                deputationResultDetails: details,
            };
            const editedBody = String(options?.editedBody || '').trim();
            if (options?.editedLetterDate) {
                patch.date = options.editedLetterDate;
            }
            if (editedBody) {
                patch.body = `بتاريخ ${previousLetterDate}:\n\n${editedBody}`;
            }
            const ok = applyCommunicationDecisionPatch(decisionId, patch);
            if (!ok) {
                setSaving(false);
                showToast('تعذّر حفظ التأكيد — أعد المحاولة أو افتح مركز القرارات.', 'error');
                return;
            }
            try {
                const now = new Date().toISOString();
                pushTimelineEvent({
                    id: nextTimelineId(),
                    type: 'communication',
                    title: `تأكيد — عدم ورود إجابة — ${directorate}`,
                    description: details,
                    date: now.slice(0, 10),
                    timestamp: now,
                    source: 'محضر المتابعة',
                    metadata: { timelineThreadKey: `executor_decision:${decisionId}` },
                });
            } catch {
                /* ignore */
            }
            setAwaitingUiById((prev) => ({
                ...prev,
                [decisionId]: {
                    noResponseFlow: undefined,
                    confirmingResend: false,
                    responseFormOpen: false,
                },
            }));
            setSaving(false);
            showToast('تم تسجيل عدم ورود الإجابة', 'success');
        },
        [
            applyCommunicationDecisionPatch,
            storageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            saving,
            showToast,
        ],
    );

    const confirmResendLetter = useCallback(
        (decisionId: string, directorate: string) => {
            if (saving) return;
            if (!storageExecutionId || !decisionId) {
                showToast('تعذّر التسجيل — معرّف الإضبارة غير جاهز', 'error');
                return;
            }
            setSaving(true);
            const resendDate = getLocalTodayYmd();
            const patch = {
                deputationNoResponseConfirmed: false,
                deputationClosed: false,
                deputationSent: true,
                deputationReferralDate: undefined,
                date: resendDate,
            } as Record<string, unknown>;
            const ok = applyCommunicationDecisionPatch(decisionId, patch);
            if (!ok) {
                setSaving(false);
                showToast('تعذّر تأكيد الإرسال — أعد المحاولة أو افتح مركز القرارات.', 'error');
                return;
            }
            try {
                const now = new Date().toISOString();
                pushTimelineEvent({
                    id: nextTimelineId(),
                    type: 'communication',
                    title: `إعادة إرسال كتاب — ${directorate}`,
                    description: `تم تأكيد إرسال الكتاب مرة أخرى بتاريخ ${resendDate}`,
                    date: now.slice(0, 10),
                    timestamp: now,
                    source: 'محضر المتابعة',
                    metadata: { timelineThreadKey: `executor_decision:${decisionId}` },
                });
            } catch {
                /* ignore */
            }
            setAwaitingUiById((prev) => ({
                ...prev,
                [decisionId]: {
                    confirmingResend: false,
                    noResponseFlow: undefined,
                    responseFormOpen: false,
                },
            }));
            setSaving(false);
            showToast('تم تأكيد إرسال الكتاب — تابع نتيجة المخاطبة.', 'success');
        },
        [
            applyCommunicationDecisionPatch,
            storageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            saving,
            showToast,
        ],
    );

    const markDelivered = useCallback(
        (decisionId: string) => {
            if (saving) return;
            if (!storageExecutionId || !decisionId) {
                showToast('تعذّر تسجيل التسليم — معرّف الإضبارة غير جاهز', 'error');
                return;
            }
            setSaving(true);
            const ok = applyCommunicationDecisionPatch(decisionId, { deputationSent: true });
            setSaving(false);
            if (!ok) {
                showToast('تعذّر تسجيل التسليم — أعد المحاولة أو افتح مركز القرارات.', 'error');
                return;
            }
            showToast('تم تسجيل التسليم', 'success');
        },
        [applyCommunicationDecisionPatch, storageExecutionId, saving, showToast],
    );

    const saveInlineAccordionResult = useCallback(
        (decisionId: string, directorate: string, draft: CommunicationResultDraft) => {
            if (saving) return;
            if (!storageExecutionId || !decisionId) {
                showToast('تعذّر الحفظ — معرّف الإضبارة غير جاهز', 'error');
                return;
            }
            const validation = validateCommunicationResultDraft(draft);
            if (!validation.ok) {
                showToast(validation.message, 'warning');
                return;
            }
            setSaving(true);
            const now = new Date().toISOString();
            const ref = [String(draft.letterDate || '').trim(), String(draft.letterNum || '').trim()]
                .filter(Boolean)
                .join(' ');
            const patch = {
                deputationTargetDirectorate: String(draft.purpose || '').trim(),
                deputationReferralDate: ref || undefined,
                deputationResultDetails: String(draft.result || '').trim(),
                deputationClosed: true,
            } as Record<string, unknown>;
            const ok = applyCommunicationDecisionPatch(decisionId, patch);
            if (!ok) {
                setSaving(false);
                showToast('تعذّر حفظ النتيجة — أعد المحاولة أو افتح مركز القرارات.', 'error');
                return;
            }
            try {
                const refDisplay = [String(draft.letterDate || '').trim(), String(draft.letterNum || '').trim()]
                    .filter(Boolean)
                    .join(' · ');
                pushTimelineEvent({
                    id: nextTimelineId(),
                    type: 'communication',
                    title: `نتيجة مخاطبة — ${directorate}`,
                    description: [refDisplay ? `مرجع: ${refDisplay}` : '', String(draft.result || '').trim()]
                        .filter(Boolean)
                        .join('\n'),
                    date: now.slice(0, 10),
                    timestamp: now,
                    source: 'محضر المتابعة',
                    metadata: {
                        timelineThreadKey: `executor_decision:${decisionId}`,
                        decisionRowId: decisionId,
                    },
                });
            } catch {
                /* ignore */
            }
            setSaving(false);
            showToast('✅ تم حفظ النتيجة الواردة', 'success');
        },
        [
            applyCommunicationDecisionPatch,
            storageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            saving,
            showToast,
        ],
    );

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
        return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
    }, [executionData]);

    const getDisplayContext = useCallback(
        (decision: unknown) =>
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
