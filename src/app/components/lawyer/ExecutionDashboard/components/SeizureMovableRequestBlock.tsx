import React from 'react';
import { Truck } from '@/app/components/ui/icons/Truck';
import { InlineActionGate } from './InlineActionGate';
import { SeizureRequestBlock } from './SeizureRequestBlock';
import { SeizureApprovedPlanBadge } from './SeizureApprovedPlanBadge';
import { SeizureExecutorDecisionShortcut } from './SeizureExecutorDecisionShortcut';
import type { SharedAssetBlockProps } from './SeizureRequestsTabAssetCompletions';

/** زر طلب حجز مال منقول فقط — بلا أكورديون/إكمال/سجل */
export function SeizureMovableRequestBlock(
    props: SharedAssetBlockProps & {
        movableDecision?: Record<string, unknown> | null;
        vehicleDetailsDraftByDecisionId?: unknown;
        setVehicleDetailsDraftByDecisionId?: unknown;
    },
) {
    const {
        seizureActionsDisabled,
        inlineActionGateKey,
        setInlineActionGateKey,
        submitBasicSeizureRequest,
        resolvedExecutionId,
        openDecisions,
        movableDecision,
    } = props;

    return (
        <SeizureRequestBlock
            disabled={seizureActionsDisabled}
            className="w-full rounded-xl border border-sky-300/15 bg-sky-500/[0.06] hover:bg-sky-500/[0.10] hover:border-sky-200/25"
            onClick={() => {
                if (seizureActionsDisabled) return;
                setInlineActionGateKey('seizure_vehicle');
            }}
            icon={
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400/10 ring-1 ring-sky-300/20">
                    <Truck className="h-4 w-4 text-sky-200/90" />
                </span>
            }
            label={<span>طلب حجز مال منقول</span>}
            trailingSlot={
                <>
                    <SeizureExecutorDecisionShortcut
                        decision={movableDecision}
                        onOpen={openDecisions}
                        expectedSubtype={['movable', 'movable_auction']}
                    />
                    <SeizureApprovedPlanBadge
                        executionId={resolvedExecutionId}
                        decision={movableDecision}
                        subtype="movable"
                        requestTitle="طلب حجز مال منقول"
                    />
                </>
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
                            body: 'طلب حجز مال منقول (مبدئي) — يُبتّ من مركز القرارات والطعون.',
                            subtype: 'movable_auction',
                        });
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
            }
        />
    );
}
