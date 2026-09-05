import React from 'react';
import { Banknote } from '@/app/components/ui/icons/Banknote';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import { SeizureRequestBlock } from './SeizureRequestBlock';
import { SeizureApprovedPlanBadge } from './SeizureApprovedPlanBadge';
import { SeizureExecutorDecisionShortcut } from './SeizureExecutorDecisionShortcut';
import type { SubmitBasicSeizureRequest } from './SeizureRequestsTabAssetCompletions';

/** زر طلب حجز راتب فقط — بلا أكورديون/إكمال/سجل */
export function SeizureRequestsTabSalaryBlock(props: {
    seizureActionsDisabled: boolean;
    hasActiveSalarySeizure?: boolean;
    salaryRequestSettled?: boolean;
    salaryRegistrationAckReady?: boolean;
    salaryLogReady?: boolean;
    salaryRequestTitle: string;
    salaryRowForUi?: unknown;
    activeDebtorIsDeceased: boolean;
    decisions?: unknown;
    resolvedExecutionId?: unknown;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    acknowledgeSeizureRequestFromLog?: unknown;
    openSalarySeizureRequest?: unknown;
    submitBasicSeizureRequest: SubmitBasicSeizureRequest;
    setLastSalaryDecisionId: (id: string) => void;
    openAppeals?: unknown;
    openDecisions?: (decisionId?: string) => void;
    saveCoerciveAction?: unknown;
    showToast?: unknown;
}) {
    const {
        seizureActionsDisabled,
        salaryRequestTitle,
        activeDebtorIsDeceased,
        inlineActionGateKey,
        setInlineActionGateKey,
        submitBasicSeizureRequest,
        setLastSalaryDecisionId,
        resolvedExecutionId,
        openDecisions,
        salaryRowForUi,
    } = props;

    const salaryDecision =
        salaryRowForUi && typeof salaryRowForUi === 'object'
            ? (salaryRowForUi as Record<string, unknown>)
            : null;

    return (
        <SeizureRequestBlock
            disabled={seizureActionsDisabled}
            className="w-full rounded-xl border border-emerald-300/15 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.10] hover:border-emerald-200/25"
            onClick={() => {
                if (seizureActionsDisabled) return;
                setInlineActionGateKey('seizure_salary');
            }}
            icon={
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 ring-1 ring-emerald-300/20">
                    <Banknote className="h-4 w-4 text-emerald-200/90" />
                </span>
            }
            label={<span>{salaryRequestTitle}</span>}
            trailingSlot={
                <>
                    {openDecisions ? (
                        <SeizureExecutorDecisionShortcut
                            decision={salaryDecision}
                            onOpen={openDecisions}
                            expectedSubtype="salary"
                        />
                    ) : null}
                    <SeizureApprovedPlanBadge
                        executionId={
                            typeof resolvedExecutionId === 'string' ? resolvedExecutionId : undefined
                        }
                        decision={salaryDecision}
                        subtype="salary"
                        requestTitle={salaryRequestTitle}
                    />
                </>
            }
            afterButton={
                <InlineActionGate
                    gateKey="seizure_salary"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => {
                        setInlineActionGateKey(null);
                        const did = submitBasicSeizureRequest({
                            actionType: 'salary',
                            title: salaryRequestTitle,
                            body: activeDebtorIsDeceased
                                ? 'طلب حجز الحوافز والمخصصات (مبدئي) — يُبتّ من مركز القرارات والطعون.'
                                : 'طلب حجز راتب (مبدئي) — يُبتّ من مركز القرارات والطعون.',
                            subtype: 'salary',
                        });
                        if (did) setLastSalaryDecisionId(did);
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
            }
        />
    );
}
