import React from 'react';
import { Shield } from 'lucide-react';
import type { ExecutionFile } from '@/app/types/execution';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import {
    DECISIONS_RELOAD_EVENT,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    shouldShowGuarantorRequestEntryCard,
    type HiddenFollowupVisibilityInput,
    type HiddenGuarantorContext,
} from './hiddenFollowupRequestsUtils';
import { findOpenGuarantorRequestDecisionRow } from './guarantorExternalUtils';
import { GuarantorWorkspaceWrapper } from './GuarantorWorkspaceWrapper';

export type GuarantorRequestEntryCardProps = {
    executionId: string | undefined;
    executionData: ExecutionFile | null;
    flags: HiddenFollowupVisibilityInput;
    guarantorCtx: HiddenGuarantorContext;
    executionCoerciveButtonDisabled: boolean;
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
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
    openGuarantorDetailsModal: (decisionId?: string) => void;
};

export const GuarantorRequestEntryCard: React.FC<GuarantorRequestEntryCardProps> = ({
    executionId,
    executionData,
    flags,
    guarantorCtx,
    executionCoerciveButtonDisabled,
    coerciveUiLocked,
    isHistoricalMode,
    inlineActionGateKey,
    setInlineActionGateKey,
    handleGuarantorRequestFromFollowup,
    persistGuarantorFollowupDetails,
    openGuarantorDetailsModal,
}) => {
    const exId = String(executionId || '').trim();
    const visible = shouldShowGuarantorRequestEntryCard(flags, guarantorCtx);

    const [decisions, setDecisions] = React.useState<Record<string, unknown>[]>(() =>
        readExecutorDecisionsArray(exId)
    );
    React.useEffect(() => {
        const sync = () => setDecisions(readExecutorDecisionsArray(exId));
        sync();
        window.addEventListener(DECISIONS_RELOAD_EVENT, sync);
        window.addEventListener('hami-execution-decision-outcome', sync as EventListener);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, sync);
            window.removeEventListener('hami-execution-decision-outcome', sync as EventListener);
            window.removeEventListener('focus', sync);
        };
    }, [exId]);

    const openGuarantorRow = React.useMemo(
        () => findOpenGuarantorRequestDecisionRow(decisions, executionData),
        [decisions, executionData]
    );

    const [guarantorExistingWarningOpen, setGuarantorExistingWarningOpen] = React.useState(false);

    const openAppeals = React.useCallback(
        (decisionId?: string) => {
            if (!exId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: {
                            executionId: exId,
                            tab: 'appeals',
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [exId]
    );

    const openDecisions = React.useCallback(
        (decisionId?: string) => {
            if (!exId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: {
                            executionId: exId,
                            tab: 'current',
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [exId]
    );

    if (!visible && !openGuarantorRow) return null;

    const handleRequestClick = () => {
        if (executionCoerciveButtonDisabled || coerciveUiLocked || isHistoricalMode) return;
        const row = openGuarantorRow;
        const did = String(row?.id || '').trim();
        const rejected = Boolean(did) && row && isExecutorRowRejectedAndFinal(row);
        const outcome = String(row?.executorOutcome ?? 'pending').trim();
        const alternative = outcome === 'alternative';
        const approved =
            Boolean(did) &&
            row &&
            !rejected &&
            (alternative || isExecutorRowEffectivelyApproved(row));
        const detailsSaved = Boolean(String(row?.guarantorDetailsSavedAt || '').trim());
        const needsCompletion = approved && !detailsSaved;
        if (needsCompletion) {
            openGuarantorDetailsModal(did || undefined);
            return;
        }
        if (executionData?.guarantor_followup?.details_saved === true) {
            setGuarantorExistingWarningOpen(true);
            return;
        }
        setInlineActionGateKey('guarantor_request');
    };

    return (
        <div className="mx-3 mt-3.5">
            <div className="relative">
                <button
                    type="button"
                    onClick={handleRequestClick}
                    disabled={executionCoerciveButtonDisabled || coerciveUiLocked || isHistoricalMode}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-[12px] font-bold text-slate-100 backdrop-blur-xl transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-0.5 hover:border-amber-400/35 hover:shadow-[0_18px_48px_rgba(0,0,0,0.45),0_0_0_1px_rgba(230,198,115,0.08)] disabled:opacity-40"
                >
                    <div className="flex flex-row-reverse items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-full bg-amber-500/10 text-amber-200">
                            <Shield size={18} className="text-current" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white">طلب الكفيل</p>
                            <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                                تقديم طلب إدخال كفيل — يُبتّ لدى المنفذ
                            </p>
                        </div>
                    </div>
                </button>
                <InlineActionGate
                    gateKey="guarantor_request"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => {
                        setInlineActionGateKey(null);
                        handleGuarantorRequestFromFollowup();
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
                {guarantorExistingWarningOpen ? (
                    <div className="mt-2 rounded-2xl border border-amber-500/40 bg-amber-950/20 p-3 text-right">
                        <p className="text-[11px] font-black text-amber-200">
                            يوجد كفيل ضامن مُسجَّل في الإضبارة
                        </p>
                        <p className="mt-1 text-[10px] leading-relaxed text-amber-100/85">
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
                                className="rounded-xl border border-amber-400/55 bg-gradient-to-r from-amber-900/40 to-amber-800/30 py-2.5 text-[11px] font-extrabold text-amber-100 hover:from-amber-800/50 hover:to-amber-700/35"
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
                {openGuarantorRow ? (
                    <GuarantorWorkspaceWrapper
                        executionId={exId}
                        row={openGuarantorRow}
                        guarantorFollowup={executionData?.guarantor_followup}
                        persistGuarantorFollowupDetails={persistGuarantorFollowupDetails}
                        disabled={isHistoricalMode || coerciveUiLocked}
                        onOpenAppeals={openAppeals}
                        onOpenDecisions={openDecisions}
                        onOpenGuarantorDetails={openGuarantorDetailsModal}
                        requestTitle="طلب الكفيل"
                    />
                ) : null}
            </div>
        </div>
    );
};
