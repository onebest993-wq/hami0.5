import React from 'react';
import { Building2 } from '@/app/components/ui/icons/Building2';
import { InlineActionGate } from './InlineActionGate';
import { ExecutionInlineAccordion } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { SeizureLogNavigateBadge } from './SeizureLogNavigateBadge';
import { SeizureRequestBlock } from './SeizureRequestBlock';
import type { PropertyCompletionDraft } from './SeizureRequestCompletionForms';
import {
    isSeizureRegistrationComplete,
    isSeizureRequestFullyRegistered,
} from './seizureRequestsTabHelpers';
import { buildSeizureRequestSteps } from './seizureRequestsTabDecisionSteps';
import { dispatchPropertySeizureInlineFocus } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';
import {
    PropertyCompletion,
    seizureRowNeedsInlineCompletion,
    type SeizureAssetDecisionRow,
    type SharedAssetBlockProps,
} from './SeizureRequestsTabAssetCompletions';

export function SeizurePropertyRequestBlock(
    props: SharedAssetBlockProps & {
        propertyDecision: SeizureAssetDecisionRow | null;
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
                if (
                    propertyDecision &&
                    seizureRowNeedsInlineCompletion(propertyDecision, decisions)
                ) {
                    dispatchPropertySeizureInlineFocus(
                        resolvedExecutionId,
                        String(propertyDecision.id || '').trim(),
                        String(propertyDecision.title || '').trim(),
                    );
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
