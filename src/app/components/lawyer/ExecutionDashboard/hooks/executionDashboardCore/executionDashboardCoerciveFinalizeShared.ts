import { getLocalTodayYmd } from './executionDashboardCoreDate';
import { patchExecutionDecisionRowLite } from './executionDashboardDecisionStorageLiteWrite';
import type { SeizedAsset, TimelineEvent } from '@/app/types/execution';
import type { FinalizeCoerciveSeizureInput } from './executionDashboardCoerciveFinalizeTypes';

export function resolveFinalizeIdentity(input: FinalizeCoerciveSeizureInput): {
    decisionRowId: string;
    assetId: string;
} {
    const decisionRowId = input.directDecisionRowId || input.seizureDetailCompletion!.decisionRowId;
    const existingByDecisionRowId = input.seizedAssets.find(
        (a) => String((a.details as any)?.decisionRowId || '') === String(decisionRowId),
    );
    const assetId =
        input.directDecisionRowId && existingByDecisionRowId?.id
            ? existingByDecisionRowId.id
            : input.seizureDetailCompletion?.assetId || `sz_${String(decisionRowId)}_${Date.now()}`;
    if (input.seizureDetailCompletion && !input.directDecisionRowId) {
        input.setSeizureDetailCompletion(null);
    }
    return { decisionRowId, assetId };
}

export function buildNextSeizedAssets(input: {
    seizedAssets: SeizedAsset[];
    assetId: string;
    baseAssetType: string;
    actionType: string;
    decisionRowId: string;
    details: Record<string, string>;
    mergedDesc: string;
}): SeizedAsset[] {
    const today = getLocalTodayYmd();
    const existing = input.seizedAssets.find((a) => a.id === input.assetId);
    if (!existing) {
        return [
            {
                id: input.assetId,
                type: input.baseAssetType,
                description: input.mergedDesc || undefined,
                status: 'seized',
                seizureDate: today,
                details: {
                    ...input.details,
                    decisionRowId: String(input.decisionRowId),
                    seizureUiKind: input.actionType,
                } as any,
            },
            ...input.seizedAssets,
        ] as any;
    }
    return input.seizedAssets.map((a) => {
        if (a.id !== input.assetId) return a;
        const prevDetails =
            typeof a.details === 'object' && a.details && !Array.isArray(a.details)
                ? (a.details as Record<string, unknown>)
                : {};
        return {
            ...a,
            type: String((a as any).type || '').trim() ? (a as any).type : input.baseAssetType,
            status: String((a as any).status || '').trim() ? (a as any).status : 'seized',
            seizureDate: (a as any).seizureDate || today,
            description: input.mergedDesc || a.description,
            estimatedValue: a.estimatedValue,
            notes: a.notes,
            details: {
                ...prevDetails,
                ...input.details,
                decisionRowId: String(input.decisionRowId),
                seizureUiKind: input.actionType,
            },
        };
    });
}

export function resolveCoerciveFinalizeTitle(actionType: string, activeDebtorIsDeceased: boolean): string {
    if (actionType === 'salary') {
        return activeDebtorIsDeceased ? '💼 حجز الحوافز والمخصصات' : '💼 حجز الراتب';
    }
    if (actionType === 'property') return '🏠 تثبيت بيانات حجز العقار';
    return '📦 تثبيت بيانات حجز مال منقول';
}

export function commitCoerciveFinalize(input: {
    source: FinalizeCoerciveSeizureInput;
    decisionRowId: string;
    assetId: string;
    mergedDesc: string;
    nextAssets: SeizedAsset[];
    persistPatch: Record<string, unknown>;
}): void {
    const { source, decisionRowId, assetId, mergedDesc, nextAssets, persistPatch } = input;
    source.setSeizedAssets(nextAssets);

    const now = new Date().toISOString();
    const today = getLocalTodayYmd();
    const ev: TimelineEvent = {
        id: source.nextTimelineId(),
        date: today,
        timestamp: now,
        title: resolveCoerciveFinalizeTitle(source.actionType, source.activeDebtorIsDeceased),
        description: mergedDesc || undefined,
        type: 'coercive',
        source: 'محضر المتابعة — الحجز المالي',
        metadata: {
            timelineThreadKey: `seizure_details_saved:${assetId}`,
            seizureAssetId: assetId,
            decisionRowId,
        },
    };
    const nextTimeline = [ev, ...source.timelineEvents];
    source.setTimelineEvents(nextTimeline);

    const patch: Record<string, unknown> = {
        ...persistPatch,
        seizedAssets: nextAssets,
        timelineEvents: nextTimeline,
    };
    source.persistExecutionMerge(patch);

    const nextDraftsAfterSave = { ...source.seizureDraftsByDecisionIdRef.current };
    if (nextDraftsAfterSave[decisionRowId]) {
        delete nextDraftsAfterSave[decisionRowId];
        source.setSeizureDraftsByDecisionId(nextDraftsAfterSave);
        source.persistExecutionMerge({ seizureDraftsByDecisionId: nextDraftsAfterSave });
    }

    patchExecutionDecisionRowLite(source.decisionsStorageExecutionId, decisionRowId, {
        seizureRequestSavedAt: now,
        seizureRequestDetails: mergedDesc || undefined,
    });
    source.showToast('تم حفظ تفاصيل الحجز بعد موافقة المنفذ.', 'success');
    source.setLastActionDate(today);
}
