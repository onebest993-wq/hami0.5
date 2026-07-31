import React from 'react';
import { Building2, Package, Users } from 'lucide-react';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    dispatchDecisionsReload,
    patchExecutorDecisionRowEverywhere,
} from '@/app/utils/executorSeizureDecisionQueue';
import { ExecutionInlineAccordion } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { parseExecutionAmountInt } from '@/app/utils/execution/amountInput';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { SeizureLogNavigateBadge } from './SeizureLogNavigateBadge';
import { SeizureRequestBlock } from './SeizureRequestBlock';
import {
    SeizurePropertyCompletionForm,
    SeizureThirdPartyCompletionForm,
    SeizureVehicleCompletionForm,
    type PropertyCompletionDraft,
    type VehicleCompletionDraft,
} from './SeizureRequestCompletionForms';
import {
    isSeizureRegistrationComplete,
    isSeizureRequestFullyRegistered,
    parseIsoFromYmd,
    type UnifiedSeizureLogTab,
} from './seizureRequestsTabHelpers';
import { buildSeizureRequestSteps } from './seizureRequestsTabDecisionSteps';

type SubmitBasicSeizureRequest = (args: {
    actionType: 'salary' | 'property' | 'vehicle' | 'third_party';
    title: string;
    body: string;
    subtype: any;
}) => string | null;

type SharedAssetBlockProps = {
    seizureActionsDisabled: boolean;
    decisions: Record<string, unknown>[];
    resolvedExecutionId: string;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    acknowledgeSeizureRequestFromLog: (tab: UnifiedSeizureLogTab) => void;
    submitBasicSeizureRequest: SubmitBasicSeizureRequest;
    requestFollowupSeizureDecision?: (
        subtype: 'third_party',
        title: string,
        body: string,
    ) => void;
    openAppeals: (decisionId?: string) => void;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
};

function PropertyCompletion(props: {
    row: any;
    decisions: Record<string, unknown>[];
    draftByDecisionId: Record<string, PropertyCompletionDraft>;
    setDraftByDecisionId: React.Dispatch<
        React.SetStateAction<Record<string, PropertyCompletionDraft>>
    >;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
}): React.ReactNode {
    const { row, decisions, draftByDecisionId, setDraftByDecisionId, saveCoerciveAction, showToast } =
        props;
    const decisionId = String(row?.id || '').trim();
    if (!decisionId) return null;
    if (!isExecutorRowApprovedWorkflowActive(row, decisions)) return null;
    const savedAt = String(row.seizureRequestSavedAt || '').trim();
    if (savedAt) return null;
    const draft = draftByDecisionId[decisionId] || {
        propertyNumber: '',
        propertyDistrict: '',
        propertyType: '',
    };
    return (
        <SeizurePropertyCompletionForm
            draft={draft}
            onDraftChange={(next) =>
                setDraftByDecisionId((prev) => ({
                    ...prev,
                    [decisionId]: next,
                }))
            }
            showToast={showToast}
            onSave={(next) => {
                saveCoerciveAction('property', {
                    decisionRowId: decisionId,
                    propertyNumber: String(next.propertyNumber || '').trim(),
                    propertyDistrict: String(next.propertyDistrict || '').trim(),
                    propertyType: String(next.propertyType || '').trim(),
                });
            }}
        />
    );
}

function VehicleCompletion(props: {
    row: any;
    decisions: Record<string, unknown>[];
    draftByDecisionId: Record<string, VehicleCompletionDraft>;
    setDraftByDecisionId: React.Dispatch<
        React.SetStateAction<Record<string, VehicleCompletionDraft>>
    >;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
}): React.ReactNode {
    const { row, decisions, draftByDecisionId, setDraftByDecisionId, saveCoerciveAction, showToast } =
        props;
    const decisionId = String(row?.id || '').trim();
    if (!decisionId) return null;
    if (!isExecutorRowApprovedWorkflowActive(row, decisions)) return null;
    const savedAt = String(row.seizureRequestSavedAt || '').trim();
    if (savedAt) return null;
    const draft = draftByDecisionId[decisionId] || {
        movableDescription: '',
        movableLocation: '',
    };
    return (
        <SeizureVehicleCompletionForm
            draft={draft}
            onDraftChange={(next) =>
                setDraftByDecisionId((prev) => ({
                    ...prev,
                    [decisionId]: next,
                }))
            }
            showToast={showToast}
            onSave={(next) => {
                saveCoerciveAction('vehicle', {
                    decisionRowId: decisionId,
                    movableDescription: String(next.movableDescription || '').trim(),
                    movableLocation: String(next.movableLocation || '').trim(),
                });
            }}
        />
    );
}

function ThirdPartyInlineCompletion(props: {
    row: any;
    decisions: Record<string, unknown>[];
    thirdPartyNameDraft: string;
    thirdPartyAmountDraft: string;
    setThirdPartyNameDraft: (v: string) => void;
    setThirdPartyAmountDraft: (v: string) => void;
    resolvedExecutionId: string;
    executionData: ExecutionFile | null;
    getLocalTodayYmd: () => string;
    pushTimelineEvent: (event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
}): React.ReactNode {
    const {
        row,
        decisions,
        thirdPartyNameDraft,
        thirdPartyAmountDraft,
        setThirdPartyNameDraft,
        setThirdPartyAmountDraft,
        resolvedExecutionId,
        executionData,
        getLocalTodayYmd,
        pushTimelineEvent,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
    } = props;
    if (!row?.id) return null;
    if (!isExecutorRowApprovedWorkflowActive(row, decisions)) return null;
    const savedAt = String(row.seizureRequestSavedAt || '').trim();
    if (savedAt) return null;

    const name = String(thirdPartyNameDraft || '').trim();
    const amount = parseExecutionAmountInt(thirdPartyAmountDraft);
    const notifyYmd = getLocalTodayYmd();
    const iso = parseIsoFromYmd(notifyYmd);
    const canSave = Boolean(name) && amount > 0 && Boolean(resolvedExecutionId);

    return (
        <SeizureThirdPartyCompletionForm
            nameDraft={thirdPartyNameDraft}
            amountDraft={thirdPartyAmountDraft}
            onNameChange={setThirdPartyNameDraft}
            onAmountChange={setThirdPartyAmountDraft}
            canSave={canSave}
            onSave={() => {
                if (!canSave || !resolvedExecutionId) return;
                const decisionId = String(row.id || '').trim();
                const entityId = `tps_${decisionId}_${Date.now()}`;
                const notificationDateIso = iso ?? new Date().toISOString();
                const nextSeizure = {
                    id: entityId,
                    decisionRowId: decisionId,
                    thirdPartyName: name,
                    requestedAmountIqd: amount,
                    notificationDateIso,
                    replyStatus: 'pending',
                    transferredAmountIqd: null,
                    status: 'notified',
                };
                const prev = Array.isArray((executionData as any)?.thirdPartySeizures)
                    ? ((executionData as any).thirdPartySeizures as any[])
                    : [];
                const nextSeizures = [
                    nextSeizure,
                    ...prev.filter((x) => String(x?.id || '') !== entityId),
                ];

                const nowIso = new Date().toISOString();
                pushTimelineEvent(
                    {
                        id: nextTimelineId(),
                        date: notifyYmd,
                        timestamp: nowIso,
                        title: '📨 حجز مال المدين لدى الغير — تم التسجيل',
                        description: `الجهة: ${name}\nالمبلغ المطلوب حجزه: ${amount.toLocaleString('ar-IQ')} د.ع.`,
                        type: 'coercive',
                        source: 'التنفيذ والمحجوزات',
                        metadata: {
                            thirdPartySeizureId: entityId,
                            decisionRowId: decisionId,
                            timelineThreadKey: `third_party_seizure:${decisionId}`,
                        },
                    },
                    { mergePatch: { thirdPartySeizures: nextSeizures } }
                );

                const patched = patchExecutorDecisionRowEverywhere(decisionId, {
                    seizureRequestSavedAt: nowIso,
                    seizureRequestDetails: [
                        `الجهة: ${name}`,
                        `المبلغ المطلوب حجزه: ${amount.toLocaleString('ar-IQ')} د.ع`,
                    ].join('\n'),
                    seizurePayloadJson: JSON.stringify({
                        thirdPartySeizureId: entityId,
                        thirdPartyName: name,
                        requestedAmountIqd: amount,
                        notificationDateIso,
                    }),
                });
                if (!patched.ok) {
                    showToast('تعذّر ربط الحفظ ببطاقة القرار — أعد المحاولة.', 'warning');
                    return;
                }
                dispatchDecisionsReload();

                persistExecutionMerge({ thirdPartySeizures: nextSeizures });
                setThirdPartyNameDraft('');
                setThirdPartyAmountDraft('');
                showToast('تم الحفظ — اكتملت دورة الطلب.', 'success');
            }}
        />
    );
}

export function SeizureMovableRequestBlock(
    props: SharedAssetBlockProps & {
        movableDecision: any;
        vehicleDetailsDraftByDecisionId: Record<string, VehicleCompletionDraft>;
        setVehicleDetailsDraftByDecisionId: React.Dispatch<
            React.SetStateAction<Record<string, VehicleCompletionDraft>>
        >;
    }
) {
    const {
        seizureActionsDisabled,
        decisions,
        resolvedExecutionId,
        inlineActionGateKey,
        setInlineActionGateKey,
        acknowledgeSeizureRequestFromLog,
        submitBasicSeizureRequest,
        openAppeals,
        saveCoerciveAction,
        showToast,
        movableDecision,
        vehicleDetailsDraftByDecisionId,
        setVehicleDetailsDraftByDecisionId,
    } = props;

    const movableSettled =
        movableDecision && isSeizureRequestFullyRegistered(movableDecision, decisions);
    const movableLogReady =
        movableDecision && isSeizureRegistrationComplete(movableDecision, decisions);

    return (
        <SeizureRequestBlock
            disabled={seizureActionsDisabled}
            className="w-full rounded-2xl border border-sky-300/15 bg-sky-500/[0.06] hover:bg-sky-500/[0.10] hover:border-sky-200/25"
            onClick={() => {
                if (seizureActionsDisabled) return;
                if (movableSettled) {
                    acknowledgeSeizureRequestFromLog('movable');
                    return;
                }
                setInlineActionGateKey('seizure_vehicle');
            }}
            icon={
                <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                    <Package className="w-6 h-6 text-white/70" />
                </span>
            }
            label={
                <span className="flex flex-col items-end gap-0.5">
                    <span>طلب حجز مال منقول</span>
                    {movableSettled ? (
                        <span className="text-[10px] font-semibold text-sky-200/80">
                            تم التسجيل — اضغط أو «السجل» للمتابعة
                        </span>
                    ) : null}
                </span>
            }
            trailingSlot={
                movableLogReady ? (
                    <SeizureLogNavigateBadge
                        tab="movable"
                        tone="sky"
                        onAcknowledgeCycle={() => acknowledgeSeizureRequestFromLog('movable')}
                    />
                ) : null
            }
            afterButton={
                <InlineActionGate
                    gateKey="seizure_vehicle"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => {
                        setInlineActionGateKey(null);
                        submitBasicSeizureRequest({
                            actionType: 'vehicle',
                            title: 'طلب حجز مال منقول',
                            body: 'طلب حجز مال منقول (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.',
                            subtype: 'movable_auction',
                        });
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
            }
        >
            {movableDecision && !movableSettled ? (
                <div className="mt-2">
                    <ExecutionInlineAccordion
                        steps={buildSeizureRequestSteps({
                            title: 'طلب حجز مال منقول',
                            row: movableDecision,
                            requestKind: 'seizure',
                            decisions,
                            resolvedExecutionId,
                            onOpenAppeals: openAppeals,
                            extra: (
                                <VehicleCompletion
                                    row={movableDecision}
                                    decisions={decisions}
                                    draftByDecisionId={vehicleDetailsDraftByDecisionId}
                                    setDraftByDecisionId={setVehicleDetailsDraftByDecisionId}
                                    saveCoerciveAction={saveCoerciveAction}
                                    showToast={showToast}
                                />
                            ),
                        })}
                    />
                </div>
            ) : null}
        </SeizureRequestBlock>
    );
}

export function SeizureThirdPartyRequestBlock(
    props: SharedAssetBlockProps & {
        thirdPartyDecision: any;
        thirdPartyNameDraft: string;
        thirdPartyAmountDraft: string;
        setThirdPartyNameDraft: (v: string) => void;
        setThirdPartyAmountDraft: (v: string) => void;
        executionData: ExecutionFile | null;
        getLocalTodayYmd: () => string;
        pushTimelineEvent: (event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void;
        nextTimelineId: () => string;
        persistExecutionMerge: (patch: Record<string, unknown>) => void;
    }
) {
    const {
        seizureActionsDisabled,
        decisions,
        resolvedExecutionId,
        inlineActionGateKey,
        setInlineActionGateKey,
        acknowledgeSeizureRequestFromLog,
        openAppeals,
        showToast,
        submitBasicSeizureRequest,
        requestFollowupSeizureDecision,
        thirdPartyDecision,
        thirdPartyNameDraft,
        thirdPartyAmountDraft,
        setThirdPartyNameDraft,
        setThirdPartyAmountDraft,
        executionData,
        getLocalTodayYmd,
        pushTimelineEvent,
        nextTimelineId,
        persistExecutionMerge,
    } = props;

    const thirdPartySettled =
        thirdPartyDecision && isSeizureRequestFullyRegistered(thirdPartyDecision, decisions);
    const thirdPartyLogReady =
        thirdPartyDecision && isSeizureRegistrationComplete(thirdPartyDecision, decisions);

    return (
        <SeizureRequestBlock
            disabled={seizureActionsDisabled}
            className="w-full rounded-2xl border border-violet-300/15 bg-violet-500/[0.06] hover:bg-violet-500/[0.10] hover:border-violet-200/25"
            onClick={() => {
                if (seizureActionsDisabled) return;
                if (thirdPartySettled) {
                    acknowledgeSeizureRequestFromLog('third_party');
                    return;
                }
                setInlineActionGateKey('seizure_third_party');
            }}
            icon={
                <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                    <Users className="w-6 h-6 text-white/70" />
                </span>
            }
            label={
                <span className="flex flex-col items-end gap-0.5">
                    <span>طلب حجز مال المدين لدى الغير</span>
                    {thirdPartySettled ? (
                        <span className="text-[10px] font-semibold text-violet-200/80">
                            تم التسجيل — اضغط أو «السجل» للمتابعة
                        </span>
                    ) : null}
                </span>
            }
            trailingSlot={
                thirdPartyLogReady ? (
                    <SeizureLogNavigateBadge
                        tab="third_party"
                        tone="violet"
                        onAcknowledgeCycle={() => acknowledgeSeizureRequestFromLog('third_party')}
                    />
                ) : null
            }
            afterButton={
                <InlineActionGate
                    gateKey="seizure_third_party"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => {
                        setInlineActionGateKey(null);
                        if (requestFollowupSeizureDecision) {
                            requestFollowupSeizureDecision(
                                'third_party',
                                'حجز مال المدين لدى الغير',
                                'طلب حجز مال المدين لدى الغير وفقاً لإجراءات التنفيذ.',
                            );
                            return;
                        }
                        submitBasicSeizureRequest({
                            actionType: 'third_party',
                            title: 'حجز مال المدين لدى الغير',
                            body: 'طلب حجز مال المدين لدى الغير وفقاً لإجراءات التنفيذ.',
                            subtype: 'third_party',
                        });
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
            }
        >
            {thirdPartyDecision && !thirdPartySettled ? (
                <div className="mt-2">
                    <ExecutionInlineAccordion
                        steps={buildSeizureRequestSteps({
                            title: 'طلب حجز مال المدين لدى الغير',
                            row: thirdPartyDecision,
                            requestKind: 'seizure',
                            decisions,
                            resolvedExecutionId,
                            onOpenAppeals: openAppeals,
                            extra: (
                                <ThirdPartyInlineCompletion
                                    row={thirdPartyDecision}
                                    decisions={decisions}
                                    thirdPartyNameDraft={thirdPartyNameDraft}
                                    thirdPartyAmountDraft={thirdPartyAmountDraft}
                                    setThirdPartyNameDraft={setThirdPartyNameDraft}
                                    setThirdPartyAmountDraft={setThirdPartyAmountDraft}
                                    resolvedExecutionId={resolvedExecutionId}
                                    executionData={executionData}
                                    getLocalTodayYmd={getLocalTodayYmd}
                                    pushTimelineEvent={pushTimelineEvent}
                                    nextTimelineId={nextTimelineId}
                                    persistExecutionMerge={persistExecutionMerge}
                                    showToast={showToast}
                                />
                            ),
                        })}
                    />
                </div>
            ) : null}
        </SeizureRequestBlock>
    );
}

export function SeizurePropertyRequestBlock(
    props: SharedAssetBlockProps & {
        propertyDecision: any;
        propertyDetailsDraftByDecisionId: Record<string, PropertyCompletionDraft>;
        setPropertyDetailsDraftByDecisionId: React.Dispatch<
            React.SetStateAction<Record<string, PropertyCompletionDraft>>
        >;
    }
) {
    const {
        seizureActionsDisabled,
        decisions,
        resolvedExecutionId,
        inlineActionGateKey,
        setInlineActionGateKey,
        acknowledgeSeizureRequestFromLog,
        submitBasicSeizureRequest,
        openAppeals,
        saveCoerciveAction,
        showToast,
        propertyDecision,
        propertyDetailsDraftByDecisionId,
        setPropertyDetailsDraftByDecisionId,
    } = props;

    const propertySettled =
        propertyDecision && isSeizureRequestFullyRegistered(propertyDecision, decisions);
    const propertyLogReady =
        propertyDecision && isSeizureRegistrationComplete(propertyDecision, decisions);

    return (
        <SeizureRequestBlock
            disabled={seizureActionsDisabled}
            className="w-full rounded-2xl border border-amber-300/15 bg-amber-500/[0.06] hover:bg-amber-500/[0.10] hover:border-amber-200/25"
            onClick={() => {
                if (seizureActionsDisabled) return;
                if (propertySettled) {
                    acknowledgeSeizureRequestFromLog('property');
                    return;
                }
                setInlineActionGateKey('seizure_property');
            }}
            icon={
                <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                    <Building2 className="w-6 h-6 text-white/70" />
                </span>
            }
            label={
                <span className="flex flex-col items-end gap-0.5">
                    <span>طلب حجز عقار</span>
                    {propertySettled ? (
                        <span className="text-[10px] font-semibold text-amber-200/80">
                            تم التسجيل — اضغط أو «السجل» للمتابعة
                        </span>
                    ) : null}
                </span>
            }
            trailingSlot={
                propertyLogReady ? (
                    <SeizureLogNavigateBadge
                        tab="property"
                        tone="amber"
                        onAcknowledgeCycle={() => acknowledgeSeizureRequestFromLog('property')}
                    />
                ) : null
            }
            afterButton={
                <InlineActionGate
                    gateKey="seizure_property"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => {
                        setInlineActionGateKey(null);
                        submitBasicSeizureRequest({
                            actionType: 'property',
                            title: 'طلب حجز عقار',
                            body: 'طلب حجز عقار (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.',
                            subtype: 'property',
                        });
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
            }
        >
            {propertyDecision && !propertySettled ? (
                <div className="mt-2">
                    <ExecutionInlineAccordion
                        steps={buildSeizureRequestSteps({
                            title: 'طلب حجز عقار',
                            row: propertyDecision,
                            requestKind: 'seizure',
                            decisions,
                            resolvedExecutionId,
                            onOpenAppeals: openAppeals,
                            extra: (
                                <PropertyCompletion
                                    row={propertyDecision}
                                    decisions={decisions}
                                    draftByDecisionId={propertyDetailsDraftByDecisionId}
                                    setDraftByDecisionId={setPropertyDetailsDraftByDecisionId}
                                    saveCoerciveAction={saveCoerciveAction}
                                    showToast={showToast}
                                />
                            ),
                        })}
                    />
                </div>
            ) : null}
        </SeizureRequestBlock>
    );
}
