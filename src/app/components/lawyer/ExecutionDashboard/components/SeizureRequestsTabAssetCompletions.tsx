import React from 'react';
import type { InlineActionGateKey } from '../types';
import type { ExecutionFile, ThirdPartySeizure, TimelineEvent } from '@/app/types/execution';
import {
    dispatchDecisionsReload,
    patchExecutorDecisionRowEverywhere,
    type SeizureRequestSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { parseExecutionAmountInt } from '@/app/utils/execution/amountInput';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    SeizurePropertyCompletionForm,
    SeizureThirdPartyCompletionForm,
    SeizureVehicleCompletionForm,
    type PropertyCompletionDraft,
    type VehicleCompletionDraft,
} from './SeizureRequestCompletionForms';
import { parseIsoFromYmd, type UnifiedSeizureLogTab } from './seizureRequestsTabHelpers';
import { toastAfterExecutionPersist } from '../helpers/toastAfterExecutionPersist';

export type SeizureAssetDecisionRow = Record<string, unknown> & {
    id?: string;
    title?: string;
    seizureRequestSavedAt?: string;
};

export type AssetBlockToastOptions = {
    decisionsLink?: boolean;
    decisionId?: string;
    decisionsTab?: 'current' | 'previous' | 'appeals';
    [key: string]: unknown;
};

export type AssetBlockShowToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    options?: AssetBlockToastOptions,
) => void;

export function seizureRowNeedsInlineCompletion(
    row: SeizureAssetDecisionRow | null | undefined,
    decisions: Record<string, unknown>[],
): boolean {
    if (!row?.id) return false;
    if (!isExecutorRowApprovedWorkflowActive(row, decisions)) return false;
    return !String(row.seizureRequestSavedAt || '').trim();
}

export type SubmitBasicSeizureRequest = (args: {
    actionType: 'salary' | 'property' | 'vehicle' | 'third_party';
    title: string;
    body: string;
    subtype: SeizureRequestSubtype | string;
}) => string | null;

export type SharedAssetBlockProps = {
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
    showToast: AssetBlockShowToast;
};

export function PropertyCompletion(props: {
    row: SeizureAssetDecisionRow;
    decisions: Record<string, unknown>[];
    draftByDecisionId: Record<string, PropertyCompletionDraft>;
    setDraftByDecisionId: React.Dispatch<
        React.SetStateAction<Record<string, PropertyCompletionDraft>>
    >;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    showToast: AssetBlockShowToast;
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

export function VehicleCompletion(props: {
    row: SeizureAssetDecisionRow;
    decisions: Record<string, unknown>[];
    draftByDecisionId: Record<string, VehicleCompletionDraft>;
    setDraftByDecisionId: React.Dispatch<
        React.SetStateAction<Record<string, VehicleCompletionDraft>>
    >;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    showToast: AssetBlockShowToast;
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

export function ThirdPartyInlineCompletion(props: {
    row: SeizureAssetDecisionRow;
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
    showToast: AssetBlockShowToast;
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
                const nextSeizure: ThirdPartySeizure = {
                    id: entityId,
                    decisionRowId: decisionId,
                    thirdPartyName: name,
                    requestedAmountIqd: amount,
                    notificationDateIso,
                    replyStatus: 'pending',
                    transferredAmountIqd: null,
                    status: 'notified',
                };
                const prev: ThirdPartySeizure[] = Array.isArray(executionData?.thirdPartySeizures)
                    ? executionData.thirdPartySeizures
                    : [];
                const nextSeizures: ThirdPartySeizure[] = [
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

                toastAfterExecutionPersist(
                    persistExecutionMerge({ thirdPartySeizures: nextSeizures }),
                    showToast,
                    'تم الحفظ — اكتملت دورة الطلب.',
                );
                setThirdPartyNameDraft('');
                setThirdPartyAmountDraft('');
            }}
        />
    );
}
