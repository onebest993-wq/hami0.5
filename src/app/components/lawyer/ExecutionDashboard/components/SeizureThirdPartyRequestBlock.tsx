import React from 'react';
import { Users } from '@/app/components/ui/icons/Users';
import { InlineActionGate } from './InlineActionGate';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { ExecutionInlineAccordion } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { SeizureLogNavigateBadge } from './SeizureLogNavigateBadge';
import { SeizureRequestBlock } from './SeizureRequestBlock';
import {
    isSeizureRegistrationComplete,
    isSeizureRequestFullyRegistered,
} from './seizureRequestsTabHelpers';
import { buildSeizureRequestSteps } from './seizureRequestsTabDecisionSteps';
import { dispatchThirdPartySeizureInlineFocus } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';
import {
    ThirdPartyInlineCompletion,
    seizureRowNeedsInlineCompletion,
    type SeizureAssetDecisionRow,
    type SharedAssetBlockProps,
} from './SeizureRequestsTabAssetCompletions';

export function SeizureThirdPartyRequestBlock(
    props: SharedAssetBlockProps & {
        thirdPartyDecision: SeizureAssetDecisionRow | null;
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
                if (
                    thirdPartyDecision &&
                    seizureRowNeedsInlineCompletion(thirdPartyDecision, decisions)
                ) {
                    dispatchThirdPartySeizureInlineFocus(
                        resolvedExecutionId,
                        String(thirdPartyDecision.id || '').trim(),
                        String(thirdPartyDecision.title || '').trim(),
                    );
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
