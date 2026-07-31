import { getLocalTodayYmd } from './executionDashboardCoreDate';
import { appendPendingSeizureDecisionLite } from './executionDashboardDecisionStorageLiteWrite';
import type { ExecutionFile, SeizedAsset, TimelineEvent } from '@/app/types/execution';
import { isSalarySeizureAsset } from '@/app/utils/execution/isSalarySeizureAsset';

function isSalarySeizureLaneOccupiedLite(input: {
    seizedAssets: SeizedAsset[] | undefined | null;
    seizureDraftsByDecisionId?: Record<string, SeizedAsset>;
}): boolean {
    const openInAssets = (input.seizedAssets || []).some(
        (a) => isSalarySeizureAsset(a) && String(a.status || '') !== 'released',
    );
    if (openInAssets) return true;
    return Object.values(input.seizureDraftsByDecisionId || {}).some(
        (d) => isSalarySeizureAsset(d) && String((d as SeizedAsset).status || '') !== 'released',
    );
}

export type QueueCoerciveActionRequestInput = {
    actionType: string;
    details: Record<string, string>;
    activeDebtorIsDeceased: boolean;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string | undefined;
    activeWorkspaceDebtorForFollowup: { isPrimary?: boolean; key?: string } | null | undefined;
    seizedAssets: SeizedAsset[];
    seizureDraftsByDecisionId: Record<string, SeizedAsset>;
    setSeizureDraftsByDecisionId: (drafts: Record<string, SeizedAsset>) => void;
    coerciveSubjectRef: { current: { id?: string; name?: string } };
    nextTimelineId: () => string;
    timelineEvents: TimelineEvent[];
    setTimelineEvents: (events: TimelineEvent[]) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (
        message: string,
        type?: string,
        opts?: { decisionsLink?: boolean },
    ) => void;
    setLastActionDate: (ymd: string) => void;
};

export function queueCoerciveActionRequest(input: QueueCoerciveActionRequestInput): void {
    const {
        actionType,
        details,
        activeDebtorIsDeceased,
        executionData,
        decisionsStorageExecutionId,
        activeWorkspaceDebtorForFollowup,
        seizedAssets,
        seizureDraftsByDecisionId,
        setSeizureDraftsByDecisionId,
        coerciveSubjectRef,
        nextTimelineId,
        timelineEvents,
        setTimelineEvents,
        persistExecutionMerge,
        showToast,
        setLastActionDate,
    } = input;

    const actionLabels: Record<string, string> = {
        salary: activeDebtorIsDeceased ? 'حجز المخصصات والمكافاة' : 'طلب حجز راتب',
        property: 'طلب حجز عقار',
        vehicle: 'طلب حجز مال منقول',
        travel: 'منع سفر',
        imprisonment: 'طلب حبس',
    };

    const now = new Date().toISOString();
    const label = actionLabels[actionType] || actionType;
    const isSeizureRequest = ['salary', 'property', 'vehicle'].includes(actionType);
    const salaryGarnishmentRoutingNote =
        actionType === 'salary' && executionData?.garnishment_target === 'national_retirement_board'
            ? '\n\nوجهة قانونية إلزامية: هيئة التقاعد الوطنية (وليس جهة العمل السابقة).'
            : '';
    const subj = coerciveSubjectRef.current;
    const targetLead = subj.name
        ? `توجيه الإجراء ضد: ${subj.name}${subj.id ? ` (معرّف: ${subj.id})` : ''}. `
        : '';
    const descBase = targetLead + (details.description || '');
    const descWithRouting = descBase + salaryGarnishmentRoutingNote;

    let seizureDecisionId: string | null = null;
    if (isSeizureRequest) {
        if (
            actionType === 'salary' &&
            isSalarySeizureLaneOccupiedLite({
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
        seizureDecisionId = appendPendingSeizureDecisionLite({
            executionId: decisionsStorageExecutionId,
            requestTitle: `${label} — قيد البت لدى المنفذ`,
            requestBody: seizureBody,
            seizureSubtype:
                actionType === 'salary' ? 'salary' : actionType === 'vehicle' ? ('movable_auction' as any) : 'property',
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
                : undefined,
    };
    let nextDrafts = seizureDraftsByDecisionId;
    if (isSeizureRequest && seizureDecisionId) {
        const dayYmd = now.slice(0, 10);
        const detailsWithDecision: Record<string, string> = {
            ...details,
            decisionRowId: seizureDecisionId,
        };
        const newAsset: SeizedAsset = {
            id: `draft_${seizureDecisionId}`,
            type:
                actionType === 'salary'
                    ? 'طلب حجز راتب (قيد البت)'
                    : actionType === 'vehicle'
                      ? 'طلب حجز مال منقول (قيد البت)'
                      : 'طلب حجز عقار (قيد البت)',
            details: detailsWithDecision,
            status: 'pending',
            seizureDate: dayYmd,
        };
        if (details.description?.trim()) {
            newAsset.description = details.description.trim();
        }
        nextDrafts = { ...seizureDraftsByDecisionId, [seizureDecisionId]: newAsset };
        setSeizureDraftsByDecisionId(nextDrafts);
    }
    const nextTimeline = [newEvent, ...timelineEvents];
    setTimelineEvents(nextTimeline);

    const persistPatch: Record<string, unknown> = { timelineEvents: nextTimeline };
    if (isSeizureRequest && seizureDecisionId) {
        persistPatch.seizureDraftsByDecisionId = nextDrafts;
    }
    if (actionType === 'salary' && /\S/.test(String(details.salaryAmount || '').trim())) {
        const parsedSalary = Number(String(details.salaryAmount || '').replace(/,/g, '').trim());
        if (Number.isFinite(parsedSalary) && parsedSalary > 0) {
            const garnishment = parsedSalary / 5;
            if (activeWorkspaceDebtorForFollowup?.isPrimary) {
                persistPatch.employeeSalary = parsedSalary;
                persistPatch.garnishmentAmount = garnishment;
            } else if (activeWorkspaceDebtorForFollowup?.key) {
                const debtorKey = String(activeWorkspaceDebtorForFollowup.key);
                persistPatch.perDebtorSalaries = {
                    ...(executionData?.perDebtorSalaries || {}),
                    [debtorKey]: String(parsedSalary),
                };
                persistPatch.perDebtorGarnishments = {
                    ...(executionData?.perDebtorGarnishments || {}),
                    [debtorKey]: String(garnishment),
                };
            }
        }
    }
    persistExecutionMerge(persistPatch);

    const msgQueuedExecutor =
        'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ';
    if (isSeizureRequest) {
        showToast(msgQueuedExecutor, 'success', { decisionsLink: true });
    } else {
        showToast(`تم تسجيل ${label}`, 'success');
    }
    setLastActionDate(getLocalTodayYmd());
}
