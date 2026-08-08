// @ts-nocheck
import React from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty, ThirdPartySeizure } from '@/app/types/execution';
import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/UnifiedSeizureLogModal';
import { SeizedPropertyWorkflowPanel } from '@/app/components/lawyer/ExecutionDashboard/components/SeizedPropertyWorkflowPanel';
import { SeizedMovableWorkflowPanel } from '@/app/components/lawyer/ExecutionDashboard/components/SeizedMovableWorkflowPanel';
import { MovableSeizureInitInlineCard } from '@/app/components/lawyer/ExecutionDashboard/components/MovableSeizureInitInlineCard';
import type { SaveSeizedMovableInitInput } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardFollowupSeizureInits';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
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
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';
import {
    mergeSeizedMovableLists,
    mergeSeizedPropertyLists,
    mergeSeizedAssetLists,
} from '@/app/components/lawyer/ExecutionDashboard/utils/executionPhoneBodyExecutionDataMerge';
import { creditThirdPartySeizureFunds } from '@/app/components/lawyer/ExecutionDashboard/utils/thirdPartyFundsReceivedOutcomeUtils';
import {
    coalesceDecisionsStorageExecutionId,
    requireDecisionsStorageExecutionId,
} from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import { isExecutionHandlerStubLeaf } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionHandlerClusterStubs';
import { applySalarySeizureAssetDetailsPatch } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardSalarySeizurePatch';
import { buildSeizureAssetRowReleasePatch } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardSeizureRowPatch';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    dispatchUnifiedSeizureLogFooterAction,
} from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogFooterNavigation';
import { ExecutorDecisionFollowupMirror } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutorDecisionFollowupMirror';

export type UnifiedSeizureLogEntryFooterProps = {
    entry: UnifiedSeizureLogEntry;
    seizedPropertiesForSeizureLog: SeizedProperty[];
    seizedMovablesForSeizureLog: SeizedMovable[];
    realEstateSeizureRegistryAssets: unknown[];
    movableSeizureRegistryAssets: SeizedAsset[];
    salarySeizureTabRows: SeizedAsset[];
    thirdPartySeizureRegistryAssets: any[];
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
    saveSeizedMovableInitForDecision: (input: SaveSeizedMovableInitInput) => SeizedMovable | null | void;
    movableInlineSaveCtx: MovableInlineSaveContext;
    followupSalarySeizureLabel: string;
    activeDebtorIsDeceased?: boolean;
    patchSalarySeizureAssetDetails: (assetId: string, patch: SalarySeizureDetailsPatch) => void;
    releaseSeizureAssetRow: (asset: SeizedAsset) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    setTimelineEvents: React.Dispatch<React.SetStateAction<any[]>>;
    nextTimelineId: () => string;
    getLedgerParams: () => UnifiedLedgerTotalParams | null;
    onLedgerRevision: () => void;
    beginThirdPartyReceiveStep: (asset: SeizedAsset) => void;
    updateThirdPartyReceiveDraft: (assetId: string, v: string) => void;
    cancelThirdPartyReceiveStep: (asset: SeizedAsset) => void;
    confirmThirdPartyReceive: (asset: SeizedAsset) => void;
};

function resolveExecutorDecisionRow(
    decisions: Array<Record<string, unknown>>,
    decisionId: string,
): Record<string, unknown> | null {
    const did = String(decisionId || '').trim();
    if (!did) return null;
    return decisions.find((row) => String(row?.id || '').trim() === did) || null;
}

function isExecutorDecisionRowPending(row: Record<string, unknown> | null): boolean {
    if (!row) return false;
    const outcome = String(row.executorOutcome ?? 'pending').trim();
    return !outcome || outcome === 'pending';
}

function SeizureDecisionPendingMirrorFooter(props: {
    executionId: string;
    decisionId: string;
    row: Record<string, unknown> | null;
    appealPerspective: string;
    onOutcomeApplied?: () => void;
}) {
    if (!props.row || !isExecutorDecisionRowPending(props.row)) return null;
    return (
        <ExecutorDecisionFollowupMirror
            executionId={props.executionId}
            row={props.row}
            appealPerspective={props.appealPerspective}
            onOutcomeApplied={props.onOutcomeApplied}
            className="rounded-2xl border border-amber-500/25 bg-amber-950/20 p-3"
        />
    );
}

function dispatchFooterSeizureAction(
    executionId: string,
    decisionId: string,
    kind: 'property' | 'third_party' | 'salary_completion' | 'guarantor',
    subject?: string,
    guarantorFocusKind?: 'salary' | 'movable' | 'property',
): void {
    dispatchUnifiedSeizureLogFooterAction({
        executionId,
        decisionId,
        kind,
        subject,
        guarantorFocusKind,
    });
}

function inferSeizureWorkflowStatusFromLogEntry(entry: UnifiedSeizureLogEntry): string {
    const code = String(entry.statusCode || '').trim();
    if (code === 'estimated') return 'valued';
    if (code === 'auction_scheduled') return 'published';
    return code || 'seized';
}

function inferMovableWorkflowStatus(rawStatus: string): string {
    if (rawStatus === 'estimated') return 'valued';
    if (rawStatus === 'auction_scheduled') return 'published';
    return rawStatus;
}

function inferPropertyWorkflowStatus(rawStatus: string): string {
    if (rawStatus === 'estimated') return 'valued';
    if (rawStatus === 'auction_scheduled') return 'published';
    return rawStatus;
}

function list<T>(value: T[] | undefined | null): T[] {
    return Array.isArray(value) ? value : [];
}

function mergeSeizedMovables(
    primary: SeizedMovable[],
    executionData?: ExecutionFile | null,
): SeizedMovable[] {
    const fromFile = executionData?.seizedMovables;
    const secondary = Array.isArray(fromFile) ? fromFile : [];
    return mergeSeizedMovableLists(primary, secondary);
}

function mergeSeizedProperties(
    primary: SeizedProperty[],
    executionData?: ExecutionFile | null,
): SeizedProperty[] {
    const fromFile = executionData?.seizedProperties;
    const secondary = Array.isArray(fromFile) ? fromFile : [];
    return mergeSeizedPropertyLists(primary, secondary);
}

function SeizureWorkflowLoadingShell({ label }: { label: string }) {
    return (
        <div
            className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-[10px] font-bold text-slate-400 text-right"
            dir="rtl"
        >
            {label}
        </div>
    );
}

function resolveMovableInlineSaveCtxForUnifiedLog(
    ctx: MovableInlineSaveContext,
    seizedMovables: SeizedMovable[],
    persistExecutionMerge: (patch: Record<string, unknown>) => void,
): MovableInlineSaveContext {
    return {
        ...ctx,
        readMovables: () => {
            const fromCtx = ctx.readMovables?.();
            if (Array.isArray(fromCtx) && fromCtx.length > 0) return fromCtx;
            return seizedMovables;
        },
        persistMovables: (next) => {
            const fromHandler =
                typeof ctx.persistMovables === 'function' && !isExecutionHandlerStubLeaf(ctx.persistMovables)
                    ? ctx.persistMovables(next)
                    : undefined;
            if (fromHandler !== false) return true;
            persistExecutionMerge({ seizedMovables: next });
            return true;
        },
    };
}

export function UnifiedSeizureLogEntryFooter(props: UnifiedSeizureLogEntryFooterProps) {
    const [salaryAssetOverrides, setSalaryAssetOverrides] = React.useState<Record<string, SeizedAsset>>({});
    const seizedPropertiesForSeizureLog = mergeSeizedProperties(
        list(props.seizedPropertiesForSeizureLog),
        props.executionData,
    );
    const seizedMovablesForSeizureLog = mergeSeizedMovables(
        list(props.seizedMovablesForSeizureLog),
        props.executionData,
    );
    const realEstateSeizureRegistryAssets = list(props.realEstateSeizureRegistryAssets);
    const movableSeizureRegistryAssets = list(props.movableSeizureRegistryAssets);
    const salarySeizureTabRows = list(props.salarySeizureTabRows);
    const thirdPartySeizureRegistryAssets = list(props.thirdPartySeizureRegistryAssets);
    const thirdPartySeizuresUi = list(props.thirdPartySeizuresUi);
    const movableInlineSaveCtx = React.useMemo(
        () =>
            resolveMovableInlineSaveCtxForUnifiedLog(
                props.movableInlineSaveCtx,
                seizedMovablesForSeizureLog,
                props.persistExecutionMerge,
            ),
        [
            props.movableInlineSaveCtx,
            seizedMovablesForSeizureLog,
            props.persistExecutionMerge,
        ],
    );
    const { entry } = props;

    if (entry.id.startsWith('property:')) {
        const pid = String(entry.entityId || '').trim();
        const pFromList = seizedPropertiesForSeizureLog.find((x) => String(x.id) === pid);
        const p =
            pFromList ??
            (pid
                ? ({
                      id: pid,
                      status: inferSeizureWorkflowStatusFromLogEntry(entry),
                  } as SeizedProperty)
                : null);
        if (!p) {
            return <SeizureWorkflowLoadingShell label="جاري تحميل سجل العقار وإجراءات الحجز…" />;
        }
        const rawStatus = String(p?.status || '');
        const status = inferPropertyWorkflowStatus(rawStatus);
        return (
            <SeizedPropertyWorkflowPanel
                property={p}
                workflowStatus={status}
                decisionsStorageExecutionId={requireDecisionsStorageExecutionId({
                    decisionsStorageExecutionId: props.decisionsStorageExecutionId,
                    executionId: props.executionId,
                    executionDataId: props.executionData?.id,
                    executionData: props.executionData as Record<string, unknown> | null,
                })}
                executionId={props.executionId}
                executionDataId={props.executionData?.id}
                executionData={props.executionData as Record<string, unknown> | null}
                decisions={props.seizureLogExecutorDecisions}
                properties={seizedPropertiesForSeizureLog}
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
                    onClick={() =>
                        dispatchFooterSeizureAction(exId, did, 'property', entry.title)
                    }
                    className="w-full rounded-2xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-3 text-[11px] font-black text-emerald-100 hover:bg-emerald-500/22"
                >
                    إكمال بيانات العقار وبدء الإجراءات
                </button>
            </>
        );
    }

    if (entry.id.startsWith('real_estate:')) {
        const eid = String(entry.entityId || '').trim();
        const asset =
            realEstateSeizureRegistryAssets.find(
                (a) =>
                    String(a?.id || '').trim() === eid ||
                    String(a?.decisionRowId || '').trim() === eid
            ) || null;
        const did = String(asset?.decisionRowId || '').trim();
        if (!did) return null;
        const exId = coalesceDecisionsStorageExecutionId({
            decisionsStorageExecutionId: props.decisionsStorageExecutionId,
            executionId: props.executionId,
            executionData: props.executionData as Record<string, unknown> | null,
        });
        const row = resolveExecutorDecisionRow(props.seizureLogExecutorDecisions, did);
        const pendingMirror =
            exId ? (
                <SeizureDecisionPendingMirrorFooter
                    executionId={exId}
                    decisionId={did}
                    row={row}
                    appealPerspective={props.appealPerspective}
                />
            ) : null;
        if (isExecutorDecisionRowPending(row)) return pendingMirror;
        return (
            <>
                {pendingMirror}
                <button
                    type="button"
                    onClick={() => {
                        if (!exId) return;
                        dispatchFooterSeizureAction(exId, did, 'property', entry.title);
                    }}
                    className="w-full rounded-2xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-3 text-[11px] font-black text-emerald-100 hover:bg-emerald-500/22"
                >
                    إكمال بيانات العقار وبدء الإجراءات
                </button>
            </>
        );
    }

    if (entry.id.startsWith('movable_entity:') && entry.entityId) {
        const mid = String(entry.entityId).trim();
        const mFromList = seizedMovablesForSeizureLog.find((x) => String(x.id) === mid);
        const m =
            mFromList ??
            ({
                id: mid,
                status: inferSeizureWorkflowStatusFromLogEntry(entry),
            } as SeizedMovable);
        const rawStatus = String(m?.status || '');
        const status = inferMovableWorkflowStatus(rawStatus);
        return (
            <SeizedMovableWorkflowPanel
                movable={m}
                workflowStatus={status}
                decisionsStorageExecutionId={requireDecisionsStorageExecutionId({
                    decisionsStorageExecutionId: props.decisionsStorageExecutionId,
                    executionId: props.executionId,
                    executionDataId: props.executionData?.id,
                    executionData: props.executionData as Record<string, unknown> | null,
                })}
                executionId={props.executionId}
                executionDataId={props.executionData?.id}
                executionData={props.executionData as Record<string, unknown> | null}
                decisions={props.seizureLogExecutorDecisions}
                movables={seizedMovablesForSeizureLog}
                movableInlineSaveCtx={movableInlineSaveCtx}
                showToast={props.showToast}
                decisionsReloadEpoch={props.decisionsReloadEpoch}
                appealPerspective={props.appealPerspective}
            />
        );
    }

    if (entry.id.startsWith('movable:') && entry.entityId) {
        const assetId = String(entry.entityId).trim();
        const asset = movableSeizureRegistryAssets.find((a) => String(a.id) === assetId);
        const det =
            typeof asset?.details === 'object' && asset.details && !Array.isArray(asset.details)
                ? (asset.details as Record<string, unknown>)
                : null;
        const did = String(det?.decisionRowId || '').trim();
        const seized =
            seizedMovablesForSeizureLog.find(
                (x) =>
                    String(x.id) === assetId ||
                    (did && String(x.decisionRowId || '').trim() === did),
            ) || null;
        if (!did && !seized) return null;
        return (
            <MovableSeizureInitInlineCard
                decisionId={did || String(seized?.decisionRowId || '').trim()}
                subject={entry.title}
                seizedMovable={seized}
                movables={seizedMovablesForSeizureLog}
                movableInlineSaveCtx={movableInlineSaveCtx}
                saveSeizedMovableInitForDecision={props.saveSeizedMovableInitForDecision}
                decisionsStorageExecutionId={props.decisionsStorageExecutionId}
                executionId={props.executionId}
                executionDataId={props.executionData?.id}
                executionData={props.executionData as Record<string, unknown> | null}
                decisions={props.seizureLogExecutorDecisions}
                showToast={props.showToast}
                decisionsReloadEpoch={props.decisionsReloadEpoch}
                appealPerspective={props.appealPerspective}
            />
        );
    }

    if (entry.id.startsWith('movable_decision:')) {
        const did = String(entry.entityId || '').trim();
        if (!did) return null;
        const seized = seizedMovablesForSeizureLog.find(
            (x) => String(x.decisionRowId || '').trim() === did,
        );
        return (
            <MovableSeizureInitInlineCard
                decisionId={did}
                subject={entry.title}
                seizedMovable={seized}
                movables={seizedMovablesForSeizureLog}
                movableInlineSaveCtx={movableInlineSaveCtx}
                saveSeizedMovableInitForDecision={props.saveSeizedMovableInitForDecision}
                decisionsStorageExecutionId={props.decisionsStorageExecutionId}
                executionId={props.executionId}
                executionDataId={props.executionData?.id}
                executionData={props.executionData as Record<string, unknown> | null}
                decisions={props.seizureLogExecutorDecisions}
                showToast={props.showToast}
                decisionsReloadEpoch={props.decisionsReloadEpoch}
                appealPerspective={props.appealPerspective}
            />
        );
    }

    if (entry.id.startsWith('guarantor_decision:')) {
        const did = String(entry.entityId || '').trim();
        const exId = coalesceDecisionsStorageExecutionId({
            decisionsStorageExecutionId: props.decisionsStorageExecutionId,
            executionId: props.executionId,
            executionData: props.executionData as Record<string, unknown> | null,
        });
        const focusKind = entry.kind;
        if (!did || !exId || focusKind === 'third_party' || focusKind === 'marks') return null;
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
                    onClick={() =>
                        dispatchFooterSeizureAction(
                            exId,
                            did,
                            'guarantor',
                            entry.title,
                            focusKind as 'salary' | 'movable' | 'property',
                        )
                    }
                    className="w-full rounded-2xl border border-rose-400/35 bg-rose-500/15 px-3 py-3 text-[11px] font-black text-rose-100 hover:bg-rose-500/22"
                >
                    إكمال بيانات حجز الكفيل
                </button>
            </>
        );
    }

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
            if (!persisted) {
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
            if (!persisted) {
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
        const seizure =
            thirdPartySeizuresUi.find((s) => String(s.id || '').trim() === seizureId) || null;
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
                seizures={thirdPartySeizuresUi}
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

    return null;
}
