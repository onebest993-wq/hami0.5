import React from 'react';
import { Handshake } from '@/app/components/ui/icons/Handshake';
import { InlineActionGate } from './InlineActionGate';
import { SeizureRequestBlock } from './SeizureRequestBlock';
import { SeizureApprovedPlanBadge } from './SeizureApprovedPlanBadge';
import { SeizureExecutorDecisionShortcut } from './SeizureExecutorDecisionShortcut';
import type { SharedAssetBlockProps } from './SeizureRequestsTabAssetCompletions';

/** زر طلب حجز لدى الغير فقط — بلا أكورديون/إكمال/سجل */
export function SeizureThirdPartyRequestBlock(
    props: SharedAssetBlockProps & {
        thirdPartyDecision?: Record<string, unknown> | null;
        thirdPartyNameDraft?: unknown;
        thirdPartyAmountDraft?: unknown;
        setThirdPartyNameDraft?: unknown;
        setThirdPartyAmountDraft?: unknown;
        executionData?: unknown;
        getLocalTodayYmd?: unknown;
        pushTimelineEvent?: unknown;
        nextTimelineId?: unknown;
        persistExecutionMerge?: unknown;
    },
) {
    const {
        seizureActionsDisabled,
        inlineActionGateKey,
        setInlineActionGateKey,
        submitBasicSeizureRequest,
        requestFollowupSeizureDecision,
        resolvedExecutionId,
        openDecisions,
        thirdPartyDecision,
    } = props;

    return (
        <SeizureRequestBlock
            disabled={seizureActionsDisabled}
            className="w-full rounded-xl border border-violet-300/15 bg-violet-500/[0.06] hover:bg-violet-500/[0.10] hover:border-violet-200/25"
            onClick={() => {
                if (seizureActionsDisabled) return;
                setInlineActionGateKey('seizure_third_party');
            }}
            icon={
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-400/10 ring-1 ring-violet-300/20">
                    <Handshake className="h-4 w-4 text-violet-200/90" />
                </span>
            }
            label={<span>طلب حجز مال المدين لدى الغير</span>}
            trailingSlot={
                <>
                    <SeizureExecutorDecisionShortcut
                        decision={thirdPartyDecision}
                        onOpen={openDecisions}
                        expectedSubtype="third_party"
                    />
                    <SeizureApprovedPlanBadge
                        executionId={resolvedExecutionId}
                        decision={thirdPartyDecision}
                        subtype="third_party"
                        requestTitle="طلب حجز مال المدين لدى الغير"
                    />
                </>
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
                                'طلب حجز مال المدين لدى الغير — يُبتّ من مركز القرارات والطعون.',
                            );
                            return;
                        }
                        submitBasicSeizureRequest({
                            actionType: 'third_party',
                            title: 'حجز مال المدين لدى الغير',
                            body: 'طلب حجز مال المدين لدى الغير — يُبتّ من مركز القرارات والطعون.',
                            subtype: 'third_party',
                        });
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
            }
        />
    );
}
