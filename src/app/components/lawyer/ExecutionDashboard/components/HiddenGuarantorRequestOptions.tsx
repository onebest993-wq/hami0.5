import React from 'react';
import { HiddenGuarantorRequestDetailPanel } from './HiddenGuarantorRequestDetailPanel';
import {
    listHiddenGuarantorCatalog,
    resolveHiddenGuarantorRequests,
    type HiddenGuarantorRequestKey,
} from './hiddenFollowupRequestsUtils';
import type { InlineActionGateKey } from '../types';
import {
    GUARANTOR_ICONS,
    seizureKindForKey,
    type HiddenGuarantorRequestOptionsProps,
} from './HiddenGuarantorRequestOptions.support';
import { resolveAmountGuarantorRequestVisible } from '@/app/slices/financial/specialtyPublic';
import {
    findGuarantorSeizureRowFromDecisions,
    findOpenGuarantorRequestDecisionRow,
    hasActiveFinancialGuarantorFollowup,
} from './guarantorExternalUtils';
import { isSalarySeizureAsset } from '@/app/utils/execution/isSalarySeizureAsset';
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
import {
    HiddenFollowupBackButton,
    HiddenFollowupCatalogGrid,
    HiddenFollowupCatalogPickerButton,
    HiddenFollowupDecisionsFollowupButton,
    resolveHiddenFollowupLockedReason,
} from './hiddenFollowup/shared';

export type { HiddenGuarantorRequestOptionsProps } from './HiddenGuarantorRequestOptions.support';

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
        const locked = resolveHiddenFollowupLockedReason(isHistoricalMode, coerciveUiLocked);
        if (locked) return locked;
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
                    <HiddenFollowupDecisionsFollowupButton
                        label="متابعة إكمال الكفيل في القرارات"
                        onClick={() =>
                            onOpenDecisions({
                                tab: 'current',
                                decisionId,
                            })
                        }
                    />
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
                    <HiddenFollowupDecisionsFollowupButton
                        label="متابعة إكمال الحجز في القرارات"
                        onClick={() =>
                            onOpenDecisions({
                                tab: 'current',
                                decisionId,
                            })
                        }
                    />
                ) : undefined,
            },
        ];
    }, [exId, guarantorSeizureRow, onOpenDecisions, selectedCatalog]);

    if (catalog.length === 0) return null;
    if (!selectedCatalog) return null;

    const detailPanel = (
        <HiddenGuarantorRequestDetailPanel
            statusLabel={selectedResolved?.statusLabel}
            guarantorExistingWarningOpen={guarantorExistingWarningOpen}
            setGuarantorExistingWarningOpen={setGuarantorExistingWarningOpen}
            handleGuarantorRequestFromFollowup={handleGuarantorRequestFromFollowup}
            openGuarantorRow={openGuarantorRow}
            selectedKey={selectedCatalog.key}
            submitDisabledReason={submitDisabledReason}
            showToast={showToast}
            executionDetailsSaved={executionData?.guarantor_followup?.details_saved === true}
            setInlineGateKey={setInlineGateKey}
            inlineGateKey={inlineGateKey}
            runSubmit={runSubmit}
            guarantorRequestSteps={guarantorRequestSteps}
            guarantorSeizureRow={guarantorSeizureRow}
            seizureSteps={seizureSteps}
        />
    );

    if (embeddedSelectedKey) {
        return detailPanel;
    }

    return (
        <div className="space-y-3 border-t border-white/8 pt-3">
            {!selectedKey ? (
                <HiddenFollowupCatalogGrid>
                    {catalog.map((item) => {
                        const Icon = GUARANTOR_ICONS[item.key];
                        return (
                            <HiddenFollowupCatalogPickerButton
                                key={item.key}
                                label={item.shortLabel}
                                Icon={Icon}
                                onClick={() => setSelectedKey(item.key)}
                            />
                        );
                    })}
                </HiddenFollowupCatalogGrid>
            ) : (
                <>
                    <HiddenFollowupBackButton onClick={() => setSelectedKey(null)} />
                    {detailPanel}
                </>
            )}
        </div>
    );
};
