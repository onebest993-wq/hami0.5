import React from 'react';
import { Building2, Send, Shield, Wallet, Package } from 'lucide-react';
import type { ExecutionFile } from '@/app/types/execution';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import {
    listHiddenGuarantorCatalog,
    resolveHiddenGuarantorRequests,
    type HiddenFollowupVisibilityInput,
    type HiddenGuarantorContext,
    type HiddenGuarantorRequestKey,
} from './hiddenFollowupRequestsUtils';
import { resolveAmountGuarantorRequestVisible } from '@/app/components/lawyer/FinancialOperationsCenter/settlementGuarantorGate';
import {
    findGuarantorSeizureRowFromDecisions,
    findOpenGuarantorRequestDecisionRow,
    hasActiveFinancialGuarantorFollowup,
} from './guarantorExternalUtils';
import { isSalarySeizureAsset } from '@/app/components/lawyer/ExecutionDashboard/hooks/useSeizureRegistryAssets';
import { resolveSalarySeizureSubject } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureDisplayUtils';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    DECISIONS_RELOAD_EVENT,
    readExecutorDecisionsArray,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import type { ExecutionDomainContext } from '@/app/utils/executionDomainIsolation';

const GUARANTOR_ICONS: Record<
    HiddenGuarantorRequestKey,
    React.ComponentType<{ size?: number; className?: string }>
> = {
    guarantor_request: Shield,
    guarantor_seizure_salary: Wallet,
    guarantor_seizure_property: Building2,
    guarantor_seizure_movable: Package,
};

function gateKeyForGuarantor(key: HiddenGuarantorRequestKey): InlineActionGateKey {
    if (key === 'guarantor_request') return 'hidden_guarantor_amount';
    if (key === 'guarantor_seizure_salary') return 'hidden_guarantor_salary';
    if (key === 'guarantor_seizure_property') return 'hidden_guarantor_property';
    return 'hidden_guarantor_movable';
}

function seizureKindForKey(
    key: HiddenGuarantorRequestKey
): 'salary' | 'property' | 'movable' | null {
    if (key === 'guarantor_seizure_salary') return 'salary';
    if (key === 'guarantor_seizure_property') return 'property';
    if (key === 'guarantor_seizure_movable') return 'movable';
    return null;
}

export interface HiddenGuarantorRequestOptionsProps {
    executionId: string;
    flags: HiddenFollowupVisibilityInput;
    guarantorCtx: HiddenGuarantorContext;
    domainContext?: ExecutionDomainContext | null;
    executionData: ExecutionFile | null;
    /** عند التضمين من قائمة موحّدة — يُعرض لوحة التفاصيل فقط */
    embeddedSelectedKey?: HiddenGuarantorRequestKey;
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    handleGuarantorRequestFromFollowup: () => void;
    requestGuarantorSeizure: (
        kind: 'salary' | 'movable' | 'property',
        opts?: { inline?: boolean }
    ) => void;
    onOpenDecisions: (opts?: {
        tab?: 'current' | 'previous' | 'appeals';
        decisionId?: string | null;
    }) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const HiddenGuarantorRequestOptions: React.FC<HiddenGuarantorRequestOptionsProps> = ({
    executionId,
    flags,
    guarantorCtx,
    domainContext = null,
    executionData,
    embeddedSelectedKey,
    coerciveUiLocked,
    isHistoricalMode,
    handleGuarantorRequestFromFollowup,
    requestGuarantorSeizure,
    onOpenDecisions,
    showToast,
}) => {
    const exId = String(executionId || '').trim();
    const allDecisions = React.useMemo(
        () => (exId ? (readExecutorDecisionsArray(exId) as Record<string, unknown>[]) : []),
        [exId]
    );
    const catalog = React.useMemo(
        () => listHiddenGuarantorCatalog(flags, guarantorCtx, domainContext),
        [flags, guarantorCtx, domainContext]
    );
    const resolved = React.useMemo(
        () => resolveHiddenGuarantorRequests(flags, guarantorCtx),
        [flags, guarantorCtx]
    );
    const [selectedKey, setSelectedKey] = React.useState<HiddenGuarantorRequestKey | null>(
        embeddedSelectedKey ?? null
    );
    const [inlineGateKey, setInlineGateKey] = React.useState<InlineActionGateKey | null>(null);
    const [guarantorExistingWarningOpen, setGuarantorExistingWarningOpen] = React.useState(false);
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

    React.useEffect(() => {
        if (embeddedSelectedKey) {
            setSelectedKey(embeddedSelectedKey);
        }
    }, [embeddedSelectedKey]);

    const effectiveKey = embeddedSelectedKey ?? selectedKey;
    const selectedCatalog = catalog.find((x) => x.key === effectiveKey) ?? null;
    const selectedResolved = resolved.find((x) => x.key === effectiveKey) ?? null;

    const openGuarantorRow = React.useMemo(
        () => findOpenGuarantorRequestDecisionRow(decisions, executionData),
        [decisions, executionData]
    );

    const seizureKind = effectiveKey ? seizureKindForKey(effectiveKey) : null;
    const guarantorSeizureRow = React.useMemo(() => {
        if (!seizureKind) return null;
        return findGuarantorSeizureRowFromDecisions(decisions, seizureKind);
    }, [decisions, seizureKind]);

    const amountEligible = resolveAmountGuarantorRequestVisible({
        isFinancialDebtCollectionClaim: flags.isFinancialDebtCollection,
        financialCenterTotalIqd: guarantorCtx.financialCenterTotalIqd,
        settlementBreachTriggeredAt: guarantorCtx.settlementBreachTriggeredAt,
        pendingSettlement: guarantorCtx.ledgerPendingSettlement as never,
        hideAllGuarantorPresence: false,
    });
    const guarantorActive = hasActiveFinancialGuarantorFollowup(executionData);

    const guarantorSalaryLaneOccupied = React.useMemo(
        () =>
            (executionData?.seizedAssets || []).some((a) => {
                if (!isSalarySeizureAsset(a)) return false;
                if (String(a.status || '') === 'released') return false;
                const subj = resolveSalarySeizureSubject(
                    a as Record<string, unknown>,
                    executionData,
                    exId
                );
                return subj.roleLabel.includes('كفيل');
            }),
        [executionData, exId]
    );

    const submitDisabledReason = React.useMemo(() => {
        if (!selectedCatalog) return '';
        if (isHistoricalMode || coerciveUiLocked) return 'الوضع مقفل — لا يمكن إرسال طلب جديد.';
        if (selectedCatalog.key === 'guarantor_request') {
            if (guarantorActive) return 'يوجد كفيل ضامن نشط.';
            if (!guarantorCtx.activeDebtorIsEmployee && !amountEligible && !flags.hideAllGuarantorPresence) {
                return 'يتاح بعد إخلال التسوية (عدم السداد وإلغاء التسوية).';
            }
            if (openGuarantorRow) {
                const pending =
                    String(openGuarantorRow.executorOutcome ?? 'pending') === 'pending' ||
                    String(openGuarantorRow.executorOutcome ?? '') === '';
                if (pending) return 'يوجد طلب كفيل قيد البت لدى المنفذ.';
            }
        } else if (!guarantorActive) {
            return 'يتطلب تسجيل كفيل ضامن للمبلغ أولاً.';
        } else if (selectedCatalog.key === 'guarantor_seizure_salary' && guarantorSalaryLaneOccupied) {
            return 'يوجد حجز راتب للكفيل — لا يمكن التكرار قبل فك الحجز.';
        } else if (guarantorSeizureRow) {
            const pending =
                String(guarantorSeizureRow.executorOutcome ?? 'pending') === 'pending' ||
                String(guarantorSeizureRow.executorOutcome ?? '') === '';
            if (pending) return 'يوجد طلب حجز قيد البت لدى المنفذ.';
        }
        return '';
    }, [
        amountEligible,
        coerciveUiLocked,
        flags.hideAllGuarantorPresence,
        guarantorActive,
        guarantorCtx.activeDebtorIsEmployee,
        guarantorSalaryLaneOccupied,
        guarantorSeizureRow,
        isHistoricalMode,
        openGuarantorRow,
        selectedCatalog,
    ]);

    const runSubmit = React.useCallback(() => {
        if (!selectedCatalog || submitDisabledReason) return;
        if (selectedCatalog.key === 'guarantor_request') {
            if (executionData?.guarantor_followup?.details_saved === true) {
                setGuarantorExistingWarningOpen(true);
                setInlineGateKey(null);
                return;
            }
            handleGuarantorRequestFromFollowup();
        } else if (seizureKind) {
            requestGuarantorSeizure(seizureKind, { inline: true });
        }
        setInlineGateKey(null);
    }, [
        executionData?.guarantor_followup?.details_saved,
        handleGuarantorRequestFromFollowup,
        requestGuarantorSeizure,
        seizureKind,
        selectedCatalog,
        submitDisabledReason,
    ]);

    const guarantorRequestSteps: ExecutionInlineStep[] = React.useMemo(() => {
        const row = openGuarantorRow;
        if (!row?.id || selectedCatalog?.key !== 'guarantor_request') return [];
        const decisionId = String(row.id || '').trim();
        const rejected = isExecutorRowRejectedAndFinal(row);
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' ||
            String(row.executorOutcome ?? '') === '';
        const approved = isExecutorRowApprovedWorkflowActive(row, allDecisions) && !rejected;
        return [
            {
                id: `hidden-gu-request:sent`,
                title: 'طلب الكفيل',
                subtitle: 'تم إرسال الطلب إلى مركز القرارات',
                status: 'done',
                tone: 'success',
            },
            {
                id: `hidden-gu-request:executor`,
                title: 'قرار المنفذ',
                subtitle: rejected
                    ? 'تم رفض الطلب'
                    : pending
                      ? 'قيد البت لدى المنفذ'
                      : approved
                        ? 'تمت الموافقة — أكمل من القرارات'
                        : '—',
                status: rejected || pending || approved ? 'active' : 'done',
                tone: rejected ? 'danger' : approved ? 'success' : 'neutral',
                content: pending ? (
                    <ExecutionInlineExecutorDecisionActions
                        executionId={exId}
                        decisionId={decisionId}
                        requestKind="guarantor_request"
                    />
                ) : approved ? (
                    <button
                        type="button"
                        onClick={() =>
                            onOpenDecisions({
                                tab: 'current',
                                decisionId,
                            })
                        }
                        className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-[10px] font-bold text-emerald-100 hover:bg-emerald-500/15"
                    >
                        متابعة إكمال الكفيل في القرارات
                    </button>
                ) : undefined,
            },
        ];
    }, [exId, onOpenDecisions, openGuarantorRow, selectedCatalog?.key]);

    const seizureSteps: ExecutionInlineStep[] = React.useMemo(() => {
        const row = guarantorSeizureRow;
        if (!row?.id || !selectedCatalog) return [];
        const decisionId = String(row.id || '').trim();
        const rejected = isExecutorRowRejectedAndFinal(row);
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' ||
            String(row.executorOutcome ?? '') === '';
        const approved = isExecutorRowApprovedWorkflowActive(row, allDecisions) && !rejected;
        return [
            {
                id: `hidden-gu-seizure:${selectedCatalog.key}:sent`,
                title: selectedCatalog.label,
                subtitle: 'تم إرسال الطلب',
                status: 'done',
                tone: 'success',
            },
            {
                id: `hidden-gu-seizure:${selectedCatalog.key}:executor`,
                title: 'قرار المنفذ',
                subtitle: rejected
                    ? 'تم رفض الطلب'
                    : pending
                      ? 'قيد البت لدى المنفذ'
                      : approved
                        ? 'تمت الموافقة — أكمل من القرارات'
                        : '—',
                status: rejected || pending || approved ? 'active' : 'done',
                tone: rejected ? 'danger' : approved ? 'success' : 'neutral',
                content: pending ? (
                    <ExecutionInlineExecutorDecisionActions
                        executionId={exId}
                        decisionId={decisionId}
                        requestKind="seizure"
                    />
                ) : approved ? (
                    <button
                        type="button"
                        onClick={() =>
                            onOpenDecisions({
                                tab: 'current',
                                decisionId,
                            })
                        }
                        className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-[10px] font-bold text-emerald-100 hover:bg-emerald-500/15"
                    >
                        متابعة إكمال الحجز في القرارات
                    </button>
                ) : undefined,
            },
        ];
    }, [exId, guarantorSeizureRow, onOpenDecisions, selectedCatalog]);

    if (catalog.length === 0) return null;
    if (!selectedCatalog) return null;

    const detailPanel = (
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3">
            <p className="text-[9px] text-slate-400 text-right">{selectedResolved?.statusLabel}</p>

            {guarantorExistingWarningOpen ? (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-3 text-right">
                    <p className="text-[11px] font-black text-amber-200">
                        يوجد كفيل ضامن مُسجَّل في الإضبارة
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-amber-100/85">
                        أكمل الطلب فقط إذا كنت تريد استبدال الكفيل الحالي.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setGuarantorExistingWarningOpen(false);
                                handleGuarantorRequestFromFollowup();
                            }}
                            className="rounded-xl border border-amber-400/55 bg-gradient-to-r from-amber-900/40 to-amber-800/30 py-2.5 text-[11px] font-extrabold text-amber-100"
                        >
                            أتفهم — متابعة
                        </button>
                        <button
                            type="button"
                            onClick={() => setGuarantorExistingWarningOpen(false)}
                            className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-[11px] font-bold text-slate-200"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            ) : null}

            {!openGuarantorRow || selectedCatalog.key !== 'guarantor_request' ? (
                <div className="relative">
                    <button
                        type="button"
                        disabled={Boolean(submitDisabledReason)}
                        onClick={() => {
                            if (submitDisabledReason) {
                                showToast(submitDisabledReason, 'warning');
                                return;
                            }
                            if (
                                selectedCatalog.key === 'guarantor_request' &&
                                executionData?.guarantor_followup?.details_saved === true
                            ) {
                                setGuarantorExistingWarningOpen(true);
                                return;
                            }
                            setInlineGateKey(gateKeyForGuarantor(selectedCatalog.key));
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-700/70 py-2.5 text-[11px] font-bold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Send size={13} />
                        {selectedCatalog.key === 'guarantor_request'
                            ? 'إرسال طلب الكفيل'
                            : 'إرسال طلب الحجز'}
                    </button>
                    {inlineGateKey === gateKeyForGuarantor(selectedCatalog.key) ? (
                        <InlineActionGate
                            gateKey={gateKeyForGuarantor(selectedCatalog.key)}
                            activeKey={inlineGateKey}
                            onConfirm={runSubmit}
                            onCancel={() => setInlineGateKey(null)}
                        />
                    ) : null}
                </div>
            ) : null}

            {selectedCatalog.key === 'guarantor_request' &&
            openGuarantorRow &&
            guarantorRequestSteps.length > 0 ? (
                <ExecutionInlineAccordion steps={guarantorRequestSteps} />
            ) : null}

            {selectedCatalog.key !== 'guarantor_request' &&
            guarantorSeizureRow &&
            seizureSteps.length > 0 ? (
                <ExecutionInlineAccordion steps={seizureSteps} />
            ) : null}
        </div>
    );

    if (embeddedSelectedKey) {
        return detailPanel;
    }

    return (
        <div className="space-y-3 border-t border-white/8 pt-3">
            {!selectedKey ? (
                <div className="grid grid-cols-2 gap-2">
                    {catalog.map((item) => {
                        const Icon = GUARANTOR_ICONS[item.key];
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setSelectedKey(item.key)}
                                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[10px] font-bold text-slate-300 transition-all hover:border-emerald-500/35 hover:bg-emerald-950/25 hover:text-emerald-100"
                            >
                                <Icon size={16} className="shrink-0 opacity-70" />
                                <span className="leading-tight text-right flex-1">{item.shortLabel}</span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={() => setSelectedKey(null)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[9px] font-bold text-slate-300 hover:text-emerald-100"
                    >
                        رجوع
                    </button>
                    {detailPanel}
                </>
            )}
        </div>
    );
};
