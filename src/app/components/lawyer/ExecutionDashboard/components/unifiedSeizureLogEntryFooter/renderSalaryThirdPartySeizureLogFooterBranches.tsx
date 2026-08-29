import React from 'react';
import type { SeizedAsset } from '@/app/types/execution';
import {
    SalarySeizureLogDetailCard,
    type SalarySeizureDetailsPatch,
} from '@/app/components/lawyer/ExecutionDashboard/components/SalarySeizureLogDetailCard';
import {
    ThirdPartySeizureRegistryCard,
    ThirdPartySeizureWorkflowCard,
} from '@/app/components/lawyer/execution/ThirdPartySeizureLogCards';
import {
    mergeSeizedAssetLists,
} from '@/app/components/lawyer/ExecutionDashboard/utils/executionPhoneBodyExecutionDataMerge';
import { creditThirdPartySeizureFunds } from '@/app/components/lawyer/ExecutionDashboard/utils/thirdPartyFundsReceivedOutcomeUtils';
import {
    coalesceDecisionsStorageExecutionId,
    requireDecisionsStorageExecutionId,
} from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import { applySalarySeizureAssetDetailsPatch } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardSalarySeizurePatch';
import { buildSeizureAssetRowReleasePatch } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardSeizureRowPatch';
import { isExecutionHandlerStubLeaf } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionHandlerClusterStubs';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    resolveExecutorDecisionRow,
    isExecutorDecisionRowPending,
    SeizureDecisionPendingMirrorFooter,
    dispatchFooterSeizureAction,
    list,
    resolveThirdPartySeizureForLog,
} from './unifiedSeizureLogEntryFooterHelpers';
import type { UnifiedSeizureLogFooterBranchCtx } from './UnifiedSeizureLogFooterBranchCtx';

export function renderSalaryThirdPartySeizureLogFooterBranches(
    ctx: UnifiedSeizureLogFooterBranchCtx,
): React.ReactNode | undefined {
    const {
        props,
        entry,
        salarySeizureTabRows,
        thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi,
        salaryAssetOverrides,
        setSalaryAssetOverrides,
    } = ctx;
        if (entry.id.startsWith('salary_decision:')) {
            const did = String(entry.entityId || '').trim();
            const exId = coalesceDecisionsStorageExecutionId({
                decisionsStorageExecutionId: props.decisionsStorageExecutionId,
                executionId: props.executionId,
                executionData: props.executionData as Record<string, unknown> | null,
            });
            if (!did || !exId) return null;
            const row = resolveExecutorDecisionRow(props.seizureLogExecutorDecisions, did);
            const pendingMirror = (
                <SeizureDecisionPendingMirrorFooter
                    executionId={exId}
                    decisionId={did}
                    row={row}
                    appealPerspective={props.appealPerspective}
                />
            );
            if (isExecutorDecisionRowPending(row)) return pendingMirror;
            return (
                <>
                    {pendingMirror}
                    <button
                        type="button"
                        onClick={() => dispatchFooterSeizureAction(exId, did, 'salary_completion', entry.title)}
                        className="w-full rounded-2xl border border-sky-400/35 bg-sky-500/15 px-3 py-3 text-[11px] font-black text-sky-100 hover:bg-sky-500/22"
                    >
                        إكمال بيانات الراتب بعد موافقة المنفذ
                    </button>
                </>
            );
        }

        if (entry.id.startsWith('third_party_decision:')) {
            const did = String(entry.entityId || '').trim();
            const exId = coalesceDecisionsStorageExecutionId({
                decisionsStorageExecutionId: props.decisionsStorageExecutionId,
                executionId: props.executionId,
                executionData: props.executionData as Record<string, unknown> | null,
            });
            if (!did || !exId) return null;
            const row = resolveExecutorDecisionRow(props.seizureLogExecutorDecisions, did);
            const pendingMirror = (
                <SeizureDecisionPendingMirrorFooter
                    executionId={exId}
                    decisionId={did}
                    row={row}
                    appealPerspective={props.appealPerspective}
                />
            );
            if (isExecutorDecisionRowPending(row)) return pendingMirror;
            return (
                <>
                    {pendingMirror}
                    <button
                        type="button"
                        onClick={() => dispatchFooterSeizureAction(exId, did, 'third_party', entry.title)}
                        className="w-full rounded-2xl border border-violet-400/35 bg-violet-500/15 px-3 py-3 text-[11px] font-black text-violet-100 hover:bg-violet-500/22"
                    >
                        إكمال بيانات حجز لدى الغير
                    </button>
                </>
            );
        }

        if (entry.kind === 'salary' && entry.entityId) {
            const entityId = String(entry.entityId);
            const baseAsset = salarySeizureTabRows.find((x) => String(x.id) === entityId);
            const asset = salaryAssetOverrides[entityId] ?? baseAsset;
            if (!asset) return null;
            const locked = Boolean(asset.seizure_record_locked);
            const releasedLocked = locked && String(asset.status) === 'released';
            const isPending = String(asset.status) === 'pending';
            const storageExecutionId = coalesceDecisionsStorageExecutionId({
                decisionsStorageExecutionId: props.decisionsStorageExecutionId,
                executionId: props.executionId,
                executionData: props.executionData as Record<string, unknown> | null,
            });
            const patchSalaryDetails = (assetId: string, patch: SalarySeizureDetailsPatch) => {
                const handler = props.patchSalarySeizureAssetDetails;
                if (typeof handler === 'function' && !isExecutionHandlerStubLeaf(handler)) {
                    handler(assetId, patch);
                    return;
                }
                const mergedAssets = mergeSeizedAssetLists(
                    list(props.executionData?.seizedAssets) as SeizedAsset[],
                    salarySeizureTabRows as SeizedAsset[],
                );
                const nextAssets = applySalarySeizureAssetDetailsPatch(
                    mergedAssets,
                    assetId,
                    patch,
                    {
                        activeDebtorIsDeceased: Boolean(props.activeDebtorIsDeceased),
                        executionData: props.executionData ?? null,
                        storageExecutionId,
                    },
                );
                const patched = nextAssets.find((row) => String(row.id) === String(assetId));
                if (patched) {
                    setSalaryAssetOverrides((prev) => ({
                        ...prev,
                        [String(assetId)]: patched,
                    }));
                }
                const persisted = props.persistExecutionMerge({ seizedAssets: nextAssets });
                if (persisted === false) {
                    props.showToast('تعذّر حفظ بيانات سجل الراتب — أعِد المحاولة.', 'error');
                }
            };
            const releaseSeizureAssetRow = (row: SeizedAsset) => {
                const handler = props.releaseSeizureAssetRow;
                if (typeof handler === 'function' && !isExecutionHandlerStubLeaf(handler)) {
                    handler(row);
                    return;
                }
                if (row.seizure_record_locked) {
                    props.showToast('السجل مقفول — استخدم «تراجع» إن كان الحجز قد فُك.', 'warning');
                    return;
                }
                const baseAssets = list(props.executionData?.seizedAssets);
                const mergedAssets =
                    baseAssets.length > 0 ? baseAssets : (salarySeizureTabRows as SeizedAsset[]);
                const releaseRow =
                    mergedAssets.find((a) => String(a.id) === String(row.id)) ?? row;
                const activeCoerciveActions = list(
                    props.executionData?.activeCoerciveActions as string[] | undefined,
                );
                const releasePatch = buildSeizureAssetRowReleasePatch(
                    mergedAssets,
                    releaseRow,
                    activeCoerciveActions,
                    getLocalTodayYmd(),
                    props.nextTimelineId,
                );
                if (!releasePatch) {
                    props.showToast('السجل مقفول — استخدم «تراجع» إن كان الحجز قد فُك.', 'warning');
                    return;
                }
                const prevTimeline = list(props.executionData?.timelineEvents);
                const nextTimeline = [releasePatch.timelineEvent, ...prevTimeline];
                const persisted = props.persistExecutionMerge({
                    seizedAssets: releasePatch.nextAssets,
                    timelineEvents: nextTimeline,
                    activeCoerciveActions: releasePatch.nextActiveCoerciveActions,
                });
                const releasedRow = releasePatch.nextAssets.find(
                    (row) => String(row.id) === String(releaseRow.id),
                );
                if (releasedRow) {
                    setSalaryAssetOverrides((prev) => ({
                        ...prev,
                        [String(releasedRow.id)]: releasedRow,
                    }));
                }
                if (persisted === false) {
                    props.showToast('تعذّر فك الحجز — أعِد المحاولة.', 'error');
                    return;
                }
                if (typeof props.setTimelineEvents === 'function') {
                    props.setTimelineEvents((prev) => {
                        const base = Array.isArray(prev) && prev.length > 0 ? prev : prevTimeline;
                        return [releasePatch.timelineEvent, ...base];
                    });
                }
                props.showToast('تم فك الحجز وإزالة إشارة الحجز من المدين', 'success');
            };
            return (
                <SalarySeizureLogDetailCard
                    asset={asset}
                    executionData={props.executionData ?? null}
                    executionId={storageExecutionId}
                    titleLabel={props.followupSalarySeizureLabel}
                    locked={locked}
                    releasedLocked={releasedLocked}
                    isPending={isPending}
                    onSaveDetails={patchSalaryDetails}
                    onRelease={() => releaseSeizureAssetRow(asset)}
                    showToast={props.showToast}
                />
            );
        }

        if (entry.id.startsWith('third_party_ui:') && entry.entityId) {
            const seizureId = String(entry.entityId).trim();
            const seizure = resolveThirdPartySeizureForLog(
                thirdPartySeizuresUi,
                props.executionData,
                seizureId,
            );
            if (!seizure) return null;
            const reply = String(seizure.replyStatus || '').trim();
            const st = String(seizure.status || '').trim();
            const closed = (st === 'replied' && reply === 'denied') || st === 'funds_received';
            if (closed) return null;
            const resolvedDecisionsExecutionId = requireDecisionsStorageExecutionId({
                decisionsStorageExecutionId: props.decisionsStorageExecutionId,
                executionId: props.executionId,
                executionDataId: props.executionData?.id,
                executionData: props.executionData as Record<string, unknown> | null,
            });
            return (
                <ThirdPartySeizureWorkflowCard
                    seizure={seizure}
                    seizures={
                        thirdPartySeizuresUi.some((s) => String(s?.id || '').trim() === seizureId)
                            ? thirdPartySeizuresUi
                            : [...thirdPartySeizuresUi, seizure]
                    }
                    fundsDraft={String(props.thirdPartyFundsDraftById[seizureId] ?? '')}
                    onFundsDraftChange={(v) =>
                        props.setThirdPartyFundsDraftById((prev) => ({ ...prev, [seizureId]: v }))
                    }
                    onSeizuresChange={props.setThirdPartySeizuresUi}
                    persistExecutionMerge={props.persistExecutionMerge}
                    setTimelineEvents={props.setTimelineEvents}
                    nextTimelineId={props.nextTimelineId}
                    showToast={props.showToast}
                    onCreditToFinancialCenter={(amountIqd) => {
                        const exId = resolvedDecisionsExecutionId;
                        const nowIso = new Date().toISOString();
                        const result = creditThirdPartySeizureFunds(
                            exId,
                            {
                                amountIqd,
                                thirdPartySeizureId: seizureId,
                                thirdPartyName: String(seizure.thirdPartyName || ''),
                                at: nowIso,
                            },
                            props.getLedgerParams()
                        );
                        if (result.ok) props.onLedgerRevision();
                        return { ok: result.ok };
                    }}
                />
            );
        }

        if (entry.id.startsWith('third_party:') && entry.entityId) {
            const assetId = String(entry.entityId).trim();
            const asset =
                thirdPartySeizureRegistryAssets.find((a) => String(a.id || '').trim() === assetId) ||
                null;
            if (!asset) return null;
            return (
                <ThirdPartySeizureRegistryCard
                    asset={asset}
                    beginReceive={props.beginThirdPartyReceiveStep}
                    updateReceiveDraft={props.updateThirdPartyReceiveDraft}
                    cancelReceive={props.cancelThirdPartyReceiveStep}
                    confirmReceive={props.confirmThirdPartyReceive}
                />
            );
        }

    return undefined;
}
