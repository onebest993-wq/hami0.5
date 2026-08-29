import React from 'react';
import { Lock } from '@/app/components/ui/icons/Lock';
import { Wallet } from '@/app/components/ui/icons/Wallet';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import { ExecutionInlineAccordion } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { SeizureLogNavigateBadge } from './SeizureLogNavigateBadge';
import { SeizureRequestBlock } from './SeizureRequestBlock';
import {
    openUnifiedSeizureLogTab,
    type UnifiedSeizureLogTab,
} from './seizureRequestsTabHelpers';
import { buildSeizureRequestSteps } from './seizureRequestsTabDecisionSteps';
import type {
    SeizureAssetDecisionRow,
    SubmitBasicSeizureRequest,
} from './SeizureRequestsTabAssetCompletions';

export function SeizureRequestsTabSalaryBlock(props: {
    seizureActionsDisabled: boolean;
    hasActiveSalarySeizure: boolean;
    salaryRequestSettled: boolean;
    salaryRegistrationAckReady: boolean;
    salaryLogReady: boolean;
    salaryRequestTitle: string;
    salaryRowForUi: SeizureAssetDecisionRow | null;
    activeDebtorIsDeceased: boolean;
    decisions: Record<string, unknown>[];
    resolvedExecutionId: string;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    acknowledgeSeizureRequestFromLog: (tab: UnifiedSeizureLogTab) => void;
    openSalarySeizureRequest: () => void | Promise<void>;
    submitBasicSeizureRequest: SubmitBasicSeizureRequest;
    setLastSalaryDecisionId: (id: string) => void;
    openAppeals: (decisionId?: string) => void;
}) {
    const {
        seizureActionsDisabled,
        hasActiveSalarySeizure,
        salaryRequestSettled,
        salaryRegistrationAckReady,
        salaryLogReady,
        salaryRequestTitle,
        salaryRowForUi,
        activeDebtorIsDeceased,
        decisions,
        resolvedExecutionId,
        inlineActionGateKey,
        setInlineActionGateKey,
        acknowledgeSeizureRequestFromLog,
        openSalarySeizureRequest,
        submitBasicSeizureRequest,
        setLastSalaryDecisionId,
        openAppeals,
    } = props;

    return (
        <SeizureRequestBlock
            disabled={seizureActionsDisabled}
            className={`w-full rounded-2xl border ${
                hasActiveSalarySeizure
                    ? 'border-slate-500/30 bg-slate-800/40 text-slate-300 cursor-pointer'
                    : 'border-emerald-300/15 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.10] hover:border-emerald-200/25'
            }`}
            onClick={() => {
                if (seizureActionsDisabled) return;
                if (salaryRequestSettled) {
                    if (salaryRegistrationAckReady) {
                        acknowledgeSeizureRequestFromLog('salary');
                    } else {
                        openUnifiedSeizureLogTab('salary');
                    }
                    return;
                }
                if (hasActiveSalarySeizure) {
                    void openSalarySeizureRequest();
                    return;
                }
                setInlineActionGateKey('seizure_salary');
            }}
            icon={
                <span
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl ${
                        hasActiveSalarySeizure ? 'bg-slate-700/40' : 'bg-white/5'
                    }`}
                >
                    {hasActiveSalarySeizure ? (
                        <Lock className="w-5 h-5 text-slate-400" />
                    ) : (
                        <Wallet className="w-6 h-6 text-white/70" />
                    )}
                </span>
            }
            label={
                <span className="flex flex-col items-end gap-0.5">
                    <span>{salaryRequestTitle}</span>
                    {hasActiveSalarySeizure || salaryRequestSettled ? (
                        <span className="text-[10px] font-semibold text-slate-400">
                            {salaryRequestSettled
                                ? 'تم التسجيل — اضغط أو «السجل» للمتابعة'
                                : 'تم الحجز — اضغط للاطلاع'}
                        </span>
                    ) : null}
                </span>
            }
            trailingSlot={
                salaryLogReady ? (
                    <SeizureLogNavigateBadge
                        tab="salary"
                        tone="emerald"
                        onAcknowledgeCycle={
                            salaryRegistrationAckReady
                                ? () => acknowledgeSeizureRequestFromLog('salary')
                                : undefined
                        }
                    />
                ) : null
            }
            afterButton={
                hasActiveSalarySeizure ? null : (
                    <InlineActionGate
                        gateKey="seizure_salary"
                        activeKey={inlineActionGateKey}
                        onConfirm={() => {
                            setInlineActionGateKey(null);
                            const did = submitBasicSeizureRequest({
                                actionType: 'salary',
                                title: salaryRequestTitle,
                                body: activeDebtorIsDeceased
                                    ? 'طلب حجز الحوافز والمخصصات (مبدئي) — يُسجَّل قرار المنفذ فقط.'
                                    : 'طلب حجز راتب (مبدئي) — يُسجَّل قرار المنفذ فقط.',
                                subtype: 'salary',
                            });
                            if (did) setLastSalaryDecisionId(did);
                        }}
                        onCancel={() => setInlineActionGateKey(null)}
                    />
                )
            }
        >
            {salaryRowForUi && !salaryRequestSettled ? (
                <div className="mt-2">
                    <ExecutionInlineAccordion
                        steps={buildSeizureRequestSteps({
                            title: salaryRequestTitle,
                            row: salaryRowForUi,
                            requestKind: 'seizure',
                            decisions,
                            resolvedExecutionId,
                            onOpenAppeals: openAppeals,
                        })}
                    />
                </div>
            ) : null}
        </SeizureRequestBlock>
    );
}
