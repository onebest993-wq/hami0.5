import React, { useCallback } from 'react';
import {
    archiveExecutiveDetentionCycleDecisions,
    closePersonalCoerciveSubtypeDecisionCycle,
    dispatchDecisionsReload,
} from '@/app/utils/executorSeizureDecisionQueue';
import { formatDateToLocalYmd, getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    appendImplicitForcedBringBroughtPatch,
    buildExecutiveDetentionReleasePatch,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import { CoerciveSubsectionFold } from '../../chrome/CoerciveSubsectionFold';
import type { PersonalCoerciveSubmitCore } from './submitCoreTypes';

import type { PersonalCoerciveActionsCtx } from './types';
import { recordExecutiveDetentionJudgeOutcome as recordExecutiveDetentionJudgeOutcomeImpl } from './recordExecutiveDetentionJudgeOutcome';

export function usePersonalCoerciveDetentionJudgeActions(ctx: PersonalCoerciveActionsCtx, core: Pick<PersonalCoerciveSubmitCore, 'goBackToPersonalCoerciveHub'>) {
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

    const { goBackToPersonalCoerciveHub } = core;

    const buildReleaseDetentionPatch = useCallback(
        (): Record<string, unknown> => buildExecutiveDetentionReleasePatch(),
        [],
    );

    const recordExecutiveDetentionJudgeOutcome = useCallback(
        (
            outcome: 'approved' | 'rejected',
            now: string,
            rejectionReason?: string,
            opts?: { suppressToast?: boolean },
        ): boolean =>
            recordExecutiveDetentionJudgeOutcomeImpl({
                outcome,
                now,
                rejectionReason,
                opts,
                detentionJudgeEligibleDecisionId,
                findGoverningDossierDecisionId,
                exId,
                showToast,
                activeDebtorKey,
                persistExecutionMerge,
                applyOptimisticPersistPatch,
                primaryDebtorKey,
                setDossierInlineResolved,
                pushTimelineEvent,
                nextTimelineId,
                debtorTimelineMeta,
                setLocalDecisionsTick,
                setJudgeDetailsOpen,
                setDetentionRejectionOpen,
                setDetentionRejectionReason,
                goBackToPersonalCoerciveHub,
                onOpenDecisions,
            }),
        [
            activeDebtorKey,
            applyOptimisticPersistPatch,
            debtorTimelineMeta,
            detentionJudgeEligibleDecisionId,
            exId,
            findGoverningDossierDecisionId,
            goBackToPersonalCoerciveHub,
            nextTimelineId,
            onOpenDecisions,
            persistExecutionMerge,
            pushTimelineEvent,
            showToast,
        ],
    );

    const startDetentionFourMonths = (opts?: {
        markCustody?: boolean;
        markArrested?: boolean;
        suppressToast?: boolean;
    }): boolean => {
        if (coerciveWriteLocked) {
            if (!opts?.suppressToast) {
                showToast('لا يمكن التسجيل — المحضر مقفول أو في وضع أرشيف.', 'warning');
            }
            return false;
        }
        if (judgeSync.blocksFieldwork) {
            if (!opts?.suppressToast) {
                showToast(
                    judgeSync.followupBlock?.message ??
                        'لا يمكن بدء مدة الحبس — الطلب موقوف بسبب التظلم أو الطعن. أكمل المسار من مركز القرارات.',
                    'warning',
                    {
                        action: {
                            label: 'مركز القرارات',
                            onClick: () =>
                                onOpenDecisions({
                                    tab: judgeSync.decisionsNav.decisionsTab,
                                    decisionId: judgeSync.decisionId ?? undefined,
                                }),
                        },
                    }
                );
            }
            return false;
        }
        const start = new Date();
        const end = new Date(start);
        end.setMonth(end.getMonth() + 4);
        const until = formatDateToLocalYmd(end);
        let patch: Record<string, unknown> = {
            debtor_executive_detention_active: true,
            executive_detention_days_total: 120,
            executive_detention_until: until,
            executive_detention_reminder_sent: false,
            executive_dossier_phase: 'detention_active',
            executive_detention_released_or_closed_at: null,
            personal_coercive_cycle_closed_at: null,
        };
        patch = appendImplicitForcedBringBroughtPatch(patch, executionDataEffective, forced.approved);
        if (opts?.markArrested) {
            patch.debtorArrested = true;
        }
        if (opts?.markCustody || !inAbsentia) {
            patch.debtor_arrest_warrant_cleared_after_custody = true;
        }
        const persisted = persistExecutionMerge(patch);
        if (persisted === false) {
            if (!opts?.suppressToast) {
                showToast('تعذّر تفعيل مدة الحبس — أعِد المحاولة.', 'error');
            }
            return false;
        }
        applyOptimisticPersistPatch(patch);
        const now = new Date().toISOString();
        const timelineOk = pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: now,
                title: inAbsentia ? '🔒 بدء مدة الحبس التنفيذي (4 أشهر) — غيابي' : '🔒 بدء مدة الحبس التنفيذي (4 أشهر)',
                description: `تُحتسب مدة الحبس التنفيذي تلقائياً 4 أشهر حتى ${until}.`,
                type: 'coercive',
                source: 'محضر المتابعة',
                metadata: debtorTimelineMeta,
            },
            { mergePatch: patch }
        );
        if (timelineOk === false) {
            if (!opts?.suppressToast) {
                showToast('تم تفعيل الحبس لكن تعذّر تحديث السجل الزمني — أعِد المحاولة.', 'warning');
            }
            return false;
        }
        if (exId) {
            closePersonalCoerciveSubtypeDecisionCycle({
                executionId: exId,
                subtype: 'executive_detention_judge',
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
            setLocalDecisionsTick((n) => n + 1);
        }
        setJudgeDetailsOpen(false);
        if (!opts?.suppressToast) {
            showToast('تم تفعيل العداد لمدة 4 أشهر.', 'success');
        }
        return true;
    };

    const handleApproveExecutiveDetention = () => {
        if (coerciveWriteLocked) return;
        const now = new Date().toISOString();
        const judgeOk = recordExecutiveDetentionJudgeOutcome('approved', now, undefined, {
            suppressToast: true,
        });
        if (!judgeOk) return;
        const detentionOk = startDetentionFourMonths({
            markCustody: true,
            markArrested: dossierAbsentiaPathOpen,
            suppressToast: true,
        });
        if (!detentionOk) return;
        showToast('تم حبس المدين تنفيذاً — المدة 4 أشهر. يمكنك إخلاء السبيل عند الحاجة.', 'success');
    };

    const confirmReleaseDetention = (reason: string) => {
        if (releaseConfirmBusy) return;
        if (coerciveWriteLocked) {
            showToast('لا يمكن التسجيل — المحضر مقفول أو في وضع أرشيف.', 'warning');
            return;
        }
        const trimmedReason = String(reason || '').trim();
        if (!trimmedReason) {
            showToast('سبب إخلاء السبيل مطلوب.', 'warning');
            return;
        }
        setReleaseConfirmBusy(true);
        const nowIso = new Date().toISOString();
        const releasePatch = {
            ...buildReleaseDetentionPatch(),
            executive_detention_release_reason: trimmedReason,
        };
        const persisted = persistExecutionMerge(releasePatch);
        if (persisted === false) {
            showToast('تعذّر حفظ إخلاء السبيل — أعِد المحاولة.', 'error');
            setReleaseConfirmBusy(false);
            return;
        }
        applyOptimisticPersistPatch(releasePatch);
        const timelineOk = pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: nowIso,
                title: 'تم إخلاء سبيل المدين — انتهاء مسار الحبس التنفيذي',
                description: `سبب إخلاء السبيل: ${trimmedReason}`,
                type: 'coercive',
                source: 'محضر المتابعة',
                metadata: debtorTimelineMeta,
            },
            { mergePatch: releasePatch }
        );
        if (timelineOk === false) {
            showToast('تم إخلاء السبيل لكن تعذّر تحديث السجل الزمني — أعِد المحاولة.', 'warning');
        }
        if (exId) {
            archiveExecutiveDetentionCycleDecisions({
                executionId: exId,
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
            closePersonalCoerciveSubtypeDecisionCycle({
                executionId: exId,
                subtype: 'forced_bring_in',
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
        }
        setForcedInlineResolved(null);
        setOptimisticForcedOutcome(null);
        setDossierInlineResolved(null);
        setDetentionRejectionOpen(false);
        setDetentionRejectionReason('');
        setReleaseReasonOpen(false);
        setReleaseReason('');
        setReleaseConfirmOpen(false);
        goBackToPersonalCoerciveHub();
        setLocalDecisionsTick((n) => n + 1);
        dispatchDecisionsReload();
        showToast('تم إخلاء السبيل — يمكنك تقديم طلب عرض إضبارة جديد عند الحاجة.', 'success');
        setReleaseConfirmBusy(false);
    };

    const renderJudgeRejectedResubmitBlock = () => {
        const judgeDecisionId = judgeDecisionIdStored;
        if (!judgeRejectedResubmitVisible) {
            return null;
        }
        return (
            <CoerciveSubsectionFold flat title="رُفض قاضي البداءة حبس المدين" titleClassName="text-rose-200">
                {String(executionData?.executive_detention_judge_rejection_reason ?? '').trim() ? (
                    <p className="text-[10px] leading-relaxed text-rose-200/90">
                        سبب الرفض: {String(executionData?.executive_detention_judge_rejection_reason).trim()}
                    </p>
                ) : null}
                <p className="text-[10px] leading-relaxed text-rose-200/75">
                    قرار القاضي مستقل عن المنفذ — يمكنك التمييز من مركز القرارات أو تسجيل «لا حاجة للطعن».
                </p>
                {renderWaiveInitialAppeal(judgeDecisionId)}
                <button
                    type="button"
                    className="w-full rounded-xl border border-amber-500/35 bg-amber-500/10 py-2 text-[10px] font-bold text-amber-100 hover:bg-amber-500/15"
                    onClick={() =>
                        onOpenDecisions({
                            tab: 'previous',
                            decisionId: judgeDecisionId,
                        })
                    }
                >
                    مركز القرارات — قرار القاضي والتمييز
                </button>
            </CoerciveSubsectionFold>
        );
    };

    return {
        buildReleaseDetentionPatch,
        recordExecutiveDetentionJudgeOutcome,
        startDetentionFourMonths,
        handleApproveExecutiveDetention,
        confirmReleaseDetention,
        renderJudgeRejectedResubmitBlock,
    };
}
