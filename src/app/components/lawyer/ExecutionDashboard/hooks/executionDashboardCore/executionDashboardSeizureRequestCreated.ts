/** بناء مسودة حجز من حدث «hami-seizure-request-created» */
import type { SeizedAsset, TimelineEvent } from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

export function resolveSeizureActionTypeFromSubtype(
    subtype: string,
): 'vehicle' | 'salary' | 'property' | 'skip' {
    if (subtype === 'property') return 'skip';
    if (subtype === 'movable' || subtype === 'movable_auction') return 'vehicle';
    if (subtype === 'salary') return 'salary';
    return 'property';
}

export function buildSeizurePendingDraft(
    decisionId: string,
    subtype: string,
    actionType: 'vehicle' | 'salary' | 'property',
): { draft: SeizedAsset; baseDesc: string; label: string } {
    const baseDesc =
        actionType === 'salary'
            ? 'طلب حجز راتب (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.'
            : actionType === 'vehicle'
              ? 'طلب حجز مال منقول (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.'
              : subtype === 'notice'
                ? 'طلب وضع إشارة الحجز التنفيذي (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.'
                : 'طلب حجز عقار (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.';

    const details: Record<string, string> = {
        seizureUiKind: actionType,
        decisionRowId: decisionId,
        employerName: '',
        salaryAmount: '',
        propertyAddress: '',
        propertyLocation: '',
        vehicleDescription: '',
        vehiclePlate: '',
        movableAssetType: '',
        movableDescription: '',
        movableLocation: '',
        judicialCustodianName: '',
        description: baseDesc,
    };

    const dayYmd = getLocalTodayYmd();
    const draft: SeizedAsset = {
        id: `draft_${decisionId}`,
        type:
            subtype === 'notice'
                ? 'طلب وضع إشارة الحجز التنفيذي (قيد البت)'
                : actionType === 'salary'
                  ? 'طلب حجز راتب (قيد البت)'
                  : actionType === 'vehicle'
                    ? 'طلب حجز مال منقول (قيد البت)'
                    : 'طلب حجز عقار (قيد البت)',
        details,
        status: 'pending',
        seizureDate: dayYmd,
    };

    const label =
        subtype === 'notice'
            ? 'طلب وضع إشارة الحجز التنفيذي'
            : actionType === 'salary'
              ? 'طلب حجز راتب'
              : actionType === 'vehicle'
                ? 'طلب حجز مال منقول'
                : 'طلب حجز عقار';

    return { draft, baseDesc, label };
}

export function buildSeizurePendingTimelineEvent(
    decisionId: string,
    label: string,
    baseDesc: string,
    nextTimelineId: () => string,
): TimelineEvent {
    const now = new Date().toISOString();
    return {
        id: nextTimelineId(),
        date: now,
        timestamp: now,
        title: `📋 ${label} — قيد البت`,
        description: baseDesc,
        type: 'coercive',
        source: 'التنفيذ والمحجوزات',
        metadata: {
            timelineThreadKey: `executor_decision:${decisionId}`,
            decisionRowId: decisionId,
        },
    };
}

export function seizureDecisionAlreadyMaterialized(input: {
    decisionId: string;
    draftsByDecisionId: Record<string, SeizedAsset | undefined> | null | undefined;
    seizedAssets: SeizedAsset[];
}): boolean {
    if (Boolean(input.draftsByDecisionId?.[input.decisionId])) return true;
    return input.seizedAssets.some(
        (a) =>
            String((a.details as Record<string, unknown> | undefined)?.decisionRowId ?? '') ===
            input.decisionId,
    );
}
