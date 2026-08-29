import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    buildMaritalFurnitureDeliveryScheduleBackfillPatch,
    readFollowupMergedExecutorDecisions,
} from '@/app/utils/maritalFurnitureDeliveryWorkflow';
import { resolveMaritalFurnitureFinancialSyncPatch } from '@/app/components/lawyer/ExecutionDashboard/utils/maritalFurnitureFinancialSync';
import type { FollowupUnifiedModalTab } from '../../followupModalTabTypes';
import { isInabaSubFileId } from '@/app/stores/executionDashboardStore';

export function useExecutionDashboardExecutionFeeExemptionToast({
    debtorNotificationDate,
    daysSinceNoticeCalculated,
    remaining,
    executionFeeInjected,
    showToast,
    dossierScopeId,
}: {
    debtorNotificationDate: string | null;
    daysSinceNoticeCalculated: number;
    remaining: number;
    executionFeeInjected: boolean;
    showToast: (message: string, type: string) => void;
    dossierScopeId?: string | null;
}) {
    const toastedForDossierRef = useRef('');
    useEffect(() => {
        const scope = String(dossierScopeId ?? '').trim();
        if (
            !debtorNotificationDate ||
            daysSinceNoticeCalculated > 7 ||
            remaining > 0 ||
            executionFeeInjected
        ) {
            return;
        }
        if (scope && toastedForDossierRef.current === scope) return;
        toastedForDossierRef.current = scope || '__once__';
        showToast('✅ تم دفع كامل الدين خلال المهلة - إعفاء من رسم التحصيل', 'success');
    }, [
        daysSinceNoticeCalculated,
        remaining,
        debtorNotificationDate,
        executionFeeInjected,
        showToast,
        dossierScopeId,
    ]);
}

export function useExecutionDashboardUnifiedModalPersonalTabRedirect({
    showUnifiedExecutionModal,
    modalShowPersonalCoerciveFollowupTab,
    unifiedModalTab,
    hideFollowupSeizureRequestsTab,
    hideFollowupCoerciveTab,
    followupSolidaryDebtorIndex,
    executionDebtorTabIndex,
    setUnifiedModalTab,
}: {
    showUnifiedExecutionModal: boolean;
    modalShowPersonalCoerciveFollowupTab: boolean;
    unifiedModalTab: FollowupUnifiedModalTab;
    hideFollowupSeizureRequestsTab: boolean;
    hideFollowupCoerciveTab: boolean;
    followupSolidaryDebtorIndex: number;
    executionDebtorTabIndex: number;
    setUnifiedModalTab: Dispatch<SetStateAction<FollowupUnifiedModalTab>>;
}) {
    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        if (modalShowPersonalCoerciveFollowupTab) return;
        if (unifiedModalTab !== 'personal') return;
        const nextTab = hideFollowupSeizureRequestsTab
            ? hideFollowupCoerciveTab
                ? 'correspondences'
                : 'coercive'
            : 'seizure_requests';
        if (nextTab !== unifiedModalTab) setUnifiedModalTab(nextTab);
    }, [
        showUnifiedExecutionModal,
        followupSolidaryDebtorIndex,
        executionDebtorTabIndex,
        modalShowPersonalCoerciveFollowupTab,
        hideFollowupSeizureRequestsTab,
        hideFollowupCoerciveTab,
        unifiedModalTab,
        setUnifiedModalTab,
    ]);
}

export function useExecutionDashboardDebtorBrowserTabsClamp({
    debtorBrowserTabsMode,
    debtorWorkspaceEntryCount,
    setExecutionDebtorTabIndex,
}: {
    debtorBrowserTabsMode: boolean;
    debtorWorkspaceEntryCount: number;
    setExecutionDebtorTabIndex: Dispatch<SetStateAction<number>>;
}) {
    useEffect(() => {
        if (!debtorBrowserTabsMode) return;
        const n = debtorWorkspaceEntryCount;
        if (n === 0) return;
        setExecutionDebtorTabIndex((i) => {
            if (i < 0) return 0;
            if (i >= n) return n - 1;
            return i;
        });
    }, [debtorBrowserTabsMode, debtorWorkspaceEntryCount, setExecutionDebtorTabIndex]);
}

export function useExecutionDashboardSaveOnUnmount(
    saveExecutionData: () => void,
    _fileId?: string,
) {
    const saveRef = useRef(saveExecutionData);
    saveRef.current = saveExecutionData;
    const fileIdRef = useRef(_fileId);
    fileIdRef.current = _fileId;

    useEffect(() => {
        const fileIdAtStart = _fileId;
        const saveAtStart = saveExecutionData;
        return () => {
            if (fileIdRef.current !== fileIdAtStart) {
                saveAtStart();
                return;
            }
            saveRef.current();
        };
    }, [_fileId]);
}

export function useExecutionDashboardFieldVisitScheduledListener({
    executionDataId,
    executionId,
    decisionsStorageExecutionId,
    executorApprovalActions,
}: {
    executionDataId: string | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string;
    executorApprovalActions: {
        pushCalendarAppointment: (input: {
            dossierId: string;
            decisionId: string;
            purpose: string;
            eventIso: string;
            recordedAt: string;
        }) => void;
    };
}) {
    useEffect(() => {
        const acceptedIds = new Set(
            [
                String(executionDataId ?? '').trim(),
                String(executionId ?? '').trim(),
                String(decisionsStorageExecutionId ?? '').trim(),
            ].filter((id) => id && id !== 'undefined'),
        );
        if (acceptedIds.size === 0) return;
        const onFieldVisitScheduled = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                decisionId?: string;
                eventIso?: string;
                purpose?: string;
                linkToAppointments?: boolean;
            }>;
            const evId = String(ce.detail?.executionId ?? '').trim();
            if (!evId || !acceptedIds.has(evId)) return;
            const eventIso = String(ce.detail?.eventIso ?? '').trim();
            const decisionId = String(ce.detail?.decisionId ?? '').trim();
            if (!eventIso || !decisionId) return;
            const purpose = String(ce.detail?.purpose || 'موعد الخروج الميداني').trim();
            const linkToAppointments = ce.detail?.linkToAppointments !== false;
            if (linkToAppointments) {
                executorApprovalActions.pushCalendarAppointment({
                    dossierId: evId,
                    decisionId,
                    purpose,
                    eventIso,
                    recordedAt: new Date().toISOString(),
                });
            }
        };
        window.addEventListener('hami-eviction-field-visit-scheduled', onFieldVisitScheduled as EventListener);
        return () =>
            window.removeEventListener('hami-eviction-field-visit-scheduled', onFieldVisitScheduled as EventListener);
    }, [executionDataId, executionId, decisionsStorageExecutionId, executorApprovalActions]);
}

export function useExecutionDashboardMaritalFurnitureFinancialSync({
    isMaritalFurnitureClaim,
    executionData,
    maritalFurnitureItemsForFollowup,
    persistExecutionMerge,
    decisionsStorageExecutionId,
    executionId,
}: {
    isMaritalFurnitureClaim: boolean;
    executionData: ExecutionFile | null | undefined;
    maritalFurnitureItemsForFollowup: unknown;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    decisionsStorageExecutionId?: string;
    executionId?: string;
}) {
    useEffect(() => {
        if (!isMaritalFurnitureClaim || !executionData) return;
        const storageId = String(
            decisionsStorageExecutionId || executionId || executionData.id || '',
        ).trim();
        if (storageId && storageId !== 'default' && storageId !== 'undefined') {
            const decisions = readFollowupMergedExecutorDecisions(
                storageId,
                executionData as Record<string, unknown>,
            );
            const schedulePatch = buildMaritalFurnitureDeliveryScheduleBackfillPatch(
                executionData as Record<string, unknown>,
                decisions,
            );
            if (schedulePatch) {
                persistExecutionMerge(schedulePatch);
            }
        }

        const financialPatch = resolveMaritalFurnitureFinancialSyncPatch({
            executionData,
            executionId,
            decisionsStorageExecutionId,
            maritalFurnitureItemsForFollowup,
        });
        if (financialPatch) {
            persistExecutionMerge(financialPatch);
        }
    }, [
        isMaritalFurnitureClaim,
        executionData,
        maritalFurnitureItemsForFollowup,
        persistExecutionMerge,
        decisionsStorageExecutionId,
        executionId,
    ]);
}

export function useExecutionDashboardSupabaseTimelineHydrate({
    executionDataId,
    setTimelineEvents,
}: {
    executionDataId: string | undefined;
    setTimelineEvents: React.Dispatch<React.SetStateAction<TimelineEvent[]>>;
}) {
    useEffect(() => {
        const id = executionDataId;
        if (!id || id === 'undefined' || isInabaSubFileId(id)) return;
        let cancelled = false;
        void import('@/app/services/timelineEventsSupabase')
            .then(({ fetchTimelineEventsFromSupabase, mergeRemoteSnapshotsIntoTimelineEvents }) =>
                fetchTimelineEventsFromSupabase(String(id)).then((rows) => {
                    if (cancelled || !rows.length) return;
                    setTimelineEvents((prev) => mergeRemoteSnapshotsIntoTimelineEvents(prev, rows));
                }),
            )
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [executionDataId, setTimelineEvents]);
}
