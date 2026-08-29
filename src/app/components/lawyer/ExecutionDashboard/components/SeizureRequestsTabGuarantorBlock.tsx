import React from 'react';
import { Shield } from '@/app/components/ui/icons/Shield';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import type { ExecutionFile } from '@/app/types/execution';
import {
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { GuarantorWorkspaceWrapper } from './GuarantorWorkspaceWrapper';
import { SeizureRequestBlock } from './SeizureRequestBlock';
import type { DecisionRow } from './useSeizureRequestsTabModel.types';

export function SeizureRequestsTabGuarantorBlock(props: {
    executionCoerciveButtonDisabled: boolean;
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    findLatestGuarantorDecision: DecisionRow | null;
    decisions: Record<string, unknown>[];
    executionData: ExecutionFile | null;
    resolvedExecutionId: string;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    guarantorExistingWarningOpen: boolean;
    setGuarantorExistingWarningOpen: (open: boolean) => void;
    handleGuarantorRequestFromFollowup: () => void;
    persistGuarantorFollowupDetails: (
        guarantorName: string,
        guarantorWorkplace: string,
        opts?: {
            salaryIqd: number | null;
            deductionIqd: number | null;
            guaranteeType?: 'amount' | 'attendance';
        }
    ) => void;
    openAppeals: (decisionId?: string) => void;
    openDecisions: (decisionId?: string) => void;
    openGuarantorDetails: (decisionId?: string) => void;
}) {
    const {
        executionCoerciveButtonDisabled,
        coerciveUiLocked,
        isHistoricalMode,
        findLatestGuarantorDecision,
        decisions,
        executionData,
        resolvedExecutionId,
        inlineActionGateKey,
        setInlineActionGateKey,
        guarantorExistingWarningOpen,
        setGuarantorExistingWarningOpen,
        handleGuarantorRequestFromFollowup,
        persistGuarantorFollowupDetails,
        openAppeals,
        openDecisions,
        openGuarantorDetails,
    } = props;

    return (
        <SeizureRequestBlock
            disabled={executionCoerciveButtonDisabled || coerciveUiLocked || isHistoricalMode}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-[12px] font-bold text-slate-100 transition-all hover:border-amber-400/35 disabled:opacity-40"
            onClick={() => {
                if (executionCoerciveButtonDisabled || coerciveUiLocked || isHistoricalMode)
                    return;
                const did = String(findLatestGuarantorDecision?.id || '').trim();
                const rejected =
                    Boolean(did) && isExecutorRowRejectedAndFinal(findLatestGuarantorDecision);
                const outcome = String(
                    findLatestGuarantorDecision?.executorOutcome ?? 'pending'
                ).trim();
                const alternative = outcome === 'alternative';
                const approved =
                    Boolean(did) &&
                    !rejected &&
                    (alternative ||
                        isExecutorRowApprovedWorkflowActive(
                            findLatestGuarantorDecision,
                            decisions
                        ));
                const detailsSaved = Boolean(
                    String(findLatestGuarantorDecision?.guarantorDetailsSavedAt || '').trim()
                );
                const needsCompletion = approved && !detailsSaved;
                if (needsCompletion) {
                    openGuarantorDetails(did || undefined);
                    return;
                }
                if (executionData?.guarantor_followup?.details_saved === true) {
                    setGuarantorExistingWarningOpen(true);
                    return;
                }
                setInlineActionGateKey('guarantor_request');
            }}
            icon={
                <span className="grid size-10 place-items-center rounded-full bg-amber-500/10 text-amber-200">
                    <Shield size={18} className="text-current" />
                </span>
            }
            label={<p className="text-white font-bold text-sm">طلب كفيل ضامن</p>}
            afterButton={
                <InlineActionGate
                    gateKey="guarantor_request"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => {
                        setInlineActionGateKey(null);
                        handleGuarantorRequestFromFollowup();
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
            }
        >
            {guarantorExistingWarningOpen ? (
                <div className="mt-2 rounded-2xl border border-amber-500/40 bg-amber-950/20 p-3 text-right">
                    <p className="text-amber-200 text-[11px] font-black">
                        يوجد كفيل ضامن مُسجَّل في الإضبارة
                    </p>
                    <p className="mt-1 text-amber-100/85 text-[10px] leading-relaxed">
                        هذا الطلب سيُستخدم لإدخال كفيل جديد. أكمل الطلب فقط إذا كنت تريد استبدال
                        الكفيل الحالي.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setGuarantorExistingWarningOpen(false);
                                setInlineActionGateKey('guarantor_request');
                            }}
                            className="rounded-xl border border-amber-400/55 bg-amber-950/40 py-2.5 text-[11px] font-extrabold text-amber-100 hover:bg-amber-900/50"
                        >
                            أتفهم الأمر
                        </button>
                        <button
                            type="button"
                            onClick={() => setGuarantorExistingWarningOpen(false)}
                            className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-[11px] font-bold text-slate-200 hover:bg-white/10"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            ) : null}
            {findLatestGuarantorDecision ? (
                <GuarantorWorkspaceWrapper
                    executionId={resolvedExecutionId}
                    row={findLatestGuarantorDecision}
                    guarantorFollowup={executionData?.guarantor_followup}
                    persistGuarantorFollowupDetails={persistGuarantorFollowupDetails}
                    disabled={isHistoricalMode || coerciveUiLocked}
                    onOpenAppeals={openAppeals}
                    onOpenDecisions={openDecisions}
                    onOpenGuarantorDetails={openGuarantorDetails}
                />
            ) : null}
        </SeizureRequestBlock>
    );
}
