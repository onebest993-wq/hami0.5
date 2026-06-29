import type { TimelineEvent } from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { stripPendingLabelsFromExecutorSubject } from '@/app/utils/executorDecisionTitles';
import {
    patchExecutorDecisionRowReliable,
    resolveExecutorDecisionRowContext,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { applyDossierSpecialFollowupOutcome } from '@/app/components/lawyer/ExecutionDashboard/utils/applyDossierSpecialFollowupOutcome';
import {
    applyPersonalCoerciveExecutorOutcome,
    buildPersonalCoerciveExecutionMerge,
    dispatchExecutionTimelineAppend,
    finalizePersonalCoerciveExecutorDecision,
    persistExecutionPatch,
} from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import {
    inferExecutorApprovalDecisionType,
    type EvictionExecutorWorkflowKey,
} from '@/app/utils/executorApprovalWorkflow';
import {
    buildResidentialGraceEarlyEndApprovalMerge,
    dispatchResidentialGraceCleared,
} from '@/app/utils/residentialEvictionGrace';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import {
    DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE,
    parseOtherPartyTrackPayload,
} from '@/app/utils/otherPartyManualTrackDecisionSync';
export type ExecutorDecisionResolution = 'approved' | 'rejected' | 'alternative';

/** مصدر واحد لبتّ المنفذ — يُستدعى من المحضر ومن مركز القرارات */
export function syncExecutorDecisionResolution(input: {
    executionId: string;
    decisionId: string;
    resolution: ExecutorDecisionResolution;
    row?: Record<string, unknown> | null;
    executorNote?: string;
    /** مركز القرارات يضيف السجل بنفسه عبر useDecisionDispatcher */
    skipTimeline?: boolean;
    /** داخل محضر المتابعة — لا إشعار اختصار للقرارات */
    suppressNavigatorToast?: boolean;
}): { ok: boolean; storageExecutionId?: string; personalCoerciveSubtype?: string } {
    const executionId = String(input.executionId || '').trim();
    const decisionId = String(input.decisionId || '').trim();
    if (!executionId || !decisionId) return { ok: false, storageExecutionId: executionId };

    const scanned = resolveExecutorDecisionRowContext(executionId, decisionId);
    const resolved =
        scanned ??
        (input.row != null
            ? { row: input.row, storageExecutionId: executionId }
            : null);
    if (!resolved) return { ok: false, storageExecutionId: executionId };

    const stored = resolved.row;
    let storageExecutionId = String(resolved.storageExecutionId || executionId).trim() || executionId;

    const requestKind = String(stored.requestKind || '').trim();
    const pcSubtype = String(stored.personalCoerciveSubtype || '').trim();

    if (requestKind === 'personal_coercive' && pcSubtype) {
        if (input.resolution === 'approved' || input.resolution === 'rejected') {
            const ok = finalizePersonalCoerciveExecutorDecision({
                executionId: storageExecutionId,
                decisionId,
                outcome: input.resolution,
                personalCoerciveSubtype: pcSubtype,
                executorNote: input.executorNote,
                suppressNavigatorToast: input.suppressNavigatorToast,
            });
            return { ok, storageExecutionId, personalCoerciveSubtype: pcSubtype };
        }
        return { ok: false, storageExecutionId, personalCoerciveSubtype: pcSubtype };
    }

    const nowIso = new Date().toISOString();
    const today = getLocalTodayYmd();
    const noteTrim = String(input.executorNote || '').trim();

    const appealStatus = String(stored.appealStatus ?? '').trim();
    const hasOpenAppealPipeline =
        appealStatus === 'tadhallum_filed' ||
        appealStatus === 'tamyeez_filed' ||
        stored.appealPhase === 'grievance' ||
        stored.appealPhase === 'cassation' ||
        Boolean(stored.awaitingCassationEntryBy) ||
        stored.grievanceRejectedAwaitingTamyeez === true ||
        stored.grievanceAcceptedAwaitingDebtorTamyeez === true ||
        Boolean(stored.activeAppealCopyId) ||
        Boolean(String(stored.appealResult ?? '').trim());

    const patchRow: Record<string, unknown> = {
        executorOutcome:
            input.resolution === 'alternative'
                ? 'alternative'
                : input.resolution === 'approved'
                  ? 'approved'
                  : 'rejected',
        executorNote: noteTrim || undefined,
        resolvedAt: nowIso,
        appealStatus: 'pending',
        appealPhase: null,
        appealBaseBranch:
            input.resolution === 'rejected' ? 'after_rejection' : 'after_approval',
        status: input.resolution === 'rejected' ? 'rejected' : 'accepted',
    };
    if (hasOpenAppealPipeline) {
        patchRow.appealActor = null;
        patchRow.appealMethod = null;
        patchRow.appealResult = null;
        patchRow.awaitingCassationEntryBy = null;
        patchRow.grievanceRejectedAwaitingTamyeez = false;
        patchRow.grievanceAcceptedAwaitingDebtorTamyeez = false;
        patchRow.activeAppealCopyId = null;
        patchRow.appealWorkflowState = 'NONE';
        patchRow.grievanceOutcomeIssuedYmd = undefined;
        patchRow.cassationAppealClockYmd = undefined;
    }
    if (input.resolution === 'rejected') {
        patchRow.date = today;
    }

    const patched = patchExecutorDecisionRowReliable(storageExecutionId, decisionId, patchRow);
    if (!patched.ok) return { ok: false, storageExecutionId: patched.storageExecutionId };
    storageExecutionId = patched.storageExecutionId;

    if (!input.skipTimeline) {
        const titleBase = String(stored.title || 'طلب للمنفذ');
        const titleClean = stripPendingLabelsFromExecutorSubject(titleBase);
        const trimmedBody = String(stored.body || '').trim();
        let timelineTitle = '';
        let timelineDescription: string | undefined;
        if (input.resolution === 'approved') {
            timelineTitle = `✅ موافقة المنفذ: ${titleClean || titleBase}`;
            timelineDescription = noteTrim || undefined;
        } else if (input.resolution === 'rejected') {
            timelineTitle = `❌ رفض الطلب: ${titleClean || titleBase}`;
            timelineDescription = noteTrim || undefined;
        } else {
            timelineTitle = `🔄 قرار بديل: ${titleClean || titleBase}`;
            timelineDescription = noteTrim || undefined;
        }
        let mergePatch: Record<string, unknown> | undefined =
            requestKind === 'personal_coercive' && pcSubtype
                ? buildPersonalCoerciveExecutionMerge({
                      subtype: pcSubtype as PersonalCoerciveSubtype,
                      resolution: input.resolution,
                  })
                : undefined;

        if (input.resolution === 'approved' && requestKind === 'eviction_procedure') {
            const branch = inferExecutorApprovalDecisionType({
                title: String(stored.title || ''),
                requestKind,
                evictionWorkflowKey: stored.evictionWorkflowKey as EvictionExecutorWorkflowKey | undefined,
            });
            if (branch === 'Residential Grace Early End') {
                const execFile = useExecutionDashboardStore.getState().currentFile;
                const graceMerge = buildResidentialGraceEarlyEndApprovalMerge(execFile);
                mergePatch = { ...(mergePatch ?? {}), ...graceMerge };
                persistExecutionPatch(storageExecutionId, graceMerge);
                dispatchResidentialGraceCleared(storageExecutionId);
                try {
                    window.dispatchEvent(
                        new CustomEvent('hami-toast', {
                            detail: {
                                message:
                                    'تمت موافقة المنفذ على إنهاء المهلة السكنية وإعادة دورة المهلة في الملف.',
                                type: 'success',
                            },
                        })
                    );
                } catch {
                    /* ignore */
                }
            }
        }

        const mirrorPayload = parseOtherPartyTrackPayload(stored);
        const isDebtorAgentMirror =
            mirrorPayload?.source === DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE;
        dispatchExecutionTimelineAppend({
            executionId: storageExecutionId,
            event: {
                date: today,
                timestamp: nowIso,
                title: timelineTitle,
                description: timelineDescription,
                type: isDebtorAgentMirror ? 'other_party' : 'decision',
                source: isDebtorAgentMirror ? 'تحركات الطرف الآخر' : 'القرارات والطعون',
                metadata: {
                    timelineThreadKey: `executor_decision:${decisionId}`,
                    decisionRowId: decisionId,
                    originalRequestBody: trimmedBody ? trimmedBody.slice(0, 8000) : undefined,
                    executorResolution: input.resolution,
                    ...(isDebtorAgentMirror
                        ? { otherPartyTrackOptionId: mirrorPayload?.otherPartyTrackOptionId }
                        : {}),
                },
            } as Omit<TimelineEvent, 'id'>,
            mergePatch,
        });
    }

    if (requestKind === 'special_followup') {
        if (input.resolution === 'approved' || input.resolution === 'rejected') {
            applyDossierSpecialFollowupOutcome({
                executionId: storageExecutionId,
                row: { ...stored, ...patchRow },
                resolution: input.resolution,
            });
        }
    } else if (requestKind === 'personal_coercive' && pcSubtype) {
        applyPersonalCoerciveExecutorOutcome({
            executionId: storageExecutionId,
            subtype: pcSubtype as PersonalCoerciveSubtype,
            resolution: input.resolution,
        });
    }

    try {
        window.dispatchEvent(
            new CustomEvent('hami-execution-decision-outcome', {
                detail: {
                    executionId: storageExecutionId,
                    decisionId,
                    requestKind: requestKind || undefined,
                    outcome: patchRow.executorOutcome,
                    resolution: input.resolution,
                    suppressNavigatorToast: input.suppressNavigatorToast === true,
                    ...(pcSubtype ? { personalCoerciveSubtype: pcSubtype } : {}),
                },
            })
        );
    } catch {
        /* ignore */
    }

    return { ok: true, storageExecutionId };
}
