import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    appendPersonalCoerciveByExecutorOrder,
    appendPersonalCoerciveExecutorRequest,
    patchExecutorDecisionRow,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    buildDebtorTravelBanCycleWithdrawnPatch,
    buildDebtorTravelBanWithdrawnPatch,
    resolveDebtorDisplayNameForKey,
} from '@/app/utils/coerciveDebtorScope';
import { CryptoService } from '@/app/services/CryptoService';
import type {
    PersonalCoerciveAppealSyncSubtype,
    PersonalCoerciveAppealSyncView,
} from '@/app/utils/personalCoerciveAppealSync';

const APPEAL_SYNC_REQUEST_MAP: Partial<Record<PersonalCoerciveSubtype, PersonalCoerciveAppealSyncSubtype>> = {
    forced_bring_in: 'forced_bring_in',
    travel_ban: 'travel_ban',
    arrest_warrant_investigation: 'arrest_warrant_investigation',
    executive_dossier_presentation: 'executive_dossier_presentation',
};

function appealSyncForRequestSubtype(
    all: Record<PersonalCoerciveAppealSyncSubtype, PersonalCoerciveAppealSyncView>,
    subtype: PersonalCoerciveSubtype
): PersonalCoerciveAppealSyncView | null {
    const key = APPEAL_SYNC_REQUEST_MAP[subtype];
    return key ? all[key] : null;
}

export interface UsePersonalCoerciveSubmitRequestOptions {
    exId: string;
    isHistoricalMode: boolean;
    appealSync: Record<PersonalCoerciveAppealSyncSubtype, PersonalCoerciveAppealSyncView>;
    showToast: (
        msg: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: {
            decisionsLink?: boolean;
            decisionsTab?: 'current' | 'previous' | 'appeals';
            decisionId?: string;
        }
    ) => void;
    activeDebtorKey: string;
    primaryDebtorKey: string;
    decisionsNavForSubtype: (subtype: PersonalCoerciveSubtype) => {
        decisionId?: string;
        decisionsTab?: 'current' | 'previous' | 'appeals';
    };
    setForcedInlineResolved: (v: 'approved' | 'rejected' | null) => void;
    setForcedOutcomePick: (v: 'brought' | 'absconded' | '') => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    executionData: ExecutionFile | null;
    pushTimelineEvent: (e: TimelineEvent) => void;
    nextTimelineId: () => string;
    debtorTimelineMeta: TimelineEvent['metadata'];
    setLocalDecisionsTick: (updater: (n: number) => number) => void;
}

/**
 * إرسال طلب إكراهي شخصي جديد لمنفذ العدل — يشمل بوابة تظلم/طعن مانعة، تشفير محتوى الطلب،
 * تصفير أعلام الدورة السابقة بحسب نوع الطلب، وتسجيل حدث الخط الزمني والإشعار.
 */
export function usePersonalCoerciveSubmitRequest({
    exId,
    isHistoricalMode,
    appealSync,
    showToast,
    activeDebtorKey,
    primaryDebtorKey,
    decisionsNavForSubtype,
    setForcedInlineResolved,
    setForcedOutcomePick,
    persistExecutionMerge,
    executionData,
    pushTimelineEvent,
    nextTimelineId,
    debtorTimelineMeta,
    setLocalDecisionsTick,
}: UsePersonalCoerciveSubmitRequestOptions) {
    const queueEncryptedPayloadForDecision = (
        decisionId: string,
        subtype: string,
        title: string,
        body: string
    ) => {
        if (!exId || !decisionId) return;
        void (async () => {
            try {
                await CryptoService.initialize();
                const encryptedPayloadJson = await CryptoService.encryptData(
                    JSON.stringify({
                        executionId: exId,
                        subtype,
                        title,
                        body,
                        debtorKey: activeDebtorKey,
                        createdAtIso: new Date().toISOString(),
                    })
                );
                patchExecutorDecisionRow(exId, decisionId, { encryptedPayloadJson });
            } catch {
                /* optional payload — لا يعطل الواجهة */
            }
        })();
    };

    const submitRequest = async (
        subtype: PersonalCoerciveSubtype,
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
        if (decisionId) {
            queueEncryptedPayloadForDecision(decisionId, subtype, title, body);
        }

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
                    ...buildDebtorTravelBanCycleWithdrawnPatch(executionData, activeDebtorKey, primaryDebtorKey, null),
                    ...buildDebtorTravelBanWithdrawnPatch(executionData, activeDebtorKey, primaryDebtorKey, null),
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
            });
        }
        if (!opts?.skipTimeline) {
            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: now,
                title: byExecutorOrder ? `⚖️ ${title} — بقرار المنفذ العدل` : `📋 ${title} — قيد البت`,
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
        setLocalDecisionsTick((n) => n + 1);
        return decisionId || null;
    };

    const scopedRequestTitle = (base: string) => {
        const name = resolveDebtorDisplayNameForKey(executionData, activeDebtorKey, primaryDebtorKey);
        if (!name) return base;
        return `${base} — ${name}`;
    };

    return { submitRequest, scopedRequestTitle, queueEncryptedPayloadForDecision };
}
