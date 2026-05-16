import { useMemo, useCallback, useEffect } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import {
    buildExecutionCaseSnapshot,
    shouldAutoRunCopilot,
    snapshotFingerprint,
} from '@/app/utils/executionCopilot';
import { executionRowAppealPipelineActive } from '@/app/utils/executionDecisionAppealActive';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { supabase } from '@/app/lib/supabase-client';

interface UseExecutionAICopilotParams {
    executionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId: string;
    decisionsReloadEpoch: number;
    activeCaseNotesLog: any[];
    activeTimelineEvents: any[];
    activeCaseTasksPending: any[];
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    nextTimelineId: () => string;
    showToast: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
    setTimelineEvents: React.Dispatch<React.SetStateAction<any[]>>;
    setCaseNotesLog: React.Dispatch<React.SetStateAction<any[]>>;
    setCaseTasksPending: React.Dispatch<React.SetStateAction<any[]>>;
    aiCopilotEnabled: boolean;
    setAiCopilotEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    aiCopilotLoading: boolean;
    setAiCopilotLoading: React.Dispatch<React.SetStateAction<boolean>>;
    aiCopilotError: string | null;
    setAiCopilotError: React.Dispatch<React.SetStateAction<string | null>>;
    aiCopilotResult: any;
    setAiCopilotResult: React.Dispatch<React.SetStateAction<any>>;
    aiCopilotLastFingerprintRef: React.MutableRefObject<string>;
    aiCopilotLastRunAtRef: React.MutableRefObject<number>;
    aiCopilotNetworkBackoffUntilRef: React.MutableRefObject<number>;
    aiCopilotNetworkWarningShownRef: React.MutableRefObject<boolean>;
}

export function useExecutionAICopilot(params: UseExecutionAICopilotParams) {
    const {
        executionData,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        activeCaseNotesLog,
        activeTimelineEvents,
        activeCaseTasksPending,
        persistExecutionMerge,
        nextTimelineId,
        showToast,
        setTimelineEvents,
        setCaseNotesLog,
        setCaseTasksPending,
        aiCopilotEnabled,
        setAiCopilotEnabled,
        aiCopilotLoading,
        setAiCopilotLoading,
        aiCopilotError,
        setAiCopilotError,
        aiCopilotResult,
        setAiCopilotResult,
        aiCopilotLastFingerprintRef,
        aiCopilotLastRunAtRef,
        aiCopilotNetworkBackoffUntilRef,
        aiCopilotNetworkWarningShownRef,
    } = params;

    const executionCopilotDecisions = useMemo(
        () => readExecutorDecisionsArray(decisionsStorageExecutionId),
        [decisionsStorageExecutionId, decisionsReloadEpoch]
    );

    const firstActiveAppealDecisionId = useMemo(() => {
        const rows = readExecutorDecisionsArray(decisionsStorageExecutionId);
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (executionRowAppealPipelineActive(r)) {
                const id = r.id;
                if (typeof id === 'string' && id) return id;
            }
        }
        return null;
    }, [decisionsStorageExecutionId, decisionsReloadEpoch]);

    const copilotNotesSignature = useMemo(
        () => activeCaseNotesLog.map((n: any) => `${n?.id || ''}:${n?.title || ''}:${n?.createdAt || ''}`).join('|'),
        [activeCaseNotesLog]
    );

    const copilotEventsSignature = useMemo(
        () => activeTimelineEvents.map((e: any) => `${e?.id || ''}:${e?.title || ''}:${e?.timestamp || e?.date || ''}`).join('|'),
        [activeTimelineEvents]
    );

    const executionCopilotSnapshot = useMemo(
        () =>
            buildExecutionCaseSnapshot({
                executionData: executionData ?? null,
                timelineEvents: activeTimelineEvents,
                caseNotesLog: activeCaseNotesLog,
                caseTasksPending: activeCaseTasksPending,
                decisions: executionCopilotDecisions as Array<Record<string, unknown>>,
            }),
        [
            executionData,
            activeTimelineEvents,
            activeCaseNotesLog,
            activeCaseTasksPending,
            executionCopilotDecisions,
            copilotNotesSignature,
            copilotEventsSignature,
        ]
    );

    const executionCopilotFingerprint = useMemo(
        () => snapshotFingerprint(executionCopilotSnapshot),
        [executionCopilotSnapshot]
    );

    const runExecutionAICopilot = useCallback(
        async (trigger: 'manual' | 'auto' = 'manual') => {
            if (!executionData?.id || !executionCopilotSnapshot) return;
            if (aiCopilotLoading && trigger === 'auto') return;
            if (trigger === 'auto' && Date.now() < aiCopilotNetworkBackoffUntilRef.current) return;
            setAiCopilotLoading(true);
            setAiCopilotError(null);
            try {
                const creditorName = String(
                    executionData?.creditors?.[0]?.fullName || executionData?.creditors?.[0]?.name || ''
                ).trim();
                const debtorName = String(
                    executionData?.debtors?.[0]?.fullName || executionData?.debtors?.[0]?.name || ''
                ).trim();
                const amountForMask =
                    Number(executionData?.remainingDebt ?? 0) ||
                    Number(executionData?.debtAmount ?? 0);
                const { anonymizeCaseData, deanonymizeResponse } = await import('@/app/utils/anonymizer');
                const anonymizedSnapshot = anonymizeCaseData(executionCopilotSnapshot, {
                    creditorName,
                    debtorName,
                    debtAmount: amountForMask,
                });
                const { data, error } = await supabase.functions.invoke('execution-copilot', {
                    body: {
                        mode: 'hybrid',
                        trigger,
                        snapshot: anonymizedSnapshot,
                    },
                });
                if (error) {
                    throw new Error(error.message || 'فشل استدعاء خدمة الذكاء');
                }

                const payload = deanonymizeResponse(data || {}, {
                    creditorName,
                    debtorName,
                    debtAmount: amountForMask,
                });
                const normalized = {
                    summary: String(
                        payload.summary || 'تم تحليل الإضبارة بناءً على الوقائع الحالية والمصادر القانونية.'
                    ),
                    confidence: Number(payload.confidence || 0),
                    generatedAt: String(payload.generatedAt || new Date().toISOString()),
                    suggestions: Array.isArray(payload.suggestions)
                        ? payload.suggestions
                        : Array.isArray(payload.nextActions)
                          ? payload.nextActions
                          : [],
                };
                setAiCopilotResult(normalized);
                aiCopilotLastFingerprintRef.current = executionCopilotFingerprint;
                aiCopilotLastRunAtRef.current = Date.now();
                persistExecutionMerge({
                    ai_copilot_enabled: true,
                    ai_copilot_mode: 'hybrid',
                    ai_copilot_last_run_at: normalized.generatedAt,
                    ai_copilot_last_result: normalized,
                });
                if (trigger === 'manual') {
                    setTimelineEvents((prev: any[]) => [
                        {
                            id: nextTimelineId(),
                            type: 'other',
                            date: normalized.generatedAt,
                            timestamp: normalized.generatedAt,
                            title: 'تحليل مُحلل حامي الذكي للإضبارة',
                            description: normalized.summary,
                            source: 'مُحلل حامي الذكي',
                        },
                        ...prev,
                    ]);
                }
                aiCopilotNetworkWarningShownRef.current = false;
            } catch (err: any) {
                const rawMessage = String(err?.message || 'تعذر تشغيل الذكاء الاصطناعي حالياً.');
                const isNetworkOrCors =
                    rawMessage.includes('Failed to send a request to the Edge Function') ||
                    rawMessage.includes('ERR_FAILED') ||
                    rawMessage.includes('CORS');
                if (isNetworkOrCors) {
                    aiCopilotNetworkBackoffUntilRef.current = Date.now() + 15000;
                    setAiCopilotResult(null);
                    setAiCopilotError(
                        'تعذر الاتصال بخدمة التحليل (CORS/Network). سيتم الاستمرار في المزامنة تلقائياً عند عودة الاتصال.'
                    );
                    if (trigger === 'manual' || !aiCopilotNetworkWarningShownRef.current) {
                        showToast(
                            'خدمة المُحلل الذكي غير متاحة الآن بسبب الاتصال. أعد المحاولة بعد قليل.',
                            'warning'
                        );
                        aiCopilotNetworkWarningShownRef.current = true;
                    }
                } else {
                    setAiCopilotResult(null);
                    setAiCopilotError(rawMessage);
                    if (trigger === 'manual') showToast(rawMessage, 'warning');
                }
            } finally {
                setAiCopilotLoading(false);
            }
        },
        [
            executionData?.id,
            executionCopilotSnapshot,
            executionCopilotFingerprint,
            aiCopilotLoading,
            aiCopilotNetworkBackoffUntilRef,
            aiCopilotLastFingerprintRef,
            aiCopilotLastRunAtRef,
            aiCopilotNetworkWarningShownRef,
            persistExecutionMerge,
            nextTimelineId,
            showToast,
            setAiCopilotLoading,
            setAiCopilotError,
            setAiCopilotResult,
            setTimelineEvents,
        ]
    );

    const triggerCopilotAfterLocalChange = useCallback(() => {
        if (!aiCopilotEnabled) return;
        aiCopilotNetworkBackoffUntilRef.current = Date.now();
        window.setTimeout(() => {
            void runExecutionAICopilot('auto');
        }, 150);
    }, [aiCopilotEnabled, aiCopilotNetworkBackoffUntilRef, runExecutionAICopilot]);

    useEffect(() => {
        if (!executionCopilotSnapshot) return;
        if (
            !shouldAutoRunCopilot({
                enabled: aiCopilotEnabled,
                fingerprint: executionCopilotFingerprint,
                lastFingerprint: aiCopilotLastFingerprintRef.current,
                lastRunAt: aiCopilotLastRunAtRef.current,
                cooldownMs: 3000,
            })
        ) {
            return;
        }
        const timer = setTimeout(() => {
            void runExecutionAICopilot('auto');
        }, 500);
        return () => clearTimeout(timer);
    }, [
        aiCopilotEnabled,
        executionCopilotSnapshot,
        executionCopilotFingerprint,
        copilotNotesSignature,
        copilotEventsSignature,
        aiCopilotLastFingerprintRef,
        aiCopilotLastRunAtRef,
        runExecutionAICopilot,
    ]);

    const applyCopilotSuggestionAsNote = useCallback(
        (suggestion: any) => {
            const now = new Date().toISOString();
            const note = {
                id: nextTimelineId(),
                title: `اقتراح من المُحلل: ${String(suggestion?.title || 'إجراء مقترح')}`,
                body: String(suggestion?.rationale || ''),
                createdAt: now,
            };
            const nextNotes = [note, ...activeCaseNotesLog];
            setCaseNotesLog(nextNotes);
            const nextTimeline = [
                {
                    id: nextTimelineId(),
                    type: 'other',
                    date: now,
                    timestamp: now,
                    title: 'حفظ اقتراح مُحلل حامي الذكي كملاحظة',
                    description: note.title,
                    source: 'مُحلل حامي الذكي',
                },
                ...activeTimelineEvents,
            ];
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({ caseNotesLog: nextNotes, timelineEvents: nextTimeline });
            showToast('تم حفظ الاقتراح كملاحظة.', 'success');
        },
        [
            nextTimelineId,
            activeCaseNotesLog,
            activeTimelineEvents,
            persistExecutionMerge,
            showToast,
            setCaseNotesLog,
            setTimelineEvents,
        ]
    );

    const applyCopilotSuggestionAsTask = useCallback(
        (suggestion: any) => {
            const now = new Date().toISOString();
            const due = String(suggestion?.deadline || '').trim() || now.slice(0, 10);
            const task = {
                id: nextTimelineId(),
                title: String(suggestion?.title || 'مهمة مقترحة'),
                body: String(suggestion?.rationale || ''),
                dueDate: due,
                createdAt: now,
            };
            const nextTasks = [task, ...activeCaseTasksPending];
            setCaseTasksPending(nextTasks);
            const nextTimeline = [
                {
                    id: nextTimelineId(),
                    type: 'other',
                    date: now,
                    timestamp: now,
                    title: 'تحويل اقتراح مُحلل حامي الذكي إلى مهمة',
                    description: `${task.title}\n📅 ${due}`,
                    source: 'مُحلل حامي الذكي',
                },
                ...activeTimelineEvents,
            ];
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({ caseTasksPending: nextTasks, timelineEvents: nextTimeline });
            showToast('تمت إضافة الاقتراح كمهمة.', 'success');
        },
        [
            nextTimelineId,
            activeCaseTasksPending,
            activeTimelineEvents,
            persistExecutionMerge,
            showToast,
            setCaseTasksPending,
            setTimelineEvents,
        ]
    );

    const copyCopilotDraftText = useCallback(
        async (suggestion: any) => {
            const draftText = String(suggestion?.draftText || '').trim();
            if (!draftText) {
                showToast('لا يوجد نص طلب جاهز داخل هذا الاقتراح.', 'warning');
                return;
            }
            try {
                if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(draftText);
                } else {
                    throw new Error('Clipboard API unavailable');
                }
                const now = new Date().toISOString();
                const nextTimeline = [
                    {
                        id: nextTimelineId(),
                        type: 'other',
                        date: now,
                        timestamp: now,
                        title: 'نسخ طلب جاهز (مُحلل حامي)',
                        description: String(suggestion?.title || 'طلب قانوني مولد'),
                        source: 'مُحلل حامي الذكي',
                    },
                    ...activeTimelineEvents,
                ];
                setTimelineEvents(nextTimeline);
                persistExecutionMerge({ timelineEvents: nextTimeline });
                showToast('تم نسخ نص الطلب الجاهز للحافظة.', 'success');
            } catch {
                showToast('تعذّر النسخ التلقائي. يمكنك إعادة المحاولة.', 'warning');
            }
        },
        [activeTimelineEvents, nextTimelineId, persistExecutionMerge, showToast, setTimelineEvents]
    );

    return {
        executionCopilotDecisions,
        firstActiveAppealDecisionId,
        executionCopilotSnapshot,
        executionCopilotFingerprint,
        runExecutionAICopilot,
        triggerCopilotAfterLocalChange,
        applyCopilotSuggestionAsNote,
        applyCopilotSuggestionAsTask,
        copyCopilotDraftText,
    };
}
