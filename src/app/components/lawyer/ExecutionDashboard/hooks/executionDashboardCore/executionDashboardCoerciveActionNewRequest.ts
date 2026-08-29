import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { isSalarySeizureLaneOccupied } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';
import { appendPendingExecutorSeizureDecision } from '@/app/utils/executorSeizureDecisionQueue';
import { appendSpecialFollowupRequest } from '@/app/utils/specialFollowupDecisionQueue';
import {
    buildPendingSeizureDraftAsset,
    mergeSeizureDraftPatch,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';
import type { SeizedAsset, TimelineEvent } from '@/app/types/execution';
import {
    applySalaryGarnishmentPersistPatch,
    type CoerciveActionDetails,
    type SaveCoerciveActionDeps,
} from './executionDashboardCoerciveActionTypes';

export function saveNewCoerciveRequest(
    actionType: string,
    details: CoerciveActionDetails,
    deps: SaveCoerciveActionDeps,
): void {
    const {
        seizedAssets,
        activeDebtorIsDeceased,
        executionData,
        decisionsStorageExecutionId,
        executionDataRef,
        persistExecutionMerge,
        nextTimelineId,
        timelineEvents,
        setTimelineEvents,
        seizureDraftsByDecisionId,
        setSeizureDraftsByDecisionId,
        coerciveSubjectRef,
        showToast,
        setLastActionDate,
    } = deps;

    const actionLabels: Record<string, string> = {
        salary: activeDebtorIsDeceased ? 'حجز المخصصات والمكافاة' : 'طلب حجز راتب',
        property: 'طلب حجز عقار',
        vehicle: 'طلب حجز مال منقول',
        travel: 'منع سفر',
        imprisonment: 'طلب حبس',
        police_force: 'طلب قوة تنفيذية',
        refusal_record: 'محضر امتناع',
    };

    const now = new Date().toISOString();
    const label = actionLabels[actionType] || actionType;
    const isSeizureRequest = ['salary', 'property', 'vehicle'].includes(actionType);
    const isSpecialFollowupRequest = actionType === 'police_force' || actionType === 'refusal_record';
    const salaryGarnishmentRoutingNote =
        actionType === 'salary' &&
        executionData?.garnishment_target === 'national_retirement_board'
            ? '\n\nوجهة قانونية إلزامية: هيئة التقاعد الوطنية (وليس جهة العمل السابقة).'
            : '';
    const subj = coerciveSubjectRef.current;
    const targetLead = subj.name
        ? `توجيه الإجراء ضد: ${subj.name}${subj.id ? ` (معرّف: ${subj.id})` : ''}. `
        : '';
    const descBase = targetLead + (details.description || '');
    const descWithRouting = descBase + salaryGarnishmentRoutingNote;

    let specialFollowupDecisionId: string | null = null;
    if (isSpecialFollowupRequest) {
        const body = [
            `${label} بشأن المدين${subj.name ? ` (${subj.name})` : ''}.`,
            descWithRouting.trim() || null,
        ]
            .filter(Boolean)
            .join('\n');
        specialFollowupDecisionId = appendSpecialFollowupRequest({
            executionId: decisionsStorageExecutionId,
            requestDate: getLocalTodayYmd(),
            content: body,
            decisionTitle: label,
            executionData: executionDataRef.current as Record<string, unknown> | null | undefined,
        });
        if (!specialFollowupDecisionId) {
            showToast(`يوجد طلب "${label}" مماثل قيد البت لدى المنفذ.`, 'warning', {
                decisionsLink: true,
            });
            return;
        }
    }

    let seizureDecisionId: string | null = null;
    if (isSeizureRequest) {
        if (
            actionType === 'salary' &&
            isSalarySeizureLaneOccupied({
                seizedAssets,
                seizureDraftsByDecisionId: seizureDraftsByDecisionId as Record<string, SeizedAsset>,
            })
        ) {
            showToast('يوجد حجز راتب نشط أو طلب قيد البت — لا يمكن التكرار قبل فك الحجز.', 'warning');
            return;
        }
        const seizureBody = [
            `طلب ${label} بشأن المدين${subj.name ? ` (${subj.name})` : ''}.`,
            descWithRouting.trim() || null,
        ]
            .filter(Boolean)
            .join('\n');
        const payloadJson =
            actionType === 'vehicle'
                ? JSON.stringify({
                      movableDescription: String(details.movableDescription || '').trim(),
                      movableLocation: String(details.movableLocation || '').trim(),
                      judicialCustodianName: String(details.judicialCustodianName || '').trim(),
                      subject: String(label || '').trim(),
                  })
                : undefined;
        seizureDecisionId = appendPendingExecutorSeizureDecision({
            executionId: decisionsStorageExecutionId,
            requestTitle: `${label} — قيد البت لدى المنفذ`,
            requestBody: seizureBody,
            seizureSubtype:
                actionType === 'salary'
                    ? 'salary'
                    : actionType === 'vehicle'
                      ? 'movable_auction'
                      : 'property',
            ...(payloadJson ? { seizurePayloadJson: payloadJson } : {}),
        });
    }

    const newEvent: TimelineEvent = {
        id: nextTimelineId(),
        date: now,
        timestamp: now,
        title: isSeizureRequest ? `📋 ${label} — قيد البت` : `⚖️ ${label}`,
        description: isSeizureRequest
            ? [`طلب ${label} بشأن المدين${subj.name ? ` (${subj.name})` : ''}.`, descWithRouting.trim() || null]
                  .filter(Boolean)
                  .join('\n')
            : `${label}.${descWithRouting ? ` ${descWithRouting}` : ''}`,
        type: 'coercive',
        source: 'التنفيذ والمحجوزات',
        metadata:
            seizureDecisionId != null
                ? {
                      timelineThreadKey: `executor_decision:${seizureDecisionId}`,
                      decisionRowId: seizureDecisionId,
                  }
                : specialFollowupDecisionId != null
                  ? {
                        timelineThreadKey: `executor_decision:${specialFollowupDecisionId}`,
                        decisionRowId: specialFollowupDecisionId,
                    }
                  : undefined,
    };
    let nextDrafts = seizureDraftsByDecisionId;
    if (isSeizureRequest && seizureDecisionId) {
        const uiActionType =
            actionType === 'salary' ? 'salary' : actionType === 'vehicle' ? 'vehicle' : 'property';
        const newAsset = buildPendingSeizureDraftAsset({
            decisionId: seizureDecisionId,
            actionType: uiActionType,
            activeDebtorIsDeceased,
            details,
        });
        nextDrafts = mergeSeizureDraftPatch(seizureDraftsByDecisionId, seizureDecisionId, newAsset);
        setSeizureDraftsByDecisionId(nextDrafts);
    }
    const nextTimeline = [newEvent, ...timelineEvents];
    setTimelineEvents(nextTimeline);

    const persistPatch: Record<string, unknown> = { timelineEvents: nextTimeline };
    if (isSeizureRequest && seizureDecisionId) {
        persistPatch.seizureDraftsByDecisionId = nextDrafts;
    }
    applySalaryGarnishmentPersistPatch(persistPatch, details, actionType, deps);
    const persisted = persistExecutionMerge(persistPatch);
    if (persisted === false) {
        showToast('تعذّر حفظ الطلب — أعد المحاولة', 'error');
        return;
    }

    const msgQueuedExecutor =
        'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ';
    if (isSeizureRequest || isSpecialFollowupRequest) {
        showToast(msgQueuedExecutor, 'success', { decisionsLink: true });
    } else {
        showToast(`تم تسجيل ${label}`, 'success');
    }
    setLastActionDate(getLocalTodayYmd());
}
