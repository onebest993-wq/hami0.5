import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, DossierLifecycleStatus, SeizedAsset } from '@/app/types/execution';
import { normalizeDossierLifecycleStatus } from '@/app/types/execution';
import type { TimelineEvent } from '@/app/types/execution';
import { buildExecutionTimelineSnapshot } from '@/app/utils/buildExecutionTimelineSnapshot';
import { dossierLifecycleLabelAr } from '../helpers/dossierLifecycleUtils';
import type { ExecutionFileKey } from './executionOrchestratorTypes';
import type {
    ExecutionDossierLifecycleActionsOrchestratorSlice,
    ExecutionDossierLifecyclePanelOrchestratorSlice,
} from './executionOrchestratorSliceTypes';

export type ExecutionDossierLifecycleActionsCoreInput = {
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    dossierFileKey: ExecutionFileKey;
    financialLedgerRef: MutableRefObject<unknown[]>;
    seizedAssetsSnapshotRef: MutableRefObject<SeizedAsset[]>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    reconcileDossierLifecycle: (fileId: string, file?: ExecutionFile | null) => void;
    showToast: (message: string, type: 'success' | 'warning' | 'info') => void;
};

export type UseExecutionDossierLifecycleActionsOrchestratorParams = ExecutionDossierLifecycleActionsCoreInput &
    Pick<
        ExecutionDossierLifecyclePanelOrchestratorSlice,
        | 'dossierPendingStatus'
        | 'dossierReasonDraft'
        | 'dossierDateDraft'
        | 'setDossierReasonDraft'
        | 'setDossierDateDraft'
        | 'setDossierPendingStatus'
        | 'setDossierLifecyclePanelPhase'
        | 'setDossierLifecyclePanelOpen'
        | 'closeDossierLifecyclePanel'
    >;

/** تطبيق حالة الإضبارة على الملف والسجل الزمني + معالجات اللوحة */
export function useExecutionDossierLifecycleActionsOrchestrator({
    executionData,
    executionId,
    executionDataRef,
    dossierFileKey,
    financialLedgerRef,
    seizedAssetsSnapshotRef,
    setTimelineEvents,
    nextTimelineId,
    persistExecutionMerge,
    reconcileDossierLifecycle,
    showToast,
    dossierPendingStatus,
    dossierReasonDraft,
    dossierDateDraft,
    setDossierReasonDraft,
    setDossierDateDraft,
    setDossierPendingStatus,
    setDossierLifecyclePanelPhase,
    setDossierLifecyclePanelOpen: _setDossierLifecyclePanelOpen,
    closeDossierLifecyclePanel,
}: UseExecutionDossierLifecycleActionsOrchestratorParams): ExecutionDossierLifecycleActionsOrchestratorSlice {
    const applyDossierLifecycleToFileAndTimeline = useCallback(
        (status: DossierLifecycleStatus, reason: string, date: string) => {
            const r = reason.trim();
            const d = date.trim();
            const persistKey = String(executionData?.id ?? executionId ?? '');
            if (!persistKey || persistKey === 'undefined') return false;
            if (status !== 'active' && (!r || !d)) {
                showToast('أدخل السبب والتاريخ لاعتماد الحالة.', 'warning');
                return false;
            }
            const label = dossierLifecycleLabelAr(status);
            const iso = new Date().toISOString();
            const day = iso.slice(0, 10);
            const baseEx = executionDataRef.current;
            const lifecycleSnap = buildExecutionTimelineSnapshot({
                executionData: baseEx
                    ? {
                          ...baseEx,
                          dossier_lifecycle_status: status,
                          dossier_status_reason: status === 'active' ? '' : r,
                          dossier_status_date: status === 'active' ? '' : d,
                      }
                    : null,
                financialLedger: financialLedgerRef.current,
                seizedAssets: seizedAssetsSnapshotRef.current,
            });
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: day,
                timestamp: iso,
                title: `📋 حالة الإضبارة: ${label}`,
                description:
                    status === 'active'
                        ? 'أُعيدت الإضبارة إلى الحالة النشطة.'
                        : `السبب:\n${r}\n\nالتاريخ: ${d}`,
                type: 'procedure',
                source: 'رأس الإضبارة',
                snapshot: lifecycleSnap,
            };
            setTimelineEvents((prev) => {
                const next = [ev, ...prev];
                queueMicrotask(() => {
                    const persisted = persistExecutionMerge({
                        dossier_lifecycle_status: status,
                        dossier_status_reason: status === 'active' ? '' : r,
                        dossier_status_date: status === 'active' ? '' : d,
                        timelineEvents: next,
                    });
                    if (persisted === false) {
                        showToast('تعذّر حفظ الحالة — أعد المحاولة', 'warning');
                        return;
                    }
                    const execId = String(baseEx?.id ?? executionId ?? '');
                    if (execId && execId !== 'undefined') {
                        void import('@/app/services/timelineEventsSupabase')
                            .then(({ insertTimelineEventToSupabase }) =>
                                insertTimelineEventToSupabase({
                                    executionFileId: execId,
                                    event: ev,
                                    snapshotData: lifecycleSnap,
                                }),
                            )
                            .catch(() => {});
                    }
                    showToast('تم حفظ الحالة وتسجيلها في السجل الزمني.', 'success');
                });
                return next;
            });
            if (dossierFileKey && dossierFileKey !== 'undefined') {
                reconcileDossierLifecycle(dossierFileKey, {
                    ...(executionData ?? {}),
                    dossier_lifecycle_status: status,
                    dossier_status_reason: status === 'active' ? '' : r,
                    dossier_status_date: status === 'active' ? '' : d,
                } as ExecutionFile);
            }
            if (status === 'active') {
                setDossierReasonDraft('');
                setDossierDateDraft('');
            }
            return true;
        },
        [
            dossierFileKey,
            executionData,
            executionDataRef,
            executionId,
            financialLedgerRef,
            nextTimelineId,
            persistExecutionMerge,
            reconcileDossierLifecycle,
            seizedAssetsSnapshotRef,
            setDossierDateDraft,
            setDossierReasonDraft,
            setTimelineEvents,
            showToast,
        ],
    );

    const handleDossierLifecyclePick = useCallback(
        (picked: DossierLifecycleStatus) => {
            if (picked === 'active') {
                const ok = applyDossierLifecycleToFileAndTimeline('active', '', '');
                if (ok) closeDossierLifecyclePanel();
                return;
            }
            const committed = normalizeDossierLifecycleStatus(executionData?.dossier_lifecycle_status);
            setDossierPendingStatus(picked);
            setDossierLifecyclePanelPhase('details');
            if (picked === committed) {
                setDossierReasonDraft(String(executionData?.dossier_status_reason ?? '').trim());
                setDossierDateDraft(String(executionData?.dossier_status_date ?? '').slice(0, 10));
            } else {
                setDossierReasonDraft('');
                setDossierDateDraft('');
            }
        },
        [
            applyDossierLifecycleToFileAndTimeline,
            closeDossierLifecyclePanel,
            executionData,
            setDossierDateDraft,
            setDossierLifecyclePanelPhase,
            setDossierPendingStatus,
            setDossierReasonDraft,
        ],
    );

    const handleDossierLifecycleConfirmDetails = useCallback(
        (reasonOverride?: string, dateOverride?: string) => {
            if (!dossierPendingStatus || dossierPendingStatus === 'active') return;
            const reason =
                typeof reasonOverride === 'string' ? reasonOverride : dossierReasonDraft;
            const date = typeof dateOverride === 'string' ? dateOverride : dossierDateDraft;
            const ok = applyDossierLifecycleToFileAndTimeline(
                dossierPendingStatus,
                reason,
                date,
            );
            if (ok) closeDossierLifecyclePanel();
        },
        [
            applyDossierLifecycleToFileAndTimeline,
            closeDossierLifecyclePanel,
            dossierDateDraft,
            dossierPendingStatus,
            dossierReasonDraft,
        ],
    );

    return {
        applyDossierLifecycleToFileAndTimeline,
        handleDossierLifecyclePick,
        handleDossierLifecycleConfirmDetails,
    };
}
