import React from 'react';
import { Package } from '@/app/components/ui/icons/Package';
import { InlineActionGate } from './InlineActionGate';
import { ExecutionInlineAccordion } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { SeizureLogNavigateBadge } from './SeizureLogNavigateBadge';
import { SeizureRequestBlock } from './SeizureRequestBlock';
import type { VehicleCompletionDraft } from './SeizureRequestCompletionForms';
import {
    isSeizureRegistrationComplete,
    isSeizureRequestFullyRegistered,
} from './seizureRequestsTabHelpers';
import { buildSeizureRequestSteps } from './seizureRequestsTabDecisionSteps';
import { dispatchMovableSeizureInlineFocus } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';
import {
    VehicleCompletion,
    seizureRowNeedsInlineCompletion,
    type SeizureAssetDecisionRow,
    type SharedAssetBlockProps,
} from './SeizureRequestsTabAssetCompletions';

export function SeizureMovableRequestBlock(
    props: SharedAssetBlockProps & {
        movableDecision: SeizureAssetDecisionRow | null;
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
                if (
                    movableDecision &&
                    seizureRowNeedsInlineCompletion(movableDecision, decisions)
                ) {
                    dispatchMovableSeizureInlineFocus(
                        resolvedExecutionId,
                        String(movableDecision.id || '').trim(),
                        String(movableDecision.title || '').trim(),
                    );
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
