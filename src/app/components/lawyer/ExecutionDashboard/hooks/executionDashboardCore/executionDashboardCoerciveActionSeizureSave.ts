import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    buildSalarySeizureDescriptionText,
    resolveSalarySeizureSubject,
} from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureDisplayUtils';
import {
    getExecutorDecisionRowById,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    upsertSeizedMovableFromDetails,
    upsertSeizedPropertyFromDetails,
} from '../../helpers';
import { coalesceDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import { mergeSeizureDecisionPayloadJson } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';
import type { SeizedAsset, SeizedMovable, SeizedProperty, TimelineEvent } from '@/app/types/execution';
import {
    applySalaryGarnishmentPersistPatch,
    readAssetDetailsBag,
    type CoerciveActionDetails,
    type SaveCoerciveActionDeps,
} from './executionDashboardCoerciveActionTypes';

export function trySaveCompletedSeizureDetails(
    actionType: string,
    details: CoerciveActionDetails,
    deps: SaveCoerciveActionDeps,
    directDecisionRowId: string,
): boolean {
    const {
        seizureDetailCompletion,
        setSeizureDetailCompletion,
        seizedAssets,
        setSeizedAssets,
        activeDebtorIsDeceased,
        executionData,
        executionId,
        decisionsStorageExecutionId,
        executionDataRef,
        persistExecutionMerge,
        nextTimelineId,
        timelineEvents,
        setTimelineEvents,
        setSeizureDraftsByDecisionId,
        seizureDraftsByDecisionIdRef,
        showToast,
        setLastActionDate,
    } = deps;

    if (
        !(
            (seizureDetailCompletion &&
                (actionType === 'salary' || actionType === 'property' || actionType === 'vehicle') &&
                seizureDetailCompletion.actionType === actionType) ||
            directDecisionRowId
        )
    ) {
        return false;
    }

    const decisionRowId = directDecisionRowId || seizureDetailCompletion!.decisionRowId;
    const existingByDecisionRowId = seizedAssets.find(
        (a) => String(readAssetDetailsBag(a)?.decisionRowId || '') === String(decisionRowId),
    );
    const assetId =
        directDecisionRowId && existingByDecisionRowId?.id
            ? existingByDecisionRowId.id
            : seizureDetailCompletion?.assetId || `sz_${String(decisionRowId)}_${Date.now()}`;
    if (seizureDetailCompletion && !directDecisionRowId) {
        setSeizureDetailCompletion(null);
    }

    let mergedDesc = (details.description || '').trim();
    if (!mergedDesc && actionType === 'salary') {
        const dedRaw = String(details.monthlyDeductionIqd || '').trim();
        const parsedDeductionEarly = Number(dedRaw.replace(/,/g, ''));
        mergedDesc = buildSalarySeizureDescriptionText({
            employerName: String(details.employerName || ''),
            salaryAmount: String(details.salaryAmount || ''),
            monthlyDeductionIqd:
                Number.isFinite(parsedDeductionEarly) && parsedDeductionEarly > 0
                    ? Math.trunc(parsedDeductionEarly)
                    : undefined,
            activeDebtorIsDeceased,
            subject: resolveSalarySeizureSubject(
                {
                    details: {
                        ...details,
                        decisionRowId: String(decisionRowId),
                    },
                },
                executionData ?? null,
                coalesceDecisionsStorageExecutionId({
                    decisionsStorageExecutionId,
                    executionId,
                    executionData: executionData as Record<string, unknown> | null,
                }),
            ),
        });
    } else if (!mergedDesc && actionType === 'property') {
        mergedDesc = `رقم العقار: ${details.propertyNumber || ''}\nالمقاطعة: ${details.propertyDistrict || ''}\nالنوع: ${details.propertyType || ''}`.trim();
    } else if (!mergedDesc && actionType === 'vehicle') {
        const cust = String(details.judicialCustodianName || '').trim();
        mergedDesc = [
            `وصف المال المنقول: ${String(details.movableDescription || details.movableAssetType || details.vehicleDescription || '').trim()}`,
            `المكان: ${String(details.movableLocation || '').trim()}`,
            cust ? `الحارس القضائي: ${cust}` : null,
        ]
            .filter(Boolean)
            .join('\n')
            .trim();
    }

    const baseAssetType =
        actionType === 'salary' ? 'salary' : actionType === 'property' ? 'real_estate' : 'movable';
    const today = getLocalTodayYmd();
    const nextAssets = (() => {
        const existing = seizedAssets.find((a) => a.id === assetId);
        if (!existing) {
            const next: SeizedAsset[] = [
                {
                    id: assetId,
                    type: baseAssetType,
                    description: mergedDesc || undefined,
                    status: 'seized',
                    seizureDate: today,
                    details: {
                        ...details,
                        decisionRowId: String(decisionRowId),
                        seizureUiKind: actionType,
                    } as unknown as SeizedAsset['details'],
                },
                ...seizedAssets,
            ];
            return next;
        }
        return seizedAssets.map((a) => {
            if (a.id !== assetId) return a;
            const prevDetails = readAssetDetailsBag(a);
            return {
                ...a,
                type: String(a.type || '').trim() ? a.type : baseAssetType,
                status: String(a.status || '').trim() ? a.status : 'seized',
                seizureDate: a.seizureDate || today,
                description: mergedDesc || a.description,
                estimatedValue: a.estimatedValue,
                notes: a.notes,
                details: {
                    ...prevDetails,
                    ...details,
                    decisionRowId: String(decisionRowId),
                    seizureUiKind: actionType,
                } as unknown as SeizedAsset['details'],
            };
        });
    })();
    setSeizedAssets(nextAssets);

    const now = new Date().toISOString();
    const titleAr =
        actionType === 'salary'
            ? activeDebtorIsDeceased
                ? '💼 حجز الحوافز والمخصصات'
                : '💼 حجز الراتب'
            : actionType === 'property'
              ? '🏠 تثبيت بيانات حجز العقار'
              : '📦 تثبيت بيانات حجز مال منقول';
    const descLines = mergedDesc;
    const ev: TimelineEvent = {
        id: nextTimelineId(),
        date: today,
        timestamp: now,
        title: titleAr,
        description: descLines || undefined,
        type: 'coercive',
        source: 'محضر المتابعة — الحجز المالي',
        metadata: {
            timelineThreadKey: `seizure_details_saved:${assetId}`,
            seizureAssetId: assetId,
            decisionRowId,
        },
    };
    const nextTimeline = [ev, ...timelineEvents];
    setTimelineEvents(nextTimeline);

    const persistPatch: Record<string, unknown> = { seizedAssets: nextAssets, timelineEvents: nextTimeline };
    if (actionType === 'property') {
        const prevProps = (executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
        persistPatch.seizedProperties = upsertSeizedPropertyFromDetails(prevProps, decisionRowId, {
            propertyNumber: String(details.propertyNumber || '').trim(),
            propertyDistrict: String(details.propertyDistrict || '').trim(),
            propertyType: String(details.propertyType || '').trim(),
        });
    }
    if (actionType === 'vehicle') {
        const prevMov = (executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
        persistPatch.seizedMovables = upsertSeizedMovableFromDetails(prevMov, decisionRowId, {
            movableDescription: String(
                details.movableDescription || details.movableAssetType || details.vehicleDescription || '',
            ).trim(),
            movableLocation: String(details.movableLocation || '').trim(),
            judicialCustodianName: String(details.judicialCustodianName || '').trim(),
        });
    }
    applySalaryGarnishmentPersistPatch(persistPatch, details, actionType, deps);
    const parsedDeduction = Number(
        String(details.monthlyDeductionIqd || '').replace(/,/g, '').trim(),
    );
    if (actionType === 'salary' && Number.isFinite(parsedDeduction) && parsedDeduction > 0) {
        const nextAssetsWithDed = (persistPatch.seizedAssets as SeizedAsset[]) ?? nextAssets;
        persistPatch.seizedAssets = nextAssetsWithDed.map((a) => {
            if (a.id !== assetId) return a;
            const prevDetails = readAssetDetailsBag(a);
            return {
                ...a,
                details: {
                    ...prevDetails,
                    monthlyDeductionIqd: Math.trunc(parsedDeduction),
                } as unknown as SeizedAsset['details'],
            };
        });
    }
    persistExecutionMerge(persistPatch);
    const nextDraftsAfterSave = { ...seizureDraftsByDecisionIdRef.current };
    if (nextDraftsAfterSave[decisionRowId]) {
        delete nextDraftsAfterSave[decisionRowId];
        setSeizureDraftsByDecisionId(nextDraftsAfterSave);
        persistExecutionMerge({ seizureDraftsByDecisionId: nextDraftsAfterSave });
    }
    const existingDecisionRow = getExecutorDecisionRowById(
        decisionsStorageExecutionId,
        decisionRowId,
    ) as Record<string, unknown> | null;
    const existingPayloadJson = String(existingDecisionRow?.seizurePayloadJson || '').trim();
    let seizurePayloadJson: string | undefined;
    if (actionType === 'property') {
        const rows = (persistPatch.seizedProperties || []) as SeizedProperty[];
        const hit = rows.find((x) => String(x.decisionRowId || '') === String(decisionRowId));
        const propertyId = String(hit?.id || '').trim();
        if (propertyId) {
            seizurePayloadJson = mergeSeizureDecisionPayloadJson(existingPayloadJson, {
                seizedPropertyId: propertyId,
                propertyNumber: String(details.propertyNumber || '').trim(),
                propertyDistrict: String(details.propertyDistrict || '').trim(),
                propertyType: String(details.propertyType || '').trim(),
            });
        }
    }
    if (actionType === 'vehicle') {
        const rows = (persistPatch.seizedMovables || []) as SeizedMovable[];
        const hit = rows.find((x) => String(x.decisionRowId || '') === String(decisionRowId));
        const movableId = String(hit?.id || '').trim();
        if (movableId) {
            seizurePayloadJson = mergeSeizureDecisionPayloadJson(existingPayloadJson, {
                seizedMovableId: movableId,
                movableDescription: String(
                    details.movableDescription ||
                        details.movableAssetType ||
                        details.vehicleDescription ||
                        '',
                ).trim(),
                movableLocation: String(details.movableLocation || '').trim(),
                judicialCustodianName: String(details.judicialCustodianName || '').trim(),
            });
        }
    }
    patchExecutorDecisionRow(decisionsStorageExecutionId, decisionRowId, {
        seizureRequestSavedAt: now,
        seizureRequestDetails: descLines || mergedDesc || undefined,
        ...(seizurePayloadJson ? { seizurePayloadJson } : {}),
    });
    showToast('تم حفظ تفاصيل الحجز بعد موافقة المنفذ.', 'success');
    setLastActionDate(getLocalTodayYmd());
    return true;
}
