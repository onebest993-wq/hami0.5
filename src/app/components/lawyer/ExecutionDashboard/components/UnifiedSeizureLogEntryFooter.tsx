// @ts-nocheck
import React from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty, ThirdPartySeizure } from '@/app/types/execution';
import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/UnifiedSeizureLogModal';
import { SeizedPropertyWorkflowPanel } from '@/app/components/lawyer/ExecutionDashboard/components/SeizedPropertyWorkflowPanel';
import {
    SalarySeizureLogDetailCard,
    type SalarySeizureDetailsPatch,
} from '@/app/components/lawyer/ExecutionDashboard/components/SalarySeizureLogDetailCard';
import {
    ThirdPartySeizureRegistryCard,
    ThirdPartySeizureWorkflowCard,
} from '@/app/components/lawyer/execution/ThirdPartySeizureLogCards';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import type { SeizedAsset } from '@/app/types/execution';
import type { UnifiedLedgerTotalParams } from '@/app/components/lawyer/FinancialOperationsCenter/utils';
import { creditThirdPartySeizureFunds } from '@/app/components/lawyer/ExecutionDashboard/utils/thirdPartyFundsReceivedOutcomeUtils';

export type UnifiedSeizureLogEntryFooterProps = {
    entry: UnifiedSeizureLogEntry;
    seizedPropertiesForSeizureLog: SeizedProperty[];
    seizedMovablesForSeizureLog: SeizedMovable[];
    realEstateSeizureRegistryAssets: unknown[];
    movableSeizureRegistryAssets: SeizedAsset[];
    salarySeizureTabRows: SeizedAsset[];
    thirdPartySeizureRegistryAssets: SeizedAsset[];
    thirdPartySeizuresUi: ThirdPartySeizure[];
    thirdPartyFundsDraftById: Record<string, string>;
    setThirdPartyFundsDraftById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setThirdPartySeizuresUi: React.Dispatch<React.SetStateAction<ThirdPartySeizure[]>>;
    decisionsStorageExecutionId?: string;
    executionId?: string;
    executionData?: ExecutionFile | null;
    seizureLogExecutorDecisions: Array<Record<string, unknown>>;
    propertyInlineSaveCtx: PropertyInlineSaveContext;
    decisionsReloadEpoch: number;
    appealPerspective: string;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    focusSeizurePropertyInlineCompletion: (decisionId: string, title: string) => void;
    focusSeizureMovableInlineCompletion: (decisionId: string, title: string) => void;
    followupSalarySeizureLabel: string;
    patchSalarySeizureAssetDetails: (assetId: string, patch: SalarySeizureDetailsPatch) => void;
    releaseSeizureAssetRow: (asset: SeizedAsset) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    setTimelineEvents: React.Dispatch<React.SetStateAction<unknown[]>>;
    nextTimelineId: () => string;
    getLedgerParams: () => UnifiedLedgerTotalParams | null;
    onLedgerRevision: () => void;
    beginThirdPartyReceiveStep: (asset: SeizedAsset) => void;
    updateThirdPartyReceiveDraft: (assetId: string, v: string) => void;
    cancelThirdPartyReceiveStep: (asset: SeizedAsset) => void;
    confirmThirdPartyReceive: (asset: SeizedAsset) => void;
};

export function UnifiedSeizureLogEntryFooter(props: UnifiedSeizureLogEntryFooterProps) {
    const { entry } = props;

    if (entry.id.startsWith('property:')) {
        const pid = String(entry.entityId || '').trim();
        const p = props.seizedPropertiesForSeizureLog.find((x) => String(x.id) === pid);
        if (!p) return null;
        const rawStatus = String(p?.status || '');
        const status =
            rawStatus === 'estimated'
                ? 'valued'
                : rawStatus === 'auction_scheduled'
                  ? 'published'
                  : rawStatus;
        return (
            <SeizedPropertyWorkflowPanel
                property={p}
                workflowStatus={status}
                decisionsStorageExecutionId={props.decisionsStorageExecutionId}
                executionId={props.executionId}
                executionDataId={props.executionData?.id}
                decisions={props.seizureLogExecutorDecisions}
                properties={props.seizedPropertiesForSeizureLog}
                propertyInlineSaveCtx={props.propertyInlineSaveCtx}
                decisionsReloadEpoch={props.decisionsReloadEpoch}
                appealPerspective={props.appealPerspective}
                showToast={props.showToast}
                onOpenAppeals={(did) => {
                    try {
                        window.dispatchEvent(
                            new CustomEvent('hami-open-decisions-modal', {
                                detail: {
                                    executionId: props.decisionsStorageExecutionId,
                                    tab: 'previous',
                                    decisionId: did,
                                },
                            })
                        );
                    } catch {
                        /* ignore */
                    }
                }}
            />
        );
    }

    if (entry.id.startsWith('property_decision:')) {
        const did = String(entry.entityId || '').trim();
        if (!did) return null;
        return (
            <button
                type="button"
                onClick={() => props.focusSeizurePropertyInlineCompletion(did, entry.title)}
                className="w-full rounded-2xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-3 text-[11px] font-black text-emerald-100 hover:bg-emerald-500/22"
            >
                إكمال بيانات العقار وبدء الإجراءات
            </button>
        );
    }

    if (entry.id.startsWith('real_estate:')) {
        const eid = String(entry.entityId || '').trim();
        const asset =
            (props.realEstateSeizureRegistryAssets as any[]).find(
                (a) =>
                    String(a?.id || '').trim() === eid ||
                    String(a?.decisionRowId || '').trim() === eid
            ) || null;
        const did = String(asset?.decisionRowId || '').trim();
        if (!did) return null;
        return (
            <button
                type="button"
                onClick={() => props.focusSeizurePropertyInlineCompletion(did, entry.title)}
                className="w-full rounded-2xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-3 text-[11px] font-black text-emerald-100 hover:bg-emerald-500/22"
            >
                إكمال بيانات العقار وبدء الإجراءات
            </button>
        );
    }

    if (entry.id.startsWith('movable_entity:') && entry.entityId) {
        const mid = String(entry.entityId).trim();
        const m = props.seizedMovablesForSeizureLog.find((x) => String(x.id) === mid);
        const did = String(m?.decisionRowId || '').trim();
        if (!did) return null;
        return (
            <button
                type="button"
                onClick={() => props.focusSeizureMovableInlineCompletion(did, entry.title)}
                className="w-full rounded-2xl border border-sky-400/35 bg-sky-500/15 px-3 py-3 text-[11px] font-black text-sky-100 hover:bg-sky-500/22"
            >
                متابعة إجراءات الحجز المنقول
            </button>
        );
    }

    if (entry.id.startsWith('movable:') && entry.entityId) {
        const assetId = String(entry.entityId).trim();
        const asset = props.movableSeizureRegistryAssets.find((a) => String(a.id) === assetId);
        const det =
            typeof asset?.details === 'object' && asset.details && !Array.isArray(asset.details)
                ? (asset.details as Record<string, unknown>)
                : null;
        const did = String(det?.decisionRowId || '').trim();
        if (!did) return null;
        return (
            <button
                type="button"
                onClick={() => props.focusSeizureMovableInlineCompletion(did, entry.title)}
                className="w-full rounded-2xl border border-sky-400/35 bg-sky-500/15 px-3 py-3 text-[11px] font-black text-sky-100 hover:bg-sky-500/22"
            >
                متابعة إجراءات الحجز المنقول
            </button>
        );
    }

    if (entry.id.startsWith('movable_decision:')) {
        const did = String(entry.entityId || '').trim();
        if (!did) return null;
        return (
            <button
                type="button"
                onClick={() => props.focusSeizureMovableInlineCompletion(did, entry.title)}
                className="w-full rounded-2xl border border-sky-400/35 bg-sky-500/15 px-3 py-3 text-[11px] font-black text-sky-100 hover:bg-sky-500/22"
            >
                إكمال بيانات الحجز المنقول وبدء الإجراءات
            </button>
        );
    }

    if (entry.kind === 'salary' && entry.entityId) {
        const asset = props.salarySeizureTabRows.find((x) => String(x.id) === String(entry.entityId));
        if (!asset) return null;
        const locked = Boolean(asset.seizure_record_locked);
        const releasedLocked = locked && String(asset.status) === 'released';
        const isPending = String(asset.status) === 'pending';
        return (
            <SalarySeizureLogDetailCard
                asset={asset}
                executionData={props.executionData ?? null}
                executionId={
                    String(props.decisionsStorageExecutionId ?? props.executionId ?? '').trim() || undefined
                }
                titleLabel={props.followupSalarySeizureLabel}
                locked={locked}
                releasedLocked={releasedLocked}
                isPending={isPending}
                onSaveDetails={props.patchSalarySeizureAssetDetails}
                onRelease={() => props.releaseSeizureAssetRow(asset)}
                showToast={props.showToast}
            />
        );
    }

    if (entry.id.startsWith('third_party_ui:') && entry.entityId) {
        const seizureId = String(entry.entityId).trim();
        const seizure =
            props.thirdPartySeizuresUi.find((s) => String(s.id || '').trim() === seizureId) || null;
        if (!seizure) return null;
        const reply = String(seizure.replyStatus || '').trim();
        const st = String(seizure.status || '').trim();
        const closed = (st === 'replied' && reply === 'denied') || st === 'funds_received';
        if (closed) return null;
        const resolvedDecisionsExecutionId = String(
            props.decisionsStorageExecutionId ?? props.executionData?.id ?? props.executionId ?? ''
        ).trim();
        return (
            <ThirdPartySeizureWorkflowCard
                seizure={seizure}
                seizures={props.thirdPartySeizuresUi}
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
            props.thirdPartySeizureRegistryAssets.find((a) => String(a.id || '').trim() === assetId) ||
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

    return null;
}
