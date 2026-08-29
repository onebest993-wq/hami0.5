import { useCallback, useEffect, type ReactNode } from 'react';
import {
    appendPersonalCoerciveByExecutorOrder,
    appendPersonalCoerciveExecutorRequest,
    DECISIONS_RELOAD_EVENT,
    dispatchDecisionsReload,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    buildDebtorTravelBanCycleWithdrawnPatch,
    buildDebtorTravelBanWithdrawnPatch,
} from '@/app/utils/coerciveDebtorScope';
import { buildPersonalCoerciveExecutionMerge } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import { appealSyncForRequestSubtype } from '../../utils/appealSyncMap';
import { applyPersonalCoerciveInlineResolvedResult } from './applyPersonalCoerciveInlineResolvedResult';
import {
    renderPersonalCoerciveInlineGate,
    type PersonalCoerciveActionGateKey,
} from './personalCoerciveInlineGate';

import type { PersonalCoerciveActionsCtx } from './types';

export function usePersonalCoerciveSubmitCore(ctx: PersonalCoerciveActionsCtx) {
    const {
        coerciveUiLocked,
        gracePeriodEndedFlag,
        forcedSummonAllowed,
        forcedSummonLockReason,
        executionData,
        debtorPresentEffective,
        debtRemainingIqd,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        showToast,
        onOpenDecisions,
        onOpenSummonsCenter,
        activeDebtorKey,
        primaryDebtorKey,
        isHistoricalMode,
        allDecisionRowsRef,
        appealSync,
        applyOptimisticPersistPatch,
        arrest,
        arrestStage,
        arrestSync,
        canActivateDossierAbsentiaPath,
        coerciveWriteLocked,
        confirmingKey,
        debtorNotified,
        debtorTimelineMeta,
        decisionsNavForSubtype,
        detentionJudgeEligibleDecisionId,
        detentionLaneEnded,
        dossierAbsentiaPathOpen,
        dossierCycleActive,
        dossierEffective,
        employeeDetentionRestricted,
        exId,
        exKey,
        executionDataEffective,
        findGoverningDossierDecisionId,
        findLatestDecisionIdForSubtype,
        forced,
        forcedAwaitingOutcome,
        forcedEffective,
        forcedFlowStep,
        forcedNeedsOutcomeUi,
        forcedOutcomeAbsconded,
        forcedSync,
        judgeDecisionIdStored,
        judgeRejectedResubmitVisible,
        judgeSync,
        outcome,
        relaxedPersonal,
        releaseConfirmBusy,
        renderWaiveInitialAppeal,
        scopedRequestTitle,
        sendingKey,
        setConfirmingKey,
        setDetentionRejectionOpen,
        setDetentionRejectionReason,
        setDossierInlineResolved,
        setForcedBringWithdrawBusy,
        setForcedBringWithdrawConfirmOpen,
        setForcedInlineResolved,
        setForcedOutcomePick,
        setJudgeDetailsOpen,
        setLocalDecisionsTick,
        setOptimisticForcedOutcome,
        setReleaseConfirmBusy,
        setReleaseConfirmOpen,
        setReleaseReason,
        setReleaseReasonOpen,
        setSendingKey,
        setTravelPanelOpen,
        travel,
        travelActive,
        travelBanEnforced,
        travelBanWithdrawn,
        wanted,
        warrantCustodyRecorded,
        investigationFlowStep,
        investigationSessionOpen,
        forcedBringWithdrawBusy,
        inAbsentia,
    } = ctx;

    type ActionGateKey = PersonalCoerciveActionGateKey;

    const handleExecutorInlineResolved = useCallback(
        (result: {
            ok: boolean;
            outcome?: 'approved' | 'rejected';
            personalCoerciveSubtype?: string;
            storageExecutionId?: string;
            decisionId?: string;
        }) => {
            applyPersonalCoerciveInlineResolvedResult({
                result,
                setLocalDecisionsTick,
                showToast,
                setForcedInlineResolved,
                setDossierInlineResolved,
                setForcedOutcomePick,
                setJudgeDetailsOpen,
                persistExecutionMerge,
                executionData,
                activeDebtorKey,
                primaryDebtorKey,
                exId,
            });
        },
        [
            activeDebtorKey,
            exId,
            executionData,
            persistExecutionMerge,
            primaryDebtorKey,
            setDossierInlineResolved,
            setForcedInlineResolved,
            setForcedOutcomePick,
            setJudgeDetailsOpen,
            setLocalDecisionsTick,
            showToast,
        ],
    );

    useEffect(() => {
        const bumpDecisions = () => setLocalDecisionsTick((n) => n + 1);
        const onOutcome = (e: Event) => {
            const d = (e as CustomEvent).detail ?? {};
            const evId = String(d.executionId ?? '').trim();
            const decisionId = String(d.decisionId ?? '').trim();
            const matchesPanel =
                !evId ||
                !exId ||
                evId === exId ||
                (decisionId &&
                    allDecisionRowsRef.current.some(
                        (r) => String((r as { id?: string }).id ?? '') === decisionId,
                    ));
            if (!matchesPanel) return;
            const subtype = String(d.personalCoerciveSubtype ?? '').trim() as PersonalCoerciveSubtype;
            const outcome = String(d.outcome ?? '').trim();
            const skipPanelMerge =
                subtype === 'executive_dossier_presentation' ||
                subtype === 'executive_detention' ||
                subtype === 'executive_detention_judge';
            if (
                !skipPanelMerge &&
                subtype &&
                (outcome === 'approved' || outcome === 'rejected' || outcome === 'alternative')
            ) {
                const merge = buildPersonalCoerciveExecutionMerge({
                    subtype,
                    resolution: outcome as 'approved' | 'rejected' | 'alternative',
                    decisionId: String(d.decisionId ?? '').trim() || undefined,
                });
                if (Object.keys(merge).length > 0) persistExecutionMerge(merge);
            }
            if (subtype === 'forced_bring_in' && (outcome === 'approved' || outcome === 'rejected')) {
                setForcedInlineResolved(outcome);
            }
            if (
                subtype === 'executive_dossier_presentation' &&
                (outcome === 'approved' || outcome === 'rejected')
            ) {
                setDossierInlineResolved(outcome);
            }
            bumpDecisions();
        };
        window.addEventListener(DECISIONS_RELOAD_EVENT, bumpDecisions);
        window.addEventListener('hami-execution-decision-outcome', onOutcome as EventListener);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, bumpDecisions);
            window.removeEventListener('hami-execution-decision-outcome', onOutcome as EventListener);
        };
    }, [exId, persistExecutionMerge]);

    const renderInlineGate = useCallback(
        (
            key: ActionGateKey,
            onConfirm: () => void,
            opts?: { confirmLabel?: string; gateExtra?: ReactNode }
        ) =>
            renderPersonalCoerciveInlineGate({
                key,
                confirmingKey,
                sendingKey,
                setConfirmingKey,
                onConfirm,
                opts,
            }),
        [confirmingKey, sendingKey, setConfirmingKey]
    );

    const submitRequest = useCallback(
        async (
            subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype'],
            title: string,
            body: string,
            opts?: { skipTimeline?: boolean; byExecutorOrder?: boolean }
        ): Promise<string | null> => {
            if (!exId || isHistoricalMode) return null;

            const syncForSubtype = appealSyncForRequestSubtype(appealSync, subtype);
            if (syncForSubtype?.blocksSubmit) {
                const nav = syncForSubtype.decisionsNav;
                showToast(
                    syncForSubtype.followupBlock?.message ??
                        'لا يمكن إرسال طلب جديد — الطلب موقوف بسبب التظلم أو الطعن.',
                    'warning',
                    {
                        decisionsLink: true,
                        decisionId: nav.decisionId,
                        decisionsTab: nav.decisionsTab,
                    }
                );
                return null;
            }

            const byExecutorOrder = Boolean(opts?.byExecutorOrder && subtype === 'forced_bring_in');
            const submitted = byExecutorOrder
                ? appendPersonalCoerciveByExecutorOrder({
                      executionId: exId,
                      subtype,
                      title,
                      body,
                      debtorKey: activeDebtorKey,
                      primaryDebtorKey,
                  })
                : appendPersonalCoerciveExecutorRequest({
                      executionId: exId,
                      subtype,
                      title,
                      body,
                      debtorKey: activeDebtorKey,
                      primaryDebtorKey,
                  });
            if (!submitted.ok) {
                const nav = decisionsNavForSubtype(subtype);
                showToast(
                    byExecutorOrder
                        ? 'لا يمكن التفعيل — يوجد طلب أو مسار قائم لنفس الإجراء.'
                        : 'يوجد طلب مماثل قيد البت لدى المنفذ.',
                    'warning',
                    {
                        decisionsLink: true,
                        decisionId: nav.decisionId,
                        decisionsTab: nav.decisionsTab,
                    }
                );
                return null;
            }
            const decisionId = submitted.decisionId;

            const msgQueuedExecutor = byExecutorOrder
                ? 'تم تفعيل الإحضار الجبري بقرار المنفذ — سجّل النتيجة عند الجاهزية.'
                : 'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ';
            if (subtype === 'forced_bring_in') {
                setForcedInlineResolved(null);
                setForcedOutcomePick('');
                persistExecutionMerge({
                    forced_bring_in_personal_outcome: null,
                    forced_bring_in_personal_followup_logged: false,
                });
            }
            if (subtype === 'travel_ban') {
                if (executionData) {
                    persistExecutionMerge({
                        ...buildDebtorTravelBanCycleWithdrawnPatch(
                            executionData,
                            activeDebtorKey,
                            primaryDebtorKey,
                            null,
                        ),
                        ...buildDebtorTravelBanWithdrawnPatch(
                            executionData,
                            activeDebtorKey,
                            primaryDebtorKey,
                            null,
                        ),
                    });
                } else {
                    persistExecutionMerge({
                        travel_ban_withdrawn_at: null,
                        travel_ban_request_cycle_withdrawn_at: null,
                    });
                }
            }
            if (subtype === 'executive_dossier_presentation') {
                persistExecutionMerge({
                    executive_dossier_phase: null,
                    executive_detention_judge_outcome: null,
                    executive_detention_judge_eligible_decision_id: null,
                    executive_detention_judge_decision_id: null,
                    executive_detention_judge_rejection_reason: null,
                    personal_coercive_cycle_closed_at: null,
                    executive_detention_released_or_closed_at: null,
                    debtor_executive_detention_active: false,
                    executive_detention_until: null,
                    executive_detention_days_total: null,
                    executive_detention_reminder_sent: false,
                    executive_detention_request_in_absentia: dossierAbsentiaPathOpen,
                });
            }
            if (!opts?.skipTimeline) {
                const now = new Date().toISOString();
                pushTimelineEvent({
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: now,
                    title: byExecutorOrder
                        ? `⚖️ ${title} — بقرار المنفذ العدل`
                        : `📋 ${title} — قيد البت`,
                    description: body.trim() || undefined,
                    type: 'coercive',
                    source: 'محضر المتابعة',
                    metadata: {
                        ...debtorTimelineMeta,
                        ...(decisionId
                            ? { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId }
                            : {}),
                    },
                });
            }
            const nav = decisionsNavForSubtype(subtype);
            showToast(msgQueuedExecutor, 'success', {
                decisionsLink: !byExecutorOrder,
                decisionId: decisionId ?? nav.decisionId,
                decisionsTab: byExecutorOrder ? undefined : nav.decisionsTab,
            });
            setConfirmingKey(null);
            setLocalDecisionsTick((n) => n + 1);
            return decisionId || null;
        },
        [
            exId,
            nextTimelineId,
            persistExecutionMerge,
            pushTimelineEvent,
            showToast,
            activeDebtorKey,
            primaryDebtorKey,
            debtorTimelineMeta,
            isHistoricalMode,
            appealSync,
            decisionsNavForSubtype,
            dossierAbsentiaPathOpen,
        ]
    );

    const goBackToPersonalCoerciveHub = useCallback(() => {
        setConfirmingKey(null);
        setForcedOutcomePick('');
        setDetentionRejectionOpen(false);
        setDetentionRejectionReason('');
        setReleaseReasonOpen(false);
        setReleaseReason('');
        setJudgeDetailsOpen(false);
    }, []);

    const notifyDebtorFirstToast = useCallback(() => {
        showToast('يجب تبليغ المدين أولاً قبل استخدام هذا الإجراء.', 'warning', {
            action: {
                label: 'مركز التبليغات',
                onClick: () => onOpenSummonsCenter(),
            },
        });
    }, [onOpenSummonsCenter, showToast]);

    const guardSummonsGate = useCallback((): boolean => {
        if (relaxedPersonal) return true;
        if (!debtorNotified) {
            notifyDebtorFirstToast();
            return false;
        }
        if (gracePeriodEndedFlag) return true;
        showToast(
            'لا يتم التفعيل إلا بعد الإخبار بمذكرة الإخبار بالتنفيذ أو انتهاء المهلة دون حضور طوعي.',
            'warning',
            {
                action: {
                    label: 'مركز التبليغات',
                    onClick: () => onOpenSummonsCenter(),
                },
            }
        );
        return false;
    }, [
        relaxedPersonal,
        debtorNotified,
        gracePeriodEndedFlag,
        notifyDebtorFirstToast,
        onOpenSummonsCenter,
        showToast,
    ]);

    return {
        handleExecutorInlineResolved,
        renderInlineGate,
        submitRequest,
        goBackToPersonalCoerciveHub,
        notifyDebtorFirstToast,
        guardSummonsGate,
    };
}
