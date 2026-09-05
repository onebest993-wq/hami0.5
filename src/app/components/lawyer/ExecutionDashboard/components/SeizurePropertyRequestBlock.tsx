import React from 'react';
import { Landmark } from '@/app/components/ui/icons/Landmark';
import { InlineActionGate } from './InlineActionGate';
import { SeizureRequestBlock } from './SeizureRequestBlock';
import { SeizureApprovedPlanBadge } from './SeizureApprovedPlanBadge';
import { SeizureExecutorDecisionShortcut } from './SeizureExecutorDecisionShortcut';
import type { SharedAssetBlockProps } from './SeizureRequestsTabAssetCompletions';

/** زر طلب حجز عقار فقط — بلا أكورديون/إكمال/سجل */
export function SeizurePropertyRequestBlock(
    props: SharedAssetBlockProps & { propertyDecision?: Record<string, unknown> | null },
) {
    const {
        seizureActionsDisabled,
        inlineActionGateKey,
        setInlineActionGateKey,
        submitBasicSeizureRequest,
        resolvedExecutionId,
        openDecisions,
        propertyDecision,
    } = props;

    return (
        <SeizureRequestBlock
            disabled={seizureActionsDisabled}
            className="w-full rounded-xl border border-amber-300/15 bg-amber-500/[0.06] hover:bg-amber-500/[0.10] hover:border-amber-200/25"
            onClick={() => {
                if (seizureActionsDisabled) return;
                setInlineActionGateKey('seizure_property');
            }}
            icon={
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 ring-1 ring-amber-300/20">
                    <Landmark className="h-4 w-4 text-amber-200/90" />
                </span>
            }
            label={<span>طلب حجز عقار</span>}
            trailingSlot={
                <>
                    <SeizureExecutorDecisionShortcut
                        decision={propertyDecision}
                        onOpen={openDecisions}
                        expectedSubtype="property"
                    />
                    <SeizureApprovedPlanBadge
                        executionId={resolvedExecutionId}
                        decision={propertyDecision}
                        subtype="property"
                        requestTitle="طلب حجز عقار"
                    />
                </>
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
                            body: 'طلب حجز عقار (مبدئي) — يُبتّ من مركز القرارات والطعون.',
                            subtype: 'property',
                        });
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
            }
        />
    );
}
